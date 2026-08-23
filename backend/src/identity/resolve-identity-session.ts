import { createCloudflareD1Adapter } from '@inneranimalmedia/agentsam-sdk/identity/adapters/cloudflare-d1';
import { createIdentityService } from '@inneranimalmedia/agentsam-sdk/identity/server/identity-service';
import type { WorkerEnv } from '../env.js';

export type IdentitySessionActor = {
  userId: string;
  email: string;
  displayName: string | null;
};

/**
 * Resolve the logged-in human from the identity session cookie — same path as
 * /api/auth/me and requireDashboardSession. Browser clients never send AGENTSAM_BRIDGE_KEY.
 */
export async function resolveIdentitySession(
  request: Request,
  env: Pick<WorkerEnv, 'DB'>,
): Promise<IdentitySessionActor | null> {
  const adapter = createCloudflareD1Adapter(env.DB);
  const identity = createIdentityService({ adapter });
  const ctx = await identity.sessionFromRequest(request);
  if (!ctx?.user?.id) return null;
  return {
    userId: ctx.user.id,
    email: ctx.user.email,
    displayName: ctx.user.display_name ?? null,
  };
}
