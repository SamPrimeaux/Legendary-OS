import type {
  MediaAsset,
  MediaAssetFilters,
  MediaAssetPatch,
  MediaAssetUsage,
  MediaSourceOption,
} from '../types';

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.message === 'string' ? body.message : typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

function params(filters: MediaAssetFilters) {
  const search = new URLSearchParams();
  if (filters.siteId) search.set('site_id', filters.siteId);
  if (filters.projectId) search.set('project_id', filters.projectId);
  if (filters.kind) search.set('kind', filters.kind);
  if (filters.source) search.set('source', filters.source);
  if (filters.query?.trim()) search.set('q', filters.query.trim());
  if (filters.limit) search.set('limit', String(filters.limit));
  return search.toString();
}

export const mediaClient = {
  async listAssets(filters: MediaAssetFilters = {}) {
    const query = params(filters);
    return json<{ assets: MediaAsset[] }>(await fetch(`/api/media/assets${query ? `?${query}` : ''}`));
  },

  async getAsset(id: string) {
    return json<{ asset: MediaAsset }>(await fetch(`/api/media/assets/${encodeURIComponent(id)}`));
  },

  async updateAsset(id: string, patch: MediaAssetPatch) {
    return json<{ asset: MediaAsset }>(await fetch(`/api/media/assets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    }));
  },

  async removeAsset(id: string, force = false) {
    return json<{ ok: true }>(await fetch(`/api/media/assets/${encodeURIComponent(id)}${force ? '?force=1' : ''}`, { method: 'DELETE' }));
  },

  async sources() {
    return json<{ sources: MediaSourceOption[] }>(await fetch('/api/media/sources'));
  },

  async upload(input: {
    file: File;
    siteId?: string;
    projectId?: string;
    pageId?: string;
    sectionId?: string;
    role?: string;
    altText?: string;
    caption?: string;
    tags?: string[];
  }) {
    const form = new FormData();
    form.set('file', input.file);
    if (input.siteId) form.set('site_id', input.siteId);
    if (input.projectId) form.set('project_id', input.projectId);
    if (input.pageId) form.set('page_id', input.pageId);
    if (input.sectionId) form.set('section_id', input.sectionId);
    if (input.role) form.set('role', input.role);
    if (input.altText) form.set('alt_text', input.altText);
    if (input.caption) form.set('caption', input.caption);
    if (input.tags?.length) form.set('tags', input.tags.join(','));
    return json<{ asset: MediaAsset; duplicate: boolean }>(await fetch('/api/media/uploads', { method: 'POST', body: form }));
  },

  async importManifest(manifest: unknown, siteMap?: Record<string, string>) {
    return json<{ ok: boolean; created: number; reused: number; usages: number; failed: Array<{ key?: string; error: string }>; total: number }>(
      await fetch('/api/media/imports/site-manifest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ manifest, siteMap }),
      }),
    );
  },

  async listUsages(assetId: string) {
    return json<{ usages: MediaAssetUsage[] }>(await fetch(`/api/media/assets/${encodeURIComponent(assetId)}/usages`));
  },

  async addUsage(assetId: string, usage: Partial<MediaAssetUsage>) {
    return json<{ usage: MediaAssetUsage }>(await fetch(`/api/media/assets/${encodeURIComponent(assetId)}/usages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(usage),
    }));
  },

  async removeUsage(id: string) {
    return json<{ ok: true }>(await fetch(`/api/media/usages/${encodeURIComponent(id)}`, { method: 'DELETE' }));
  },
};
