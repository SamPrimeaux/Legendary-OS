import type { CmsPageTree, CmsSite, CmsTheme } from './domain';
import { D1CmsStore, type CmsD1Database } from './adapters/d1-store';
import type {
  CmsEditorPageDto,
  CmsPageSummaryDto,
  CmsPublishedPageDto,
  CmsSectionDto,
  CmsSiteSummaryDto,
  CmsThemeDto,
  GlobalCmsNavDto,
} from './contracts';

function siteDto(site: CmsSite): CmsSiteSummaryDto {
  return {
    id: site.id,
    organizationId: site.organizationId,
    brandId: site.brandId,
    name: site.name,
    domain: site.domain,
    themeId: site.themeId,
  };
}

function pageDto(tree: CmsPageTree): CmsPageSummaryDto {
  return {
    id: tree.id,
    siteId: tree.siteId,
    title: tree.title,
    route: tree.route,
    pageType: tree.pageType,
    status: tree.status,
    seo: {
      title: tree.seoTitle || null,
      description: tree.seoDescription || null,
    },
  };
}

function sectionsDto(tree: CmsPageTree): CmsSectionDto[] {
  return tree.sections
    .filter((section) => section.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) => ({
      id: section.id,
      type: section.type,
      name: section.name,
      zone: section.zone,
      visible: section.visible,
      sortOrder: section.sortOrder,
      data: section.data,
      blocks: section.blocks
        .filter((block) => block.visible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((block) => ({
          id: block.id,
          type: block.type,
          visible: block.visible,
          sortOrder: block.sortOrder,
          data: block.data,
        })),
    }));
}

function themeDto(theme: CmsTheme | null): CmsThemeDto | null {
  return theme
    ? { id: theme.id, name: theme.name, tokens: theme.tokens }
    : null;
}

export class CmsApplication {
  readonly store: D1CmsStore;

  constructor(readonly db: CmsD1Database) {
    this.store = new D1CmsStore(db);
  }

  async resolveSiteByKey(siteKey: string): Promise<CmsSite | null> {
    const key = siteKey.trim().toLowerCase();
    const row = await this.db
      .prepare(
        `SELECT id FROM cms_sites
         WHERE lower(id)=? OR lower(brand_id)=? OR lower(name)=? OR lower(domain)=?
         LIMIT 1`,
      )
      .bind(key, key, key, key)
      .first<{ id?: string }>();
    return row?.id ? this.store.getSite(String(row.id)) : null;
  }

  async resolvePageId(siteId: string, route: string): Promise<string | null> {
    const normalized = normalizePublicRoute(route);
    const row = await this.db
      .prepare(
        `SELECT id FROM cms_pages
         WHERE site_id=? AND route=? AND status != 'archived'
         LIMIT 1`,
      )
      .bind(siteId, normalized)
      .first<{ id?: string }>();
    return row?.id ? String(row.id) : null;
  }

  async getPublishedPage(siteKey: string, route: string): Promise<CmsPublishedPageDto | null> {
    const site = await this.resolveSiteByKey(siteKey);
    if (!site) return null;
    const pageId = await this.resolvePageId(site.id, route);
    if (!pageId) return null;
    const tree = await this.store.getPublishedPage(pageId);
    if (!tree) return null;
    const theme = await this.store.getTheme(site.id);
    return {
      site: siteDto(site),
      page: pageDto(tree),
      sections: sectionsDto(tree),
      theme: themeDto(theme),
    };
  }

  async getGlobalCmsNav(siteId: string): Promise<GlobalCmsNavDto | null> {
    const row = await this.db
      .prepare('SELECT id,site_id,data_json,updated_at FROM cms_global_nav WHERE site_id=? LIMIT 1')
      .bind(siteId)
      .first<Record<string, unknown>>();
    if (!row) return null;
    const data = JSON.parse(String(row.data_json || '{}')) as Omit<GlobalCmsNavDto, 'id' | 'siteId' | 'updatedAt'>;
    return {
      id: String(row.id),
      siteId: String(row.site_id),
      ...data,
      updatedAt: Number(row.updated_at || 0),
    };
  }

  async saveGlobalCmsNav(siteId: string, data: Omit<GlobalCmsNavDto, 'id' | 'siteId' | 'updatedAt'>): Promise<GlobalCmsNavDto> {
    const id = `global_nav_${siteId}`;
    const updatedAt = Date.now();
    await this.db
      .prepare(`INSERT INTO cms_global_nav(id,site_id,data_json,updated_at) VALUES(?,?,?,?)
                ON CONFLICT(site_id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`)
      .bind(id, siteId, JSON.stringify(data), updatedAt)
      .run();
    return { id, siteId, ...data, updatedAt };
  }

  async getEditorPage(pageId: string, capabilities: string[]): Promise<CmsEditorPageDto | null> {
    const tree = await this.store.getPageTree(pageId);
    if (!tree) return null;
    const site = await this.store.getSite(tree.siteId);
    if (!site) return null;
    const theme = await this.store.getTheme(site.id);
    return {
      site: siteDto(site),
      page: pageDto(tree),
      sections: sectionsDto(tree),
      theme: themeDto(theme),
      capabilities: [...capabilities],
    };
  }
}

export function normalizePublicRoute(route: string) {
  const clean = String(route || '/').split('?')[0].split('#')[0].trim();
  const normalized = `/${clean.replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : normalized.toLowerCase();
}
