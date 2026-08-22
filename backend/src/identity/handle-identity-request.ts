import { handleIdentityWorkerRequest } from '@inneranimalmedia/agentsam-sdk/identity/server/worker-router';
import type { WorkerEnv } from '../env.js';
import { isIdentityRoute } from './is-identity-route.js';

type IdentityEnv = WorkerEnv & {
  SESSION_CACHE: KVNamespace;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
};

function identityEnv(env: WorkerEnv): IdentityEnv {
  return {
    ...env,
    SESSION_CACHE: env.SESSION_CACHE ?? env.CMS_CACHE,
  };
}

/**
 * SDK identity + OAuth connector. Returns null when the path is not identity-owned.
 */
export async function handleIdentityRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  if (!isIdentityRoute(pathname)) return null;
  return handleIdentityWorkerRequest(request, identityEnv(env));
}
