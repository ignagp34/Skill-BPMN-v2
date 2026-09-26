// agreement --batch <batchDir> [--judge <verdicts.json>]
// Resolves the judge's two orders per pair into one verdict (inconsistent → tie),
// then measures agreement with the human votes: raw agreement and Cohen's kappa
// over {A, B, tie}. Also reports the judge's position bias.
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { requireOption, UsageError } from '../../../skills/bpmn/scripts/lib/cli-args.mjs';
import { REPO_ROOT } from '../lib/bench.mjs';
import { loadBatch, loadVotes } from '../lib/ab.mjs';

const LABELS = ['A', 'B', 'tie'];

/** In o1 "1" is the batch's left image; in o2 the images are swapped. */
function judgeWinner(pair, o1, o2) {
  const variantOf = (order, pick) => {
    if (!pick || pick === 'tie') return 'tie';
    const side = order === 'o1' ? (pick === '1' ? 'left' : 'right') : (pick === '1' ? 'right' : 'left');
    return pair.sides[side];
  };
  const [w1, w2] = [variantOf('o1', o1?.preferred), variantOf('o2', o2?.preferred)];
  return { w1, w2, winner: w1 === w2 ? w1 : 'tie', consistent: w1 === w2 };
}

export function cohenKappa(pairs) {
  const n = pairs.length;
  if (!n) return null;
  const observed = pairs.filter(([a, b]) => a === b).length / n;
  const expected = LABELS.reduce((s, l) => s + (pairs.filter(([a]) => a === l).length / n) * (pairs.filter(([, b]) => b === l).length / n), 0);
  return expected === 1 ? null : (observed - expected) / (1 - expected);
}

export async function run(options) {
  const batchDir = resolve(requireOption(options, 'batch'));
  const judgePath = resolve(options.judge ?? join(batchDir, 'judge', 'verdicts.json'));
  if (!existsSync(judgePath)) throw new UsageError(`No judge verdicts at ${judgePath}`);
  const [batch, votes, judge] = [await loadBatch(batchDir), await loadVotes(batchDir), JSON.parse(await readFile(judgePath, 'utf8'))];
  const rules = JSON.parse(await readFile(join(REPO_ROOT, 'tools/layout-lab/config/acceptance.json'), 'utf8')).calibration;

  const rows = batch.pairs.map(pair => {
    const j = judgeWinner(pair, judge.verdicts[`${pair.pairId}-o1`], judge.verdicts[`${pair.pairId}-o2`]);
    return { pairId: pair.pairId, caseId: pair.caseId, human: votes.votes[pair.pairId]?.winner ?? null, judge: j.winner,
      judgeConsistent: j.consistent, judgeOrders: [j.w1, j.w2] };
  });
  const both = rows.filter(r => r.human && judge.verdicts[`${r.pairId}-o1`] && judge.verdicts[`${r.pairId}-o2`]);
  const picks = Object.values(judge.verdicts).map(v => v.preferred);
  const kappa = cohenKappa(both.map(r => [r.human, r.judge]));
  const report = {
    schema: 'layout-agreement/1', judge: judge.judge ?? null, pairs: rows.length, compared: both.length,
    rawAgreement: both.length ? both.filter(r => r.human === r.judge).length / both.length : null,
    cohenKappa: kappa, minKappa: rules.minCohenKappa, judgeTrusted: kappa !== null && kappa >= rules.minCohenKappa,
    judgeConsistency: rows.filter(r => r.judgeConsistent).length / rows.length,
    positionBias: { first: picks.filter(p => p === '1').length, second: picks.filter(p => p === '2').length, tie: picks.filter(p => p === 'tie').length },
    humanTotals: Object.fromEntries(LABELS.map(l => [l, both.filter(r => r.human === l).length])),
    judgeTotals: Object.fromEntries(LABELS.map(l => [l, both.filter(r => r.judge === l).length])),
    rows,
  };
  const out = join(batchDir, 'agreement.json');
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  return { exit: 0, payload: { out, compared: report.compared, rawAgreement: report.rawAgreement, cohenKappa: kappa,
    judgeTrusted: report.judgeTrusted, judgeConsistency: report.judgeConsistency } };
}
