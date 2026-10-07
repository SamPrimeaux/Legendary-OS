import { legendaryIdentity } from './app-config';
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
  if (!isWorkspacePath(url.pathname)) return null;

  const identity = legendaryIdentity(env);
  const ctx = await identity.sessionFromRequest(request);
  if (ctx) return null;

  const next = encodeURIComponent(url.pathname + url.search);
  return Response.redirect(`${url.origin}${AUTH_LOGIN_PATH}?next=${next}`, 302);
}

export function isWorkspacePath(pathname: string): boolean {
  return /^\/(dashboard|cms|media|content|leads|projects|team|collaborate|mail|artifacts|account)(\/|$)/.test(pathname);
}
