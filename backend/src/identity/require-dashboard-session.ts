import { createCloudflareD1Adapter } from '@inneranimalmedia/agentsam-sdk/identity/adapters/cloudflare-d1';
import { createIdentityService } from '@inneranimalmedia/agentsam-sdk/identity/server/identity-service';
import type { WorkerEnv } from '../env.js';

const AUTH_LOGIN_PATH = '/auth/login';

/**
 * Redirect unauthenticated browser requests for /dashboard/* to the auth portal.
 * React SPA routes (e.g. /dashboard/cms) stay on ASSETS — only the gate lives here.
 */
export async function requireDashboardSession(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== 'GET') return null;
  if (!url.pathname.startsWith('/dashboard')) return null;

  const adapter = createCloudflareD1Adapter(env.DB);
  const identity = createIdentityService({ adapter });
  const ctx = await identity.sessionFromRequest(request);
  if (ctx) return null;

  const next = encodeURIComponent(url.pathname + url.search);
  return Response.redirect(`${url.origin}${AUTH_LOGIN_PATH}?next=${next}`, 302);
}
