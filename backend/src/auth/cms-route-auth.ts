/**
 * CMS /api/cms/* route access.
 *
 * Legendary currently runs with CMS_AUTH_MODE="disabled" while the reusable
 * identity package is redesigned and validated separately. Bridge/session modes
 * remain available in the module so the switch is explicit and reversible.
 */
import type { CmsRequestContext } from '../cms';
import type { CmsD1Database } from '../cms/adapters/d1-store';
import { resolveIdentitySession } from '../identity/resolve-identity-session.js';
import { trimSecret, type MachineAuthEnv } from './machine-auth-env.js';
import { verifyBridgeKey } from './bridge-key-auth.js';

export type CmsRouteAuthEnv = MachineAuthEnv & {
  DB: CmsD1Database;
  CMS_AUTH_MODE?: 'disabled' | 'agentsam-identity' | 'bridge' | string;
};

const LEGENDARY_ORG_ID = 'legendary';
const LEGENDARY_BRAND_IDS = ['contractors', 'scapes'] as const;

export type CmsActorCapabilities = CmsRequestContext['capabilities'];

export function cmsAuthMode(env: CmsRouteAuthEnv) {
  if (env.CMS_AUTH_MODE === 'disabled') return 'disabled';
  return env.CMS_AUTH_MODE === 'bridge' ? 'bridge' : 'agentsam-identity';
}

export async function rejectUnauthorizedCmsApi(
  request: Request,
  env: CmsRouteAuthEnv,
): Promise<Response | null> {
  if (cmsAuthMode(env) === 'disabled') return null;
  if (verifyBridgeKey(request, env)) return null;

  if (cmsAuthMode(env) === 'bridge') {
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
  if (cmsAuthMode(env) === 'disabled') {
    return {
      organizationId: LEGENDARY_ORG_ID,
      brandIds: [...LEGENDARY_BRAND_IDS],
      actorId: 'legendary-open-build',
      capabilities,
    };
  }

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

  return {
    organizationId: LEGENDARY_ORG_ID,
    brandIds: [...LEGENDARY_BRAND_IDS],
    actorId: 'legendary-open-build',
    capabilities,
  };
}
