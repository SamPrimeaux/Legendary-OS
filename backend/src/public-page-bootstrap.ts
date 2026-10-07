import { handlePublicCmsApi } from './public-cms-api';
import type { WorkerEnv } from './env';

export function publicSiteRoute(pathname: string): { siteKey: string; route: string } | null {
  if (/^\/(dashboard|cms|media|leads|projects|team|auth|api|assets|shared|brand|cad-lab)(\/|$)/.test(pathname)) return null;
  if (/\.[a-z0-9]+$/i.test(pathname)) return null;
  const explicit = pathname.match(/^\/site\/([^/]+)(\/.*)?$/);
  if (explicit) {
    try { return { siteKey: decodeURIComponent(explicit[1]), route: explicit[2] || '/' }; }
    catch { return null; }
  }
  if (pathname === '/scapes' || pathname.startsWith('/scapes/')) return { siteKey: 'site_scapes', route: pathname.slice(7) || '/' };
  return { siteKey: 'site_contractors', route: pathname || '/' };
}

export function serializeBootstrap(value: unknown): string {
  // JSON is inert text, and a CMS field cannot terminate the script element.
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export async function withPublicPageBootstrap(request: Request, env: WorkerEnv): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  const route = publicSiteRoute(new URL(request.url).pathname);
  if (request.method !== 'GET' || !route || !response.ok || !response.headers.get('content-type')?.includes('text/html')) return response;
  try {
    const apiUrl = new URL(`/api/public/sites/${encodeURIComponent(route.siteKey)}/page`, request.url);
    apiUrl.searchParams.set('route', route.route);
    const pageResponse = await handlePublicCmsApi(new Request(apiUrl), env);
    if (!pageResponse?.ok) return response;
    const page = await pageResponse.json();
    const bootstrap = serializeBootstrap({ ...route, page });
    const headers = new Headers(response.headers);
    // This HTML now contains published CMS data. Do not retain the static
    // asset validator or cache it across publication changes indefinitely.
    headers.delete('etag'); headers.delete('content-length');
    headers.set('cache-control', 'public, max-age=30, stale-while-revalidate=300');
    return new HTMLRewriter().on('head', {
      element(element) { element.append(`<script id="legendary-page" type="application/json">${bootstrap}</script>`, { html: true }); },
    }).transform(new Response(response.body, { status: response.status, headers }));
  } catch (error) {
    console.error('public_page_bootstrap_failed', error);
    return response;
  }
}
