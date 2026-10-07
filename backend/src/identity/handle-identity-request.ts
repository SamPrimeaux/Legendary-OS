import type { WorkerEnv } from '../env.js';

/**
 * Authentication is intentionally disabled in Legendary.
 *
 * The reusable AgentSam identity package is being repaired and evaluated as a
 * separate product. It must not gate this customer build in the meantime.
 */
export async function handleIdentityRequest(
  request: Request,
  _env: WorkerEnv,
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  if (
    request.method === 'GET'
    && (pathname === '/auth/login' || pathname === '/auth/signup' || pathname === '/auth/reset')
  ) {
    return Response.redirect(new URL('/dashboard/cms', request.url).toString(), 302);
  }

  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/oauth')) {
    return Response.json(
      {
        ok: false,
        error: 'auth_disabled',
        message: 'Authentication is disabled for this Legendary build.',
      },
      { status: 410, headers: { 'cache-control': 'no-store' } },
    );
  }

  return null;
}
