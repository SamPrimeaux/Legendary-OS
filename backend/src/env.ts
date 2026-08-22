/**
 * Worker bindings + platform machine-auth secrets (bridge SSOT).
 */
import type { CmsD1Database } from '@legendary-os/iam-cms/cloudflare/d1-store';
import type { MachineAuthEnv } from './auth/machine-auth-env.js';

export type WorkerEnv = MachineAuthEnv & {
  ASSETS: Fetcher;
  ASSETS_BUCKET: R2Bucket;
  CMS_CACHE: KVNamespace;
  /** OAuth state + password-reset codes (falls back to CMS_CACHE in identity handler). */
  SESSION_CACHE?: KVNamespace;
  IMAGES?: unknown;
  DB: CmsD1Database;
  /** Required — IAM platform OAuth (Wrangler secrets, minted at install/build). */
  IAM_CLIENT_ID?: string;
  IAM_CLIENT_SECRET?: string;
  IAM_OAUTH_ISSUER?: string;
  RESEND_API_KEY?: string;
};

export type { MachineAuthEnv } from './auth/machine-auth-env.js';
