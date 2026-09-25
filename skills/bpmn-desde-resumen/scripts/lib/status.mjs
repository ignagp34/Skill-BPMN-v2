// Run statuses and their process exit codes (the contract in references/contract.md).

export const STATUS = Object.freeze({
  AWAITING_GENERATION: 'awaiting_generation',
  RENDERING: 'rendering',
  SUCCESS: 'success',
  SUCCESS_WITH_WARNINGS: 'success_with_warnings',
  PARSER_ERROR: 'parser_error',
  SEMANTIC_ERROR: 'semantic_error',
  RENDER_ERROR: 'render_error',
  PARTIAL_EXPORT: 'partial_export',
  GENERATION_ERROR: 'generation_error',
  INFRASTRUCTURE_ERROR: 'infrastructure_error',
});

const EXIT_CODES = {
  [STATUS.SUCCESS]: 0,
  [STATUS.SUCCESS_WITH_WARNINGS]: 0,
  [STATUS.INFRASTRUCTURE_ERROR]: 1,
  [STATUS.PARSER_ERROR]: 2,
  [STATUS.SEMANTIC_ERROR]: 2,
  [STATUS.RENDER_ERROR]: 3,
  [STATUS.PARTIAL_EXPORT]: 4,
  [STATUS.GENERATION_ERROR]: 5,
};

export const EXIT_USAGE = 64;
export const EXIT_FAILURE = 1;

/** First attempt plus at most two repairs driven by engine diagnostics. */
export const MAX_ATTEMPTS = 3;

const REPAIRABLE = new Set([STATUS.PARSER_ERROR, STATUS.SEMANTIC_ERROR, STATUS.RENDER_ERROR]);

export const exitCodeFor = status => EXIT_CODES[status] ?? EXIT_FAILURE;
export const isRepairable = status => REPAIRABLE.has(status);
