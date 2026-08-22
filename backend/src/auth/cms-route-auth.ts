/**
 * CMS /api/cms/* route auth.
 *
 * Human identity is injected through CMS_AUTH_MODE. The current demo intentionally runs
 * as an open shell; AgentSam Identity will replace that adapter once its SDK contract is
 * stable. Machine-to-machine calls continue to use the bridge key.
 */
import type { CmsRequestContext } from '@legendary-os/iam-cms';
import { isBridgeKeyProvisioned, trimSecret, type MachineAuthEnv } from './machine-auth-env.js';
import { verifyBridgeKey } from './bridge-key-auth.js';

export type CmsRouteAuthEnv = MachineAuthEnv & {
  CMS_AUTH_MODE?: 'open-shell' | 'bridge' | 'agentsam-identity' | string;
};

const LEGENDARY_ORG_ID = 'legendary';
const LEGENDARY_BRAND_IDS = ['contractors', 'scapes'] as const;

export type CmsActorCapabilities = CmsRequestContext['capabilities'];

export function cmsAuthMode(env: CmsRouteAuthEnv) {
  return env.CMS_AUTH_MODE === 'open-shell' ? 'open-shell' : env.CMS_AUTH_MODE || 'bridge';
}

export function rejectUnauthorizedCmsApi(
  request: Request,
  env: CmsRouteAuthEnv,
): Response | null {
  if (cmsAuthMode(env) === 'open-shell') return null;
  if (!isBridgeKeyProvisioned(env)) return null;
  if (verifyBridgeKey(request, env)) return null;
  const cfAccess = trimSecret(request.headers.get('Cf-Access-Authenticated-User-Email'));
  if (cfAccess) return null;
  return Response.json({ ok: false, error: 'invalid_bridge_key' }, { status: 401 });
}

export function buildCmsRequestContext(
  request: Request,
  env: CmsRouteAuthEnv,
  capabilities: CmsActorCapabilities,
): CmsRequestContext {
  if (cmsAuthMode(env) === 'open-shell') {
    return {
      organizationId: LEGENDARY_ORG_ID,
      brandIds: [...LEGENDARY_BRAND_IDS],
      actorId: 'open_shell_operator',
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
  const email = request.headers.get('Cf-Access-Authenticated-User-Email') || 'local-dev';
  return {
    organizationId: LEGENDARY_ORG_ID,
    brandIds: [...LEGENDARY_BRAND_IDS],
    actorId: email,
    capabilities,
  };
}
