import { handleCmsDemo } from './cms-demo';

export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, service: 'legendary-os', runtime: 'cloudflare-workers' });
    }

    if (url.pathname.startsWith('/api/cms/')) {
      try {
        const response = await handleCmsDemo(request);
        if (response) return response;
      } catch (error) {
        console.error('cms_request_failed', error);
        return Response.json({ error: 'cms_request_failed', message: error instanceof Error ? error.message : 'Unknown CMS error' }, { status: 400 });
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'not_found', path: url.pathname }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
