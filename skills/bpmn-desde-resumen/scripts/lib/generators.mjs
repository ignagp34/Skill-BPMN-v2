// Generator selection. The models themselves live only in config/generators.json;
// nothing else in the skill names a model.
import { readFileSync } from 'node:fs';
import { skillPath } from './paths.mjs';
import { UsageError } from './cli-args.mjs';

export const GENERATORS_FILE = skillPath('config', 'generators.json');

export function loadGeneratorConfig(file = GENERATORS_FILE) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** Requested generator for a host: its profile, or the current-conversation fallback. */
export function resolveGenerator(host, config = loadGeneratorConfig()) {
  if (typeof host !== 'string' || host.length === 0) throw new UsageError('Missing --host (e.g. claude-code, chatgpt, codex).');
  const normalized = host.toLowerCase();
  for (const [profile, spec] of Object.entries(config.profiles)) {
    if (spec.hosts.includes(normalized)) {
      const { hosts, ...generator } = spec;
      return { host: normalized, profile, ...generator };
    }
  }
  return { host: normalized, profile: 'fallback', ...config.fallback };
}

export function claudeProfile(config = loadGeneratorConfig()) {
  const entry = Object.entries(config.profiles).find(([, spec]) => typeof spec.subagent === 'string'
    && spec.hosts.some(host => host.startsWith('claude')));
  if (!entry) throw new Error('config/generators.json has no Claude profile with a subagent name.');
  return entry[1];
}

/**
 * What the host agent declares it actually used, compared with what was requested.
 * The skill cannot observe the host's model; the declaration is recorded as such.
 */
export function declaredGenerator(options, requested) {
  const declared = {
    model: options.model ?? null,
    effort: options.effort ?? null,
    host: options.host ?? requested?.host ?? null,
    evidence: options.evidence ?? null,
    declaredBy: 'host-agent',
  };
  declared.matchesRequested = !!requested
    && (requested.model === 'current-conversation' || declared.model === requested.model)
    && (requested.effort === 'current-conversation' || declared.effort === requested.effort);
  return declared;
}
