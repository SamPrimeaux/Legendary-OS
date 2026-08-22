import type { CmsD1Database } from '@legendary-os/iam-cms/cloudflare/d1-store';
import { CmsApplication } from './cms/application';

/**
 * Public CMS API. No editor state, D1 rows, permissions, or IAM internals leak
 * through this boundary. Storefronts consume only published page DTOs.
 */
export async function handlePublicCmsApi(
  request: Request,
  db: CmsD1Database,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== 'GET') return null;

  const match = url.pathname.match(/^\/api\/public\/sites\/([^/]+)\/page$/);
  if (!match) return null;

  const siteKey = decodeURIComponent(match[1]);
  const route = url.searchParams.get('route') || '/';
  const app = new CmsApplication(db);
  const page = await app.getPublishedPage(siteKey, route);

  if (!page) {
    return Response.json(
      { error: 'published_page_not_found', site: siteKey, route },
      { status: 404 },
    );
  }

  return Response.json(page, {
    headers: {
      'cache-control': 'public, max-age=30, stale-while-revalidate=300',
    },
  });
}
