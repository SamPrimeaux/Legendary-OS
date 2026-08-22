#!/usr/bin/env node
/**
 * Copy app/frontend auth portal into Vite dist so ASSETS serves login + OAuth shells.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'app', 'frontend');
const dest = path.join(root, 'frontend', 'dist');

function copyRecursive(from, to) {
  if (!fs.existsSync(from)) {
    console.error(`sync-auth-portal: missing ${from}`);
    process.exit(1);
  }
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyRecursive(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

if (!fs.existsSync(dest)) {
  console.error('sync-auth-portal: run frontend build first (frontend/dist missing)');
  process.exit(1);
}

copyRecursive(src, dest);
console.log('✓ sync-auth-portal: app/frontend → frontend/dist');
