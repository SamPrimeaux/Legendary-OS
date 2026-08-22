import { MediaApplication, mediaOrganizationId } from '../application';
import type { MediaAssetPatch, MediaKind, MediaSourceKind } from '../contracts';

export async function handleMediaApi(request: Request, app: MediaApplication): Promise<Response | null> {
  const url = new URL(request.url);
  const organizationId = mediaOrganizationId(request);

  if (url.pathname === '/api/media/assets' && request.method === 'GET') {
    const assets = await app.assets.list({
      organizationId,
      siteId: url.searchParams.get('site_id') || undefined,
      projectId: url.searchParams.get('project_id') || undefined,
      kind: (url.searchParams.get('kind') || undefined) as MediaKind | undefined,
      source: (url.searchParams.get('source') || undefined) as MediaSourceKind | undefined,
      query: url.searchParams.get('q') || undefined,
      limit: Number(url.searchParams.get('limit') || 80),
    });
    return Response.json({ assets });
  }

  const assetMatch = url.pathname.match(/^\/api\/media\/assets\/([^/]+)$/);
  if (assetMatch) {
    const assetId = decodeURIComponent(assetMatch[1]);
    if (request.method === 'GET') {
      const asset = await app.assets.get(assetId, organizationId);
      if (!asset) return Response.json({ error: 'media_asset_not_found' }, { status: 404 });
      return Response.json({ asset });
    }
    if (request.method === 'PATCH') {
      const patch = await request.json<MediaAssetPatch>().catch(() => ({}));
      const asset = await app.assets.update(assetId, organizationId, patch);
      if (!asset) return Response.json({ error: 'media_asset_not_found' }, { status: 404 });
      return Response.json({ asset });
    }
    if (request.method === 'DELETE') {
      const result = await app.assets.remove(assetId, organizationId, url.searchParams.get('force') === '1');
      if (!result.removed && result.reason === 'not_found') return Response.json({ error: 'media_asset_not_found' }, { status: 404 });
      if (!result.removed && result.reason === 'in_use') return Response.json({ error: 'media_asset_in_use', usages: result.usages }, { status: 409 });
      return Response.json({ ok: true });
    }
  }

  const usageListMatch = url.pathname.match(/^\/api\/media\/assets\/([^/]+)\/usages$/);
  if (usageListMatch) {
    const assetId = decodeURIComponent(usageListMatch[1]);
    if (request.method === 'GET') return Response.json({ usages: await app.usages.list(assetId, organizationId) });
    if (request.method === 'POST') {
      const body = await request.json<Record<string, unknown>>().catch(() => ({}));
      const usage = await app.usages.add(assetId, organizationId, {
        assetId,
        siteId: body.siteId ? String(body.siteId) : body.site_id ? String(body.site_id) : null,
        pageId: body.pageId ? String(body.pageId) : body.page_id ? String(body.page_id) : null,
        sectionId: body.sectionId ? String(body.sectionId) : body.section_id ? String(body.section_id) : null,
        projectId: body.projectId ? String(body.projectId) : body.project_id ? String(body.project_id) : null,
        sourcePageUrl: body.sourcePageUrl ? String(body.sourcePageUrl) : body.source_page_url ? String(body.source_page_url) : null,
        sourceUrl: body.sourceUrl ? String(body.sourceUrl) : body.source_url ? String(body.source_url) : null,
        role: body.role ? String(body.role) : null,
        altText: body.altText ? String(body.altText) : body.alt_text ? String(body.alt_text) : null,
        caption: body.caption ? String(body.caption) : null,
        metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata as Record<string, unknown> : {},
      });
      return Response.json({ usage }, { status: 201 });
    }
  }

  const usageMatch = url.pathname.match(/^\/api\/media\/usages\/([^/]+)$/);
  if (usageMatch && request.method === 'DELETE') {
    await app.usages.remove(decodeURIComponent(usageMatch[1]), organizationId);
    return Response.json({ ok: true });
  }
  return null;
}
