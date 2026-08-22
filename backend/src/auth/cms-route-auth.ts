/**
 * CMS /api/cms/* route auth — IAM hub bridge + optional Cf-Access for direct operator access.
 */
import type { CmsRequestContext } from '@legendary-os/iam-cms';
import { isBridgeKeyProvisioned, trimSecret, type MachineAuthEnv } from './machine-auth-env.js';
import { verifyBridgeKey } from './bridge-key-auth.js';

export type CmsRouteAuthEnv = MachineAuthEnv & {\n  /** Temporary shell mode. Replace with the AgentSam Identity adapter once the SDK contract is stable. */\n  CMS_AUTH_MODE?: 'open-shell' | 'bridge' | 'agentsam-identity' | string;\n};

const LEGENDARY_ORG_ID = 'legendary';
const LEGENDARY_BRAND_IDS = ['contractors', 'scapes'] as const;

export type CmsActorCapabilities = CmsRequestContext['capabilities'];

export function rejectUnauthorizedCmsApi(
  request: Request,
  env: CmsRouteAuthEnv,
): Response | null {
  if (!isBridgeKeyProvisioned(env)) {
    return null;
  }
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
