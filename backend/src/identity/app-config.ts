import { createRouteRegistry, defineRouteProjection } from '@inneranimalmedia/agentsam-sdk/identity/contracts/routes';
import { createCloudflareD1Adapter } from '@inneranimalmedia/agentsam-sdk/identity/adapters/cloudflare-d1';
import { createIdentityService } from '@inneranimalmedia/agentsam-sdk/identity/server/identity-service';
import type { WorkerEnv } from '../env';

// This is the shared demo host's identity projection. The two future apps can
// supply separate IDs/projections without changing the identity package.
export const legendaryIdentityApp = { id: 'legendary-os' };
export const legendaryIdentityRoutes = createRouteRegistry([defineRouteProjection({
  appId: legendaryIdentityApp.id,
  routes: {
    'identity.login': '/auth/login',
    'identity.signup': '/auth/signup',
    'identity.reset': '/auth/reset',
    'identity.recovery': '/auth/login',
    'identity.oauth.callback': '/api/oauth/:provider/callback',
    'app.authenticated': '/dashboard/cms',
    'app.workspace': { path: '/dashboard', auth: 'required' },
    'app.media': { path: '/media', auth: 'required' },
    'app.leads': { path: '/leads', auth: 'required' },
    'app.projects': { path: '/projects', auth: 'required' },
    'app.team': { path: '/team', auth: 'required' },
    'app.cms': { path: '/cms', auth: 'required' },
  },
})]);

export function legendaryIdentity(env: Pick<WorkerEnv, 'DB'>) {
  return createIdentityService({
    adapter: createCloudflareD1Adapter(env.DB),
    app: legendaryIdentityApp,
    routeRegistry: legendaryIdentityRoutes,
  });
}
