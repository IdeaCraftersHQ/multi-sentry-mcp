import type { Registry } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateRegistry(registry: Registry): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(registry.portfolio)) {
    errors.push('registry.portfolio must be an array');
    return { valid: false, errors, warnings };
  }

  const slugsSeen = new Set<string>();
  const tokenVarsSeen = new Set<string>();

  for (const entry of registry.portfolio) {
    if (!entry.id || typeof entry.id !== 'string') {
      errors.push(`Entry missing valid "id" field`);
      continue;
    }

    const prefix = `[${entry.id}]`;

    if (!entry.sentry_org_slug || typeof entry.sentry_org_slug !== 'string') {
      errors.push(`${prefix} sentry_org_slug must be a non-empty string`);
    } else if (slugsSeen.has(entry.sentry_org_slug)) {
      errors.push(`${prefix} duplicate sentry_org_slug: "${entry.sentry_org_slug}"`);
    } else {
      slugsSeen.add(entry.sentry_org_slug);
    }

    if (!entry.token_env_var || typeof entry.token_env_var !== 'string') {
      errors.push(`${prefix} token_env_var must be a non-empty string`);
    } else if (!/^SENTRY_TOKEN_[A-Z_]+$/.test(entry.token_env_var)) {
      errors.push(`${prefix} token_env_var must match pattern SENTRY_TOKEN_[A-Z_]+ (got "${entry.token_env_var}")`);
    } else if (tokenVarsSeen.has(entry.token_env_var)) {
      errors.push(`${prefix} duplicate token_env_var: "${entry.token_env_var}"`);
    } else {
      tokenVarsSeen.add(entry.token_env_var);
    }

    if (!entry.display_name || typeof entry.display_name !== 'string') {
      warnings.push(`${prefix} missing display_name`);
    }

    if (entry.ai_search && !registry.shared?.anthropic_key_env_var) {
      warnings.push(`${prefix} ai_search is true but shared.anthropic_key_env_var is not set`);
    }

    if (entry.skills && !Array.isArray(entry.skills)) {
      errors.push(`${prefix} skills must be an array if provided`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
