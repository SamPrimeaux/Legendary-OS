import type { CmsD1Database } from '@legendary-os/iam-cms/cloudflare/d1-store';
import { normalizePublicRoute } from './application';
import type { CmsPublishedPageDto, CmsThemeDto, GlobalCmsNavDto } from './contracts';

export type CmsPublishedEnv = {
  DB: CmsD1Database;
  ASSETS_BUCKET: R2Bucket;
  CMS_CACHE: KVNamespace;
};

type CachePointer = {
  r2Key: string;
  publishedAt: number;
};

type ArtifactReceipt = {
  id: string;
  artifactType: 'page' | 'section' | 'global_nav' | 'theme';
  r2Key: string;
  contentHash: string;
  sizeBytes: number;
  pageId: string | null;
  sectionId: string | null;
};

export type CmsPublishReceipt = CachePointer & {
  cacheKey: string;
  jobId: string;
  sectionObjects?: Record<string, string>;
  artifacts: ArtifactReceipt[];
};

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

export function pageCacheKey(siteId: string, route: string) {
  return `cms:page:${siteId}:${encodeURIComponent(normalizePublicRoute(route))}`;
}

export function globalNavCacheKey(siteId: string) {
  return `cms:nav:${siteId}`;
}

export function themeCacheKey(siteId: string) {
  return `cms:theme:${siteId}`;
}

export class CmsPublishedStore {
  constructor(readonly env: CmsPublishedEnv) {}

  async publishPage(page: CmsPublishedPageDto): Promise<CmsPublishReceipt> {
    const publishedAt = Date.now();
    const base = `cms/published/pages/${page.site.id}/${page.page.id}/${publishedAt}`;
    const jobId = await this.startJob(page.site.id, page.page.id, 'page', base);
    const sectionObjects: Record<string, string> = {};
    const artifacts: ArtifactReceipt[] = [];

    try {
      for (const section of page.sections) {
        const sort = String(section.sortOrder).padStart(3, '0');
        const r2Key = `${base}/sections/${sort}-${section.id}.json`;
        const body = JSON.stringify(section);
        await this.env.ASSETS_BUCKET.put(r2Key, body, {
          httpMetadata: { contentType: 'application/json; charset=utf-8' },
          customMetadata: {
            cms_kind: 'section',
            site_id: page.site.id,
            page_id: page.page.id,
            section_id: section.id,
          },
        });
        sectionObjects[section.id] = r2Key;
        artifacts.push(await this.recordArtifact(jobId, page.site.id, page.page.id, section.id, 'section', r2Key, body));
      }

      const r2Key = `${base}/page.json`;
      const snapshot = { ...page, publishedAt, sectionObjects };
      const body = JSON.stringify(snapshot);
      await this.env.ASSETS_BUCKET.put(r2Key, body, {
        httpMetadata: { contentType: 'application/json; charset=utf-8' },
        customMetadata: { cms_kind: 'page', site_id: page.site.id, page_id: page.page.id },
      });
      artifacts.push(await this.recordArtifact(jobId, page.site.id, page.page.id, null, 'page', r2Key, body));

      const cacheKey = pageCacheKey(page.site.id, page.page.route);
      await this.env.CMS_CACHE.put(cacheKey, JSON.stringify({ r2Key, publishedAt } satisfies CachePointer));
      await this.finishJob(jobId, artifacts);
      return { r2Key, publishedAt, cacheKey, jobId, sectionObjects, artifacts };
    } catch (error) {
      await this.failJob(jobId, error);
      throw error;
    }
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
    const prefix = `cms/published/global-nav/${siteId}/${publishedAt}`;
    const jobId = await this.startJob(siteId, null, 'global_nav', prefix);
    const r2Key = `${prefix}.json`;
    const artifacts: ArtifactReceipt[] = [];
    try {
      const body = JSON.stringify({ ...nav, publishedAt });
      await this.env.ASSETS_BUCKET.put(r2Key, body, {
        httpMetadata: { contentType: 'application/json; charset=utf-8' },
        customMetadata: { cms_kind: 'global-nav', site_id: siteId },
      });
      artifacts.push(await this.recordArtifact(jobId, siteId, null, null, 'global_nav', r2Key, body));
      const cacheKey = globalNavCacheKey(siteId);
      await this.env.CMS_CACHE.put(cacheKey, JSON.stringify({ r2Key, publishedAt } satisfies CachePointer));
      await this.finishJob(jobId, artifacts);
      return { r2Key, publishedAt, cacheKey, jobId, artifacts };
    } catch (error) {
      await this.failJob(jobId, error);
      throw error;
    }
  }

  async readGlobalNav(siteId: string): Promise<GlobalCmsNavDto | null> {
    const pointer = parseJson<CachePointer>(await this.env.CMS_CACHE.get(globalNavCacheKey(siteId)));
    if (!pointer?.r2Key) return null;
    const object = await this.env.ASSETS_BUCKET.get(pointer.r2Key);
    if (!object) return null;
    return parseJson<GlobalCmsNavDto>(await object.text());
  }

  async publishTheme(siteId: string, theme: CmsThemeDto): Promise<CmsPublishReceipt> {
    const publishedAt = Date.now();
    const prefix = `cms/published/themes/${siteId}/${publishedAt}`;
    const jobId = await this.startJob(siteId, null, 'theme', prefix);
    const r2Key = `${prefix}.json`;
    const artifacts: ArtifactReceipt[] = [];
    try {
      const body = JSON.stringify({ ...theme, publishedAt });
      await this.env.ASSETS_BUCKET.put(r2Key, body, {
        httpMetadata: { contentType: 'application/json; charset=utf-8' },
        customMetadata: { cms_kind: 'theme', site_id: siteId },
      });
      artifacts.push(await this.recordArtifact(jobId, siteId, null, null, 'theme', r2Key, body));
      const cacheKey = themeCacheKey(siteId);
      await this.env.CMS_CACHE.put(cacheKey, JSON.stringify({ r2Key, publishedAt } satisfies CachePointer));
      await this.finishJob(jobId, artifacts);
      return { r2Key, publishedAt, cacheKey, jobId, artifacts };
    } catch (error) {
      await this.failJob(jobId, error);
      throw error;
    }
  }

  async readTheme(siteId: string): Promise<CmsThemeDto | null> {
    const pointer = parseJson<CachePointer>(await this.env.CMS_CACHE.get(themeCacheKey(siteId)));
    if (!pointer?.r2Key) return null;
    const object = await this.env.ASSETS_BUCKET.get(pointer.r2Key);
    if (!object) return null;
    return parseJson<CmsThemeDto>(await object.text());
  }

  private async startJob(siteId: string, pageId: string | null, jobType: 'page' | 'global_nav' | 'theme', r2Prefix: string) {
    const id = `pubjob_${crypto.randomUUID().replaceAll('-', '')}`;
    const now = Date.now();
    await this.env.DB.prepare(
      `INSERT INTO cms_publish_jobs(id,site_id,page_id,job_type,status,r2_prefix,artifacts_json,created_at,started_at)
       VALUES(?,?,?,?,? ,?,'[]',?,?)`,
    ).bind(id, siteId, pageId, jobType, 'running', r2Prefix, now, now).run();
    return id;
  }

  private async recordArtifact(
    jobId: string,
    siteId: string,
    pageId: string | null,
    sectionId: string | null,
    artifactType: ArtifactReceipt['artifactType'],
    r2Key: string,
    body: string,
  ): Promise<ArtifactReceipt> {
    const id = `pubart_${crypto.randomUUID().replaceAll('-', '')}`;
    const contentHash = await sha256(body);
    const sizeBytes = byteLength(body);
    await this.env.DB.prepare(
      `INSERT INTO cms_publish_artifacts(id,job_id,site_id,page_id,section_id,artifact_type,r2_key,r2_bucket,content_hash,size_bytes,is_current,created_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,0,?)`,
    ).bind(id, jobId, siteId, pageId, sectionId, artifactType, r2Key, 'legendary-os', contentHash, sizeBytes, Date.now()).run();
    return { id, artifactType, r2Key, contentHash, sizeBytes, pageId, sectionId };
  }

  private async finishJob(jobId: string, artifacts: ArtifactReceipt[]) {
    for (const artifact of artifacts) {
      if (artifact.sectionId) {
        await this.env.DB.prepare(
          'UPDATE cms_publish_artifacts SET is_current=0 WHERE artifact_type=? AND section_id=? AND is_current=1',
        ).bind(artifact.artifactType, artifact.sectionId).run();
      } else if (artifact.pageId) {
        await this.env.DB.prepare(
          'UPDATE cms_publish_artifacts SET is_current=0 WHERE artifact_type=? AND page_id=? AND section_id IS NULL AND is_current=1',
        ).bind(artifact.artifactType, artifact.pageId).run();
      } else {
        const row = await this.env.DB.prepare('SELECT site_id FROM cms_publish_jobs WHERE id=?').bind(jobId).first<{ site_id?: string }>();
        await this.env.DB.prepare(
          'UPDATE cms_publish_artifacts SET is_current=0 WHERE artifact_type=? AND site_id=? AND page_id IS NULL AND is_current=1',
        ).bind(artifact.artifactType, String(row?.site_id || '')).run();
      }
      await this.env.DB.prepare('UPDATE cms_publish_artifacts SET is_current=1 WHERE id=?').bind(artifact.id).run();
      if (artifact.artifactType === 'section' && artifact.sectionId) {
        await this.env.DB.prepare('UPDATE cms_sections SET r2_url=? WHERE id=?')
          .bind(`https://pub-5ff6b022740e456caeb635cb82d9e301.r2.dev/${artifact.r2Key}`, artifact.sectionId).run();
      }
    }
    await this.env.DB.prepare(
      `UPDATE cms_publish_jobs SET status='done',artifacts_json=?,completed_at=? WHERE id=?`,
    ).bind(JSON.stringify(artifacts), Date.now(), jobId).run();
  }

  private async failJob(jobId: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown publish error');
    await this.env.DB.prepare(
      `UPDATE cms_publish_jobs SET status='failed',error_message=?,completed_at=? WHERE id=?`,
    ).bind(message.slice(0, 2000), Date.now(), jobId).run().catch(() => undefined);
  }
}
