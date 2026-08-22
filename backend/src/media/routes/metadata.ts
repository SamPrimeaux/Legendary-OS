import { MediaApplication, mediaOrganizationId } from '../application';

export async function handleMediaMetadata(request: Request, app: MediaApplication): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === '/api/media/sources' && request.method === 'GET') {
    const organizationId = mediaOrganizationId(request);
    const assets = await app.assets.list({ organizationId, limit: 200 });
    const counts: Record<string, number> = { all: assets.length };
    for (const asset of assets) counts[asset.source.kind] = (counts[asset.source.kind] || 0) + 1;
    return Response.json({
      sources: [
        { id: 'all', label: 'All', count: counts.all || 0 },
        { id: 'upload', label: 'Uploads', count: counts.upload || 0 },
        { id: 'website_import', label: 'Website import', count: counts.website_import || 0 },
        { id: 'r2', label: 'R2', count: counts.r2 || 0 },
        { id: 'cloudflare_images', label: 'Cloudflare Images', count: counts.cloudflare_images || 0 },
      ],
    });
  }
  return null;
}
