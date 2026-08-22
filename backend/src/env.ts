/**
 * Worker bindings + platform machine-auth secrets (bridge SSOT).
 */
import type { CmsD1Database } from '@legendary-os/iam-cms/cloudflare/d1-store';
import type { MachineAuthEnv } from './auth/machine-auth-env.js';

export type WorkerEnv = MachineAuthEnv & {
  ASSETS: Fetcher;
  ASSETS_BUCKET: R2Bucket;
  CMS_CACHE: KVNamespace;
  IMAGES?: unknown;
  DB: CmsD1Database;
};

export type { MachineAuthEnv } from './auth/machine-auth-env.js';
