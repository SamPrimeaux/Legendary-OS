import { handleIdentityWorkerRequest } from '@inneranimalmedia/agentsam-sdk/identity/server/worker-router';
import type { WorkerEnv } from '../env.js';
import { isIdentityRoute } from './is-identity-route.js';

type IdentityEnv = WorkerEnv & {
  SESSION_CACHE: KVNamespace;
  IAM_CLIENT_ID?: string;
  IAM_CLIENT_SECRET?: string;
  IAM_OAUTH_ISSUER?: string;
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
