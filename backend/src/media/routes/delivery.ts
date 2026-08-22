import { MediaApplication, mediaOrganizationId } from '../application';

const CONTENT_ADDRESSED_KEY = /(?:^|\/)images\/[a-f0-9]{20,64}\.[a-z0-9]+$/i;

export async function handleMediaDelivery(request: Request, app: MediaApplication): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/assets/')) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
    const encoded = url.pathname.slice('/assets/'.length);
    const key = encoded.split('/').map((part) => decodeURIComponent(part)).join('/');
    if (!key || key.includes('..')) return Response.json({ error: 'invalid_asset_key' }, { status: 400 });
    const cacheControl = CONTENT_ADDRESSED_KEY.test(key) || key.startsWith('media/originals/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=300, stale-while-revalidate=3600';
    if (request.method === 'HEAD') {
      const head = await app.objects.head(key);
      if (!head) return Response.json({ error: 'asset_not_found' }, { status: 404 });
      const headers = new Headers();
      head.writeHttpMetadata(headers);
      headers.set('etag', head.httpEtag);
      headers.set('cache-control', cacheControl);
      return new Response(null, { headers });
    }
    const object = await app.delivery.rawObject(key);
    if (!object) return Response.json({ error: 'asset_not_found' }, { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', cacheControl);
    return new Response(object.body, { headers });
  }

  const variant = url.pathname.match(/^\/api\/media\/assets\/([^/]+)\/variant$/);
  if (variant && request.method === 'GET') {
    const response = await app.delivery.variant(decodeURIComponent(variant[1]), mediaOrganizationId(request), {
      width: Number(url.searchParams.get('width') || 0) || undefined,
      height: Number(url.searchParams.get('height') || 0) || undefined,
      fit: (url.searchParams.get('fit') || 'scale-down') as any,
      format: (url.searchParams.get('format') || 'webp') as any,
      quality: Number(url.searchParams.get('quality') || 82),
    });
    return response || Response.json({ error: 'asset_not_found' }, { status: 404 });
  }
  return null;
}
