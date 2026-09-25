// Command-line parsing shared by every command.

export class UsageError extends Error {}

/** `cmd --key value --flag` → { command, options }. */
export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith('--')) throw new UsageError(`Unexpected argument: ${token}`);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) {
      options[token.slice(2)] = true;
    } else {
      options[token.slice(2)] = next;
      i += 1;
    }
  }
  return { command, options };
}

export function requireOption(options, key) {
  const value = options[key];
  if (typeof value !== 'string' || value.length === 0) throw new UsageError(`Missing --${key}`);
  return value;
}
