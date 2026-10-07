import { handleIdentityWorkerRequest } from '@inneranimalmedia/agentsam-sdk/identity/server/worker-router';
import type { WorkerEnv } from '../env.js';
import { isIdentityRoute } from './is-identity-route.js';
import { legendaryIdentityApp, legendaryIdentityRoutes } from './app-config';
import { identityOptions, renderIdentityPortal } from './portal-capabilities';

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
  if (pathname === '/api/auth/options' && request.method === 'GET') {
    return Response.json(await identityOptions(env), { headers: { 'cache-control': 'no-store' } });
  }
  if (pathname.startsWith('/api/auth/password-reset/') && !(await identityOptions(env)).passwordReset) {
    return Response.json({ ok: false, error: 'Password recovery email is not configured for this application.' }, { status: 503 });
  }

  // Assets html_handling serves /auth/login.html at /auth/login. Fetching the
  // .html path from the worker gets a 307 back to /auth/login → redirect loop.
  if (
    request.method === 'GET' &&
    (pathname === '/auth/login' || pathname === '/auth/signup' || pathname === '/auth/reset')
  ) {
    return renderIdentityPortal(request, env);
  }

  if (!isIdentityRoute(pathname)) return null;
  return handleIdentityWorkerRequest(request, identityEnv(env), {
    app: legendaryIdentityApp,
    routeRegistry: legendaryIdentityRoutes,
  });
}
