#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `Legendary OS operator CLI

Usage: los <command> [options]

Commands:
  deploy              Build frontend, sync auth portal, wrangler deploy
  check               Run workspace TypeScript checks
  db migrate          Apply D1 migrations (remote)
  db migrate --local  Apply D1 migrations (local)
  db status           List pending D1 migrations
  auth sync           Copy app/frontend auth HTML into frontend/dist
  help                Show this help
`;

function run(script, extraArgs = []) {
  const result = spawnSync('node', [path.join(root, 'scripts', script), ...extraArgs], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

const [command, sub, ...rest] = process.argv.slice(2);

if (!command || command === 'help' || command === '--help' || command === '-h') {
  process.stdout.write(HELP);
  process.exit(0);
}

if (command === 'deploy') run('deploy.mjs');
if (command === 'check') run('check.mjs');
if (command === 'auth' && sub === 'sync') run('sync-auth-portal.mjs');
if (command === 'db' && sub === 'migrate') run('db-migrate.mjs', rest);
if (command === 'db' && sub === 'status') {
  const remote = rest.includes('--local') ? ['--local'] : ['--remote'];
  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'migrations', 'list', 'legendary-os-cms', ...remote, '-c', 'wrangler.jsonc'],
    { cwd: root, stdio: 'inherit', env: process.env },
  );
  process.exit(result.status ?? 1);
}

process.stderr.write(`Unknown command: ${command}${sub ? ` ${sub}` : ''}\n\n`);
process.stdout.write(HELP);
process.exit(1);
