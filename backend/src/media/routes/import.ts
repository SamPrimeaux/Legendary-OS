import { LEGENDARY_SITE_MAP, MediaApplication, mediaOrganizationId } from '../application';

export async function handleMediaImport(request: Request, app: MediaApplication): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== '/api/media/imports/site-manifest') return null;
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  const body = await request.json<Record<string, unknown>>().catch(() => ({}));
  const manifest = body.manifest ?? body;
  const siteMap = { ...LEGENDARY_SITE_MAP, ...(body.siteMap && typeof body.siteMap === 'object' ? body.siteMap as Record<string, string> : {}) };
  const result = await app.imports.importSiteManifest({ organizationId: mediaOrganizationId(request), manifest, siteMap });
  return Response.json({ ok: result.failed.length === 0, ...result }, { status: result.failed.length ? 207 : 200 });
}
