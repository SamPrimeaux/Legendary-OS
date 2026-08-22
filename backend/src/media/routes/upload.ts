import { MediaApplication, mediaOrganizationId } from '../application';
import { normalizeTags } from '../contracts';

export async function handleMediaUpload(request: Request, app: MediaApplication): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== '/api/media/uploads') return null;
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  const form = await request.formData();
  const rawFile = form.get('file');
  if (!(rawFile instanceof File)) return Response.json({ error: 'file_required' }, { status: 400 });
  if (rawFile.size > 25 * 1024 * 1024) return Response.json({ error: 'file_too_large', maxBytes: 25 * 1024 * 1024 }, { status: 413 });

  const result = await app.assets.upload({
    organizationId: mediaOrganizationId(request),
    siteId: String(form.get('site_id') || '').trim() || null,
    projectId: String(form.get('project_id') || '').trim() || null,
    file: rawFile,
    sourceKind: 'upload',
    altText: String(form.get('alt_text') || '').trim() || null,
    caption: String(form.get('caption') || '').trim() || null,
    tags: normalizeTags(form.get('tags')),
  });

  const pageId = String(form.get('page_id') || '').trim();
  const sectionId = String(form.get('section_id') || '').trim();
  if (pageId || sectionId) {
    await app.usages.add(result.asset.id, mediaOrganizationId(request), {
      assetId: result.asset.id,
      siteId: String(form.get('site_id') || '').trim() || null,
      pageId: pageId || null,
      sectionId: sectionId || null,
      projectId: String(form.get('project_id') || '').trim() || null,
      role: String(form.get('role') || 'upload').trim(),
      altText: String(form.get('alt_text') || '').trim() || null,
    });
  }

  return Response.json(result, { status: result.duplicate ? 200 : 201 });
}
