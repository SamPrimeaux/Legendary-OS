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
  /** Workers AI catalog — portable Agent Sam inference harness (`@legendary-os/agentsam-wai`). */
  AGENTSAM_WAI?: Ai;
  DB: CmsD1Database;
  /** Minted IAM platform OAuth — ID plaintext var; SECRET wrangler secret put only. */
  IAM_CLIENT_ID?: string;
  IAM_CLIENT_SECRET?: string;
  IAM_OAUTH_ISSUER?: string;
  /** Developer BYOK — takes /api/oauth/google|github/start when set. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
};

export type { MachineAuthEnv } from './auth/machine-auth-env.js';
