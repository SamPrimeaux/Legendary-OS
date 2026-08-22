import { handleCmsApi } from './cms-api';
import { handlePublicCmsApi } from './public-cms-api';
import { handleMediaRequest } from './media';
import type { CmsD1Database } from '@legendary-os/iam-cms/cloudflare/d1-store';

export interface Env {
  ASSETS: Fetcher;
  ASSETS_BUCKET: R2Bucket;
  CMS_CACHE: KVNamespace;
  IMAGES?: unknown;
  CMS_DB: CmsD1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, service: 'legendary-os', runtime: 'cloudflare-workers' });
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

    return env.ASSETS.fetch(request);
  },
};
