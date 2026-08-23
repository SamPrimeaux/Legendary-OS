import { handleIdentityWorkerRequest } from '@inneranimalmedia/agentsam-sdk/identity/server/worker-router';
import type { WorkerEnv } from '../env.js';
import { isIdentityRoute } from './is-identity-route.js';

type IdentityEnv = WorkerEnv & {
  SESSION_CACHE: KVNamespace;
  IAM_CLIENT_ID?: string;
  IAM_CLIENT_SECRET?: string;
  IAM_OAUTH_ISSUER?: string;
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
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Assets html_handling serves /auth/login.html at /auth/login. Fetching the
  // .html path from the worker gets a 307 back to /auth/login → redirect loop.
  if (
    request.method === 'GET' &&
    (pathname === '/auth/login' || pathname === '/auth/signup' || pathname === '/auth/reset') &&
    env.ASSETS?.fetch
  ) {
    return env.ASSETS.fetch(request);
  }

  if (!isIdentityRoute(pathname)) return null;
  return handleIdentityWorkerRequest(request, identityEnv(env));
}
