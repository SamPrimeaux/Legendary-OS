import { handleCmsApi } from './cms-api';
import { handlePublicCmsApi } from './public-cms-api';
import { handleMediaRequest } from './media';
import { handleIdentityRequest } from './identity/handle-identity-request.js';
import { requireDashboardSession } from './identity/require-dashboard-session.js';
import type { WorkerEnv } from './env';

export type Env = WorkerEnv;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, service: 'legendary-os', runtime: 'cloudflare-workers' });
    }

    try {
      const identityResponse = await handleIdentityRequest(request, env);
      if (identityResponse) return identityResponse;
    } catch (error) {
      console.error('identity_request_failed', error);
      return Response.json(
        { error: 'identity_request_failed', message: error instanceof Error ? error.message : 'Unknown identity error' },
        { status: 500 },
      );
    }

    if (url.pathname.startsWith('/api/media/') || url.pathname.startsWith('/assets/')) {
      try {
        const response = await handleMediaRequest(request, env);
        if (response) return response;
      } catch (error) {
        console.error('media_request_failed', error);
        return Response.json({ error: 'media_request_failed', message: error instanceof Error ? error.message : 'Unknown media error' }, { status: 400 });
      }
    }

    if (url.pathname.startsWith('/api/public/')) {
      try {
        const response = await handlePublicCmsApi(request, env);
        if (response) return response;
      } catch (error) {
        console.error('public_cms_request_failed', error);
        return Response.json({ error: 'public_cms_request_failed' }, { status: 500 });
      }
    }

    if (url.pathname.startsWith('/api/cms/')) {
      try {
        const response = await handleCmsApi(request, env);
        if (response) return response;
      } catch (error) {
        console.error('cms_request_failed', error);
        return Response.json({ error: 'cms_request_failed', message: error instanceof Error ? error.message : 'Unknown CMS error' }, { status: 400 });
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'not_found', path: url.pathname }, { status: 404 });
    }

    const dashboardGate = await requireDashboardSession(request, env);
    if (dashboardGate) return dashboardGate;

    return env.ASSETS.fetch(request);
  },
};
