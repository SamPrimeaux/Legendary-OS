import type { CmsD1Database } from '@legendary-os/iam-cms/cloudflare/d1-store';
import { CmsApplication } from './cms/application';
import { CmsPublishedStore } from './cms/published-store';

export type PublicCmsEnv = {
  CMS_DB: CmsD1Database;
  ASSETS_BUCKET: R2Bucket;
  CMS_CACHE: KVNamespace;
};

export async function handlePublicCmsApi(request: Request, env: PublicCmsEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== 'GET') return null;
  const match = url.pathname.match(/^\/api\/public\/sites\/([^/]+)\/page$/);
  if (!match) return null;

  const siteKey = decodeURIComponent(match[1]);
  const route = url.searchParams.get('route') || '/';
  const app = new CmsApplication(env.CMS_DB);
  const site = await app.resolveSiteByKey(siteKey);
  if (!site) return Response.json({ error: 'site_not_found', site: siteKey }, { status: 404 });

  const published = new CmsPublishedStore(env);
  const page = await published.readPage(site.id, route) ?? await app.getPublishedPage(site.id, route);
  if (!page) return Response.json({ error: 'published_page_not_found', site: siteKey, route }, { status: 404 });

  const globalCmsNav = await published.readGlobalNav(site.id) ?? await app.getGlobalCmsNav(site.id);
  return Response.json(
    { ...page, globalCmsNav },
    { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=300' } },
  );
}
