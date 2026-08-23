#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { repoRoot, D1_DATABASE, WRANGLER_CONFIG } from './lib/repo-root.mjs';

const root = repoRoot(import.meta.url);
const remote = process.argv.includes('--local') ? [] : ['--remote'];
const args = ['wrangler', 'd1', 'migrations', 'apply', D1_DATABASE, ...remote, '-c', WRANGLER_CONFIG];

const result = spawnSync('npx', args, { cwd: root, stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
