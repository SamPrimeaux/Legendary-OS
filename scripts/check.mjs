#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { repoRoot } from './lib/repo-root.mjs';

const root = repoRoot(import.meta.url);
const result = spawnSync('pnpm', ['-r', 'check'], { cwd: root, stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
