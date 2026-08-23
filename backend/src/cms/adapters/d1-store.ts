import type { CmsAsset, CmsBlock, CmsPage, CmsPageTree, CmsRevision, CmsSection, CmsSite, CmsTheme } from '../domain/domain';
import type { CmsStore } from '../domain/store';

type D1Result<T = unknown> = { results?: T[] };
type D1Statement = { bind(...values: unknown[]): D1Statement; first<T = unknown>(): Promise<T | null>; all<T = unknown>(): Promise<D1Result<T>>; run(): Promise<unknown> };
export type CmsD1Database = { prepare(query: string): D1Statement; batch(statements: D1Statement[]): Promise<unknown> };

export class D1CmsStore implements CmsStore {
  constructor(readonly db: CmsD1Database) {}

  async getSite(id: string) { const r = await this.db.prepare('SELECT * FROM cms_sites WHERE id=?').bind(id).first<Row>(); return r ? mapSite(r) : null; }
  async listPages(siteId: string) { return rows(await this.db.prepare('SELECT * FROM cms_pages WHERE site_id=? ORDER BY updated_at DESC').bind(siteId).all<Row>()).map(mapPage); }
  async getPage(id: string) { const r = await this.db.prepare('SELECT * FROM cms_pages WHERE id=?').bind(id).first<Row>(); return r ? mapPage(r) : null; }
  async getPageTree(pageId: string) {
    const page = await this.getPage(pageId); if (!page) return null;
    const sections = await this.listSections(pageId);
    const withBlocks = await Promise.all(sections.map(async (section) => ({ ...section, blocks: await this.listBlocks(section.id) })));
    return { ...page, sections: withBlocks };
  }
  async createPage(x: CmsPage) { await this.db.prepare('INSERT INTO cms_pages(id,site_id,title,route,page_type,status,parent_id,seo_title,seo_description,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(x.id,x.siteId,x.title,x.route,x.pageType,x.status,x.parentId,x.seoTitle,x.seoDescription,x.createdAt,x.updatedAt).run(); return x; }
  async updatePage(x: CmsPage) { await this.db.prepare('UPDATE cms_pages SET title=?,route=?,page_type=?,status=?,parent_id=?,seo_title=?,seo_description=?,updated_at=? WHERE id=?').bind(x.title,x.route,x.pageType,x.status,x.parentId,x.seoTitle,x.seoDescription,x.updatedAt,x.id).run(); return x; }
  async listSections(pageId: string) { return rows(await this.db.prepare('SELECT * FROM cms_sections WHERE page_id=? ORDER BY sort_order').bind(pageId).all<Row>()).map(mapSection); }
  async createSection(x: CmsSection) { await this.db.prepare('INSERT INTO cms_sections(id,page_id,type,name,zone,visible,sort_order,data_json) VALUES(?,?,?,?,?,?,?,?)').bind(x.id,x.pageId,x.type,x.name,x.zone,x.visible?1:0,x.sortOrder,JSON.stringify(x.data)).run(); return x; }
  async updateSection(x: CmsSection) { await this.db.prepare('UPDATE cms_sections SET type=?,name=?,zone=?,visible=?,sort_order=?,data_json=? WHERE id=?').bind(x.type,x.name,x.zone,x.visible?1:0,x.sortOrder,JSON.stringify(x.data),x.id).run(); return x; }
  async deleteSection(id: string) { await this.db.prepare('DELETE FROM cms_sections WHERE id=?').bind(id).run(); }
  async listBlocks(sectionId: string) { return rows(await this.db.prepare('SELECT * FROM cms_blocks WHERE section_id=? ORDER BY sort_order').bind(sectionId).all<Row>()).map(mapBlock); }
  async createBlock(x: CmsBlock) { await this.db.prepare('INSERT INTO cms_blocks(id,section_id,type,visible,sort_order,data_json) VALUES(?,?,?,?,?,?)').bind(x.id,x.sectionId,x.type,x.visible?1:0,x.sortOrder,JSON.stringify(x.data)).run(); return x; }
  async updateBlock(x: CmsBlock) { await this.db.prepare('UPDATE cms_blocks SET type=?,visible=?,sort_order=?,data_json=? WHERE id=?').bind(x.type,x.visible?1:0,x.sortOrder,JSON.stringify(x.data),x.id).run(); return x; }
  async deleteBlock(id: string) { await this.db.prepare('DELETE FROM cms_blocks WHERE id=?').bind(id).run(); }
  async listAssets(siteId: string) { return rows(await this.db.prepare('SELECT * FROM cms_assets WHERE site_id=? ORDER BY created_at DESC').bind(siteId).all<Row>()).map(mapAsset); }
  async getAsset(id: string) { const r = await this.db.prepare('SELECT * FROM cms_assets WHERE id=?').bind(id).first<Row>(); return r ? mapAsset(r) : null; }
  async getTheme(siteId: string) { const r = await this.db.prepare('SELECT * FROM cms_themes WHERE site_id=?').bind(siteId).first<Row>(); return r ? mapTheme(r) : null; }
  async saveTheme(x: CmsTheme) { await this.db.prepare('INSERT INTO cms_themes(id,site_id,name,tokens_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(site_id) DO UPDATE SET id=excluded.id,name=excluded.name,tokens_json=excluded.tokens_json,updated_at=excluded.updated_at').bind(x.id,x.siteId,x.name,JSON.stringify(x.tokens),x.updatedAt).run(); return x; }
  async createRevision(x: CmsRevision) { await this.db.prepare('INSERT INTO cms_revisions(id,site_id,page_id,kind,snapshot_json,actor_id,created_at) VALUES(?,?,?,?,?,?,?)').bind(x.id,x.siteId,x.pageId,x.kind,x.snapshot?JSON.stringify(x.snapshot):null,x.actorId,x.createdAt).run(); return x; }
  async listRevisions(pageId: string) { return rows(await this.db.prepare('SELECT * FROM cms_revisions WHERE page_id=? ORDER BY created_at DESC').bind(pageId).all<Row>()).map(mapRevision); }
  async setPublishedPage(pageId: string, tree: CmsPageTree) { await this.db.prepare('INSERT INTO cms_publications(page_id,tree_json,published_at) VALUES(?,?,?) ON CONFLICT(page_id) DO UPDATE SET tree_json=excluded.tree_json,published_at=excluded.published_at').bind(pageId,JSON.stringify(tree),Date.now()).run(); }
  async getPublishedPage(pageId: string) { const r = await this.db.prepare('SELECT tree_json FROM cms_publications WHERE page_id=?').bind(pageId).first<Row>(); return r?.tree_json ? parse<CmsPageTree>(r.tree_json) : null; }
}

type Row = Record<string, any>;
const rows = <T>(result: D1Result<T>) => result.results ?? [];
const parse = <T>(value: unknown, fallback: T | null = null) => { try { return JSON.parse(String(value)) as T; } catch { return fallback as T; } };
const mapSite = (r:Row):CmsSite => ({id:r.id,organizationId:r.organization_id,brandId:r.brand_id,name:r.name,domain:r.domain??null,themeId:r.theme_id??null,createdAt:Number(r.created_at),updatedAt:Number(r.updated_at)});
const mapPage = (r:Row):CmsPage => ({id:r.id,siteId:r.site_id,title:r.title,route:r.route,pageType:r.page_type,status:r.status,parentId:r.parent_id??null,seoTitle:r.seo_title??'',seoDescription:r.seo_description??'',createdAt:Number(r.created_at),updatedAt:Number(r.updated_at)});
const mapSection = (r:Row):CmsSection => ({id:r.id,pageId:r.page_id,type:r.type,name:r.name,zone:r.zone,visible:Boolean(r.visible),sortOrder:Number(r.sort_order),data:parse<Record<string,unknown>>(r.data_json,{}),r2Url:r.r2_url??null});
const mapBlock = (r:Row):CmsBlock => ({id:r.id,sectionId:r.section_id,type:r.type,visible:Boolean(r.visible),sortOrder:Number(r.sort_order),data:parse<Record<string,unknown>>(r.data_json,{})});
const mapAsset = (r:Row):CmsAsset => ({id:r.id,siteId:r.site_id,filename:r.filename,mimeType:r.mime_type,size:Number(r.size),altText:r.alt_text??'',storageKey:r.storage_key,labels:parse<string[]>(r.labels_json,[]),createdAt:Number(r.created_at)});
const mapTheme = (r:Row):CmsTheme => ({id:r.id,siteId:r.site_id,name:r.name,tokens:parse<Record<string,string|number>>(r.tokens_json,{}),updatedAt:Number(r.updated_at)});
const mapRevision = (r:Row):CmsRevision => ({id:r.id,siteId:r.site_id,pageId:r.page_id??null,kind:r.kind,snapshot:r.snapshot_json?parse<CmsPageTree>(r.snapshot_json):null,actorId:r.actor_id,createdAt:Number(r.created_at)});
