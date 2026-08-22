import { normalizePublicRoute } from './application';
import type { CmsPublishedPageDto, GlobalCmsNavDto } from './contracts';

export type CmsPublishedEnv = {
  ASSETS_BUCKET: R2Bucket;
  CMS_CACHE: KVNamespace;
};

type CachePointer = {
  r2Key: string;
  publishedAt: number;
};

export type CmsPublishReceipt = CachePointer & {
  cacheKey: string;
  sectionObjects?: Record<string, string>;
};

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

export function pageCacheKey(siteId: string, route: string) {
  return `cms:page:${siteId}:${encodeURIComponent(normalizePublicRoute(route))}`;
}

export function globalNavCacheKey(siteId: string) {
  return `cms:nav:${siteId}`;
}

export class CmsPublishedStore {
  constructor(readonly env: CmsPublishedEnv) {}

  async publishPage(page: CmsPublishedPageDto): Promise<CmsPublishReceipt> {
    const publishedAt = Date.now();
    const base = `cms/published/pages/${page.site.id}/${page.page.id}/${publishedAt}`;
    const sectionObjects: Record<string, string> = {};

    for (const section of page.sections) {
      const sort = String(section.sortOrder).padStart(3, '0');
      const r2Key = `${base}/sections/${sort}-${section.id}.json`;
      await this.env.ASSETS_BUCKET.put(r2Key, JSON.stringify(section), {
        httpMetadata: { contentType: 'application/json; charset=utf-8' },
        customMetadata: {
          cms_kind: 'section',
          site_id: page.site.id,
          page_id: page.page.id,
          section_id: section.id,
        },
      });
      sectionObjects[section.id] = r2Key;
    }

    const r2Key = `${base}/page.json`;
    const snapshot = { ...page, publishedAt, sectionObjects };
    await this.env.ASSETS_BUCKET.put(r2Key, JSON.stringify(snapshot), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
      customMetadata: { cms_kind: 'page', site_id: page.site.id, page_id: page.page.id },
    });

    const cacheKey = pageCacheKey(page.site.id, page.page.route);
    await this.env.CMS_CACHE.put(cacheKey, JSON.stringify({ r2Key, publishedAt } satisfies CachePointer));
    return { r2Key, publishedAt, cacheKey, sectionObjects };
  }

  async readPage(siteId: string, route: string): Promise<CmsPublishedPageDto | null> {
    const pointer = parseJson<CachePointer>(await this.env.CMS_CACHE.get(pageCacheKey(siteId, route)));
    if (!pointer?.r2Key) return null;
    const object = await this.env.ASSETS_BUCKET.get(pointer.r2Key);
    if (!object) return null;
    return parseJson<CmsPublishedPageDto>(await object.text());
  }

  async publishGlobalNav(siteId: string, nav: GlobalCmsNavDto): Promise<CmsPublishReceipt> {
    const publishedAt = Date.now();
    const r2Key = `cms/published/global-nav/${siteId}/${publishedAt}.json`;
    await this.env.ASSETS_BUCKET.put(r2Key, JSON.stringify({ ...nav, publishedAt }), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
      customMetadata: { cms_kind: 'global-nav', site_id: siteId },
    });
    const cacheKey = globalNavCacheKey(siteId);
    await this.env.CMS_CACHE.put(cacheKey, JSON.stringify({ r2Key, publishedAt } satisfies CachePointer));
    return { r2Key, publishedAt, cacheKey };
  }

  async readGlobalNav(siteId: string): Promise<GlobalCmsNavDto | null> {
    const pointer = parseJson<CachePointer>(await this.env.CMS_CACHE.get(globalNavCacheKey(siteId)));
    if (!pointer?.r2Key) return null;
    const object = await this.env.ASSETS_BUCKET.get(pointer.r2Key);
    if (!object) return null;
    return parseJson<GlobalCmsNavDto>(await object.text());
  }
}
