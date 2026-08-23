import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function repoRoot(fromMetaUrl) {
  return path.resolve(path.dirname(fileURLToPath(fromMetaUrl)), '..');
}

export const WRANGLER_CONFIG = 'wrangler.jsonc';
export const D1_DATABASE = 'legendary-os-cms';
