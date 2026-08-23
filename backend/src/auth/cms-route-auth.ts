/**
 * CMS /api/cms/* route auth.
 *
 * Human operators: identity session cookie (set at login — same as /api/auth/me).
 * Machine callers (Agent Sam / IAM hub): AGENTSAM_BRIDGE_KEY + optional X-User-Id.
 *
 * Do not expose the bridge key to the browser; the CMS UI uses credentials: 'include'.
 */
import type { CmsRequestContext } from '../cms';
import type { CmsD1Database } from '../cms/adapters/d1-store';
import { resolveIdentitySession } from '../identity/resolve-identity-session.js';
import { isBridgeKeyProvisioned, trimSecret, type MachineAuthEnv } from './machine-auth-env.js';
import { verifyBridgeKey } from './bridge-key-auth.js';

export type CmsRouteAuthEnv = MachineAuthEnv & {
  DB: CmsD1Database;
  /** Default agentsam-identity (session cookie). Use bridge for headless-only deployments. */
  CMS_AUTH_MODE?: 'agentsam-identity' | 'bridge' | string;
};

const LEGENDARY_ORG_ID = 'legendary';
const LEGENDARY_BRAND_IDS = ['contractors', 'scapes'] as const;

export type CmsActorCapabilities = CmsRequestContext['capabilities'];

export function cmsAuthMode(env: CmsRouteAuthEnv) {
  return env.CMS_AUTH_MODE === 'bridge' ? 'bridge' : 'agentsam-identity';
}

export async function rejectUnauthorizedCmsApi(
  request: Request,
  env: CmsRouteAuthEnv,
): Promise<Response | null> {
  if (verifyBridgeKey(request, env)) return null;

  if (cmsAuthMode(env) === 'bridge') {
    const cfAccess = trimSecret(request.headers.get('Cf-Access-Authenticated-User-Email'));
    if (cfAccess) return null;
    if (!isBridgeKeyProvisioned(env)) return null;
    return Response.json({ ok: false, error: 'invalid_bridge_key' }, { status: 401 });
  }

  const session = await resolveIdentitySession(request, env);
  if (session) return null;
  return Response.json({ ok: false, error: 'session_required' }, { status: 401 });
}

export async function buildCmsRequestContext(
  request: Request,
  env: CmsRouteAuthEnv,
  capabilities: CmsActorCapabilities,
): Promise<CmsRequestContext> {
  if (verifyBridgeKey(request, env)) {
    const actorId =
      trimSecret(request.headers.get('X-User-Id')) ||
      trimSecret(request.headers.get('x-user-id')) ||
      trimSecret(request.headers.get('X-User-Email')) ||
      'iam_bridge';
    return {
      organizationId: LEGENDARY_ORG_ID,
      brandIds: [...LEGENDARY_BRAND_IDS],
      actorId,
      capabilities,
    };
  }

  const session = await resolveIdentitySession(request, env);
  if (session) {
    return {
      organizationId: LEGENDARY_ORG_ID,
      brandIds: [...LEGENDARY_BRAND_IDS],
      actorId: session.userId,
      capabilities,
    };
  }

  const email = request.headers.get('Cf-Access-Authenticated-User-Email') || 'local-dev';
  return {
    organizationId: LEGENDARY_ORG_ID,
    brandIds: [...LEGENDARY_BRAND_IDS],
    actorId: email,
    capabilities,
  };
}
