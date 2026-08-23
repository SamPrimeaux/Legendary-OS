#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { repoRoot } from './lib/repo-root.mjs';

const root = repoRoot(import.meta.url);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

run('pnpm', ['--dir', 'frontend', 'build']);
run('node', ['scripts/sync-auth-portal.mjs']);
run('pnpm', ['--dir', 'backend', 'deploy']);
