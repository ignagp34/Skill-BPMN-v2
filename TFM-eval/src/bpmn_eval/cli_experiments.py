"""CLI entrypoint for evaluating tracked tfm-lab experiments.

Scores every processed experiment under an experiments folder
(``EXP-*/diagram.bpmn`` or the XML embedded in ``result.json``) with the 10
metrics, then writes a per-experiment CSV/JSON plus axis aggregates.

    bpmn-eval-experiments --experiments apps/tfm-lab/prompts/experiments \
        --schema-dir TFM-eval/schemas -o TFM-eval/results/experiments --format both

This is additive — the original ``bpmn-eval`` (zero-shot vs DSL benchmark) is
unchanged.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from bpmn_eval.experiments import evaluate_experiments
from bpmn_eval.reporting.comparative import write_comparative_report
from bpmn_eval.reporting.experiments_csv import write_experiments_csv
from bpmn_eval.reporting.experiments_json import write_experiments_json
from bpmn_eval.reporting.experiments_summary import print_experiment_summary
from bpmn_eval.usage import UsageComputationError, compute_all_usage


def _usage_main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(
        prog="bpmn-eval-experiments usage",
        description=(
            "Estimate EXP token usage offline with the fixed o200k_base "
            "encoding and update run-info.json."
        ),
    )
    parser.add_argument(
        "--experiments",
        type=Path,
        required=True,
        help="Folder containing EXP-* experiment directories",
    )
    parser.add_argument(
        "--system-prompts",
        type=Path,
        required=True,
        help="Folder containing the explicitly mapped system-prompt files",
    )
    args = parser.parse_args(argv)
    try:
        updated = compute_all_usage(args.experiments, args.system_prompts)
    except (FileNotFoundError, UsageComputationError) as exc:
        logging.error("%s", exc)
        sys.exit(1)
    for case_dir, estimate in updated:
        logging.info(
            "%s: input=%d (system=%d, process=%d), output=%d, total=%d",
            case_dir.name,
            estimate.input_tokens,
            estimate.input_system_tokens,
            estimate.input_process_tokens,
            estimate.output_tokens,
            estimate.total_tokens,
        )
    logging.info("Updated token estimates for %d experiments", len(updated))


def main(argv: list[str] | None = None) -> None:
    effective_argv = list(sys.argv[1:] if argv is None else argv)
    if effective_argv[:1] == ["usage"]:
        logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
        _usage_main(effective_argv[1:])
        return

    parser = argparse.ArgumentParser(
        prog="bpmn-eval-experiments",
        description=(
            "Evaluate tracked tfm-lab experiments (per-experiment DSL scoring, "
            "aggregated by process / model / provider / system-prompt / run)."
        ),
    )
    parser.add_argument(
        "--experiments",
        type=Path,
        required=True,
        help="Folder containing EXP-* experiment directories",
    )
    parser.add_argument(
        "-o", "--output",
        type=Path,
        default=Path("results/experiments"),
        help="Output directory for reports (default: results/experiments/)",
    )
    parser.add_argument(
        "--format",
        choices=["json", "csv", "both"],
        default="both",
        help="Output format (default: both)",
    )
    parser.add_argument(
        "--schema-dir",
        type=Path,
        default=Path("schemas"),
        help="Directory containing BPMN20.xsd (default: schemas/)",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose logging",
    )

    args = parser.parse_args(effective_argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    schema_path = str(args.schema_dir / "BPMN20.xsd")

    try:
        evaluations = evaluate_experiments(args.experiments, schema_path=schema_path)
    except FileNotFoundError as exc:
        logging.error("%s", exc)
        sys.exit(1)

    if not evaluations:
        logging.warning(
            "No processed experiments found in %s "
            "(run the render step first to generate diagram.bpmn / result.json).",
            args.experiments,
        )
        sys.exit(0)

    print_experiment_summary(evaluations)

    output_dir = args.output
    if args.format in ("json", "both"):
        json_path = output_dir / "results.json"
        write_experiments_json(evaluations, json_path)
        logging.info("JSON report written to %s", json_path)

    if args.format in ("csv", "both"):
        csv_path = output_dir / "results.csv"
        write_experiments_csv(evaluations, csv_path)
        logging.info("CSV report written to %s", csv_path)

    write_comparative_report(evaluations, output_dir)
    logging.info("Comparative report written to %s", output_dir)


if __name__ == "__main__":
    main()
