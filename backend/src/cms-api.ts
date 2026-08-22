import {
  CmsService,
  buildCmsPreviewModel,
  createLegendaryCmsRegistry,
  type CmsBlock,
  type CmsPageTree,
  type CmsRequestContext,
  type CmsSection,
  type CmsTheme,
} from '@legendary-os/iam-cms';
import { D1CmsStore, type CmsD1Database } from '@legendary-os/iam-cms/cloudflare/d1-store';
import { CmsApplication } from './cms/application';
import type { CmsThemeDto, GlobalCmsNavDto } from './cms/contracts';
import { CmsPublishedStore } from './cms/published-store';

export type CmsApiEnv = {
  CMS_DB: CmsD1Database;
  ASSETS_BUCKET: R2Bucket;
  CMS_CACHE: KVNamespace;
};

const ALL_CAPABILITIES = [
  'site.read', 'page.list', 'page.read', 'page.create', 'page.update', 'page.archive', 'page.restore',
  'section.list', 'section.read', 'section.create', 'section.update', 'section.reorder', 'section.remove',
  'block.list', 'block.read', 'block.create', 'block.update', 'block.reorder', 'block.remove',
  'asset.list', 'asset.read', 'theme.read', 'theme.update',
  'preview.read', 'revision.list', 'revision.restore', 'publish.verify', 'publish.page',
];

function contextFor(request: Request): CmsRequestContext {
  const email = request.headers.get('Cf-Access-Authenticated-User-Email') || 'local-dev';
  return {
    organizationId: 'legendary',
    brandIds: ['contractors', 'scapes'],
    actorId: email,
    capabilities: ALL_CAPABILITIES,
  };
}

function buildSeed(now: number) {
  return {
    sites: [
      { id: 'site_contractors', organizationId: 'legendary', brandId: 'contractors', name: 'Legendary Contractors', domain: 'legendarycontractors.com', themeId: 'theme_contractors', createdAt: now, updatedAt: now },
      { id: 'site_scapes', organizationId: 'legendary', brandId: 'scapes', name: 'Legendary Scapes', domain: 'legendary-scapes.com', themeId: 'theme_scapes', createdAt: now, updatedAt: now },
    ],
    pages: [
      { id: 'page_contractors_home', siteId: 'site_contractors', title: 'Home', route: '/', pageType: 'home', status: 'draft' as const, parentId: null, seoTitle: 'Legendary Contractors', seoDescription: 'Custom home building in Acadiana.', createdAt: now, updatedAt: now },
      { id: 'page_scapes_home', siteId: 'site_scapes', title: 'Home', route: '/', pageType: 'home', status: 'draft' as const, parentId: null, seoTitle: 'Legendary Scapes', seoDescription: 'Landscape design and outdoor living in Acadiana.', createdAt: now, updatedAt: now },
    ],
    sections: [
      { id: 'section_contractors_hero', pageId: 'page_contractors_home', type: 'hero', name: 'Hero', zone: 'BODY' as const, visible: true, sortOrder: 0, data: { eyebrow: 'Custom homes · Acadiana', heading: 'Your dream. Our priority. That’s Legendary.', body: 'A refined design-build experience from lot to final walkthrough.', ctaLabel: 'Start your build', ctaHref: '/contact' } },
      { id: 'section_scapes_hero', pageId: 'page_scapes_home', type: 'hero', name: 'Hero', zone: 'BODY' as const, visible: true, sortOrder: 0, data: { eyebrow: 'Landscape · Outdoor living', heading: 'Exceptional spaces, built around your property.', body: 'Landscape construction, drainage, lighting, hardscapes and outdoor living.', ctaLabel: 'Request a consultation', ctaHref: '/contact' } },
    ],
    themes: [
      { id: 'theme_contractors', siteId: 'site_contractors', name: 'Contractors', tokens: { brand: '#111111', surface: '#f4f1ea', radius: 18 }, updatedAt: now },
      { id: 'theme_scapes', siteId: 'site_scapes', name: 'Scapes', tokens: { brand: '#23372b', surface: '#f4f1ea', radius: 18 }, updatedAt: now },
    ],
  };
}

let seeded = false;
let schemasSynced = false;

async function ensureSeeded(store: D1CmsStore) {
  if (seeded) return;
  try {
    const existing = await store.db.prepare('SELECT id FROM cms_sites LIMIT 1').first();
    if (!existing) {
      const seed = buildSeed(Date.now());
      for (const site of seed.sites) {
        await store.db
          .prepare('INSERT OR IGNORE INTO cms_sites(id,organization_id,brand_id,name,domain,theme_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
          .bind(site.id, site.organizationId, site.brandId, site.name, site.domain, site.themeId, site.createdAt, site.updatedAt)
          .run();
      }
      for (const page of seed.pages) await store.createPage(page).catch(() => null);
      for (const section of seed.sections) await store.createSection(section as CmsSection).catch(() => null);
      for (const theme of seed.themes) await store.saveTheme(theme).catch(() => null);
    }
    seeded = true;
  } catch (error) {
    console.error('cms_seed_failed', error);
  }
}

async function syncSectionSchemas(db: CmsD1Database, cms: CmsService) {
  if (schemasSynced) return;
  const now = Date.now();
  for (const definition of cms.registry.manifest().sections) {
    await db.prepare(
      `INSERT INTO cms_section_schemas(section_type,label,description,schema_json,is_active,updated_at)
       VALUES(?,?,?,?,1,?)
       ON CONFLICT(section_type) DO UPDATE SET label=excluded.label,description=excluded.description,schema_json=excluded.schema_json,is_active=1,updated_at=excluded.updated_at`,
    ).bind(definition.type, definition.label, definition.description ?? null, JSON.stringify({ fields: definition.fields }), now).run();
  }
  schemasSynced = true;
}

export async function handleCmsApi(request: Request, env: CmsApiEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const db = env.CMS_DB;
  const store = new D1CmsStore(db);
  const cms = new CmsService(store, { registry: createLegendaryCmsRegistry() });
  const app = new CmsApplication(db);
  const published = new CmsPublishedStore(env);
  const ctx = contextFor(request);

  await ensureSeeded(store);
  await syncSectionSchemas(db, cms);

  if (url.pathname === '/api/cms/sites' && request.method === 'GET') {
    cms.require(ctx, 'site.read');
    const rows = await db.prepare('SELECT * FROM cms_sites ORDER BY name').all();
    return Response.json({ sites: rows.results ?? [] });
  }

  if (url.pathname === '/api/cms/section-schemas' && request.method === 'GET') {
    cms.require(ctx, 'section.list');
    const rows = await db.prepare('SELECT section_type,label,description,schema_json,is_active,updated_at FROM cms_section_schemas WHERE is_active=1 ORDER BY label').all<Record<string, unknown>>();
    return Response.json({ schemas: (rows.results ?? []).map((row) => ({ ...row, schema: safeJson(row.schema_json, {}) })) });
  }

  const pagesMatch = url.pathname.match(/^\/api\/cms\/sites\/([^/]+)\/pages$/);
  if (pagesMatch) {
    const siteId = decodeURIComponent(pagesMatch[1]);
    if (request.method === 'GET') return Response.json({ pages: await cms.listPages(ctx, siteId) });
    if (request.method === 'POST') {
      const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
      const page = await cms.createPage(ctx, siteId, {
        title: String(body.title || '').trim(),
        route: String(body.route || '/').trim(),
        pageType: String(body.pageType || 'standard').trim(),
        seoTitle: body.seoTitle == null ? undefined : String(body.seoTitle),
        seoDescription: body.seoDescription == null ? undefined : String(body.seoDescription),
        parentId: body.parentId == null ? undefined : String(body.parentId),
      });
      return Response.json({ page }, { status: 201 });
    }
  }

  const pageMatch = url.pathname.match(/^\/api\/cms\/pages\/([^/]+)$/);
  if (pageMatch) {
    const pageId = decodeURIComponent(pageMatch[1]);
    if (request.method === 'GET') {
      cms.require(ctx, 'page.read');
      const page = await app.getEditorPage(pageId, ctx.capabilities);
      return page ? Response.json(page) : Response.json({ error: 'not_found' }, { status: 404 });
    }
    if (request.method === 'PATCH') {
      const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
      const patch = Object.fromEntries(
        ['title', 'route', 'pageType', 'seoTitle', 'seoDescription', 'parentId']
          .filter((key) => Object.hasOwn(body, key))
          .map((key) => [key, body[key] == null ? null : String(body[key])]),
      );
      const page = await cms.updatePage(ctx, pageId, patch);
      await recordDraftRevision(store, pageId, ctx);
      return Response.json({ page });
    }
    if (request.method === 'DELETE') {
      const page = await cms.archivePage(ctx, pageId, true);
      return Response.json({ page });
    }
  }

  const pageSectionsMatch = url.pathname.match(/^\/api\/cms\/pages\/([^/]+)\/sections$/);
  if (pageSectionsMatch && request.method === 'POST') {
    const pageId = decodeURIComponent(pageSectionsMatch[1]);
    const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
    const type = String(body.type || '').trim();
    const definition = cms.registry.getSection(type);
    if (!definition) return Response.json({ error: 'unknown_section_type', type }, { status: 400 });
    const section = await cms.createSection(ctx, pageId, {
      type,
      name: String(body.name || definition.label),
      zone: String(body.zone || 'BODY') as CmsSection['zone'],
      data: isRecord(body.data) ? body.data : defaultSectionData(definition.fields),
    });
    await recordDraftRevision(store, pageId, ctx);
    return Response.json({ section }, { status: 201 });
  }

  const globalNavMatch = url.pathname.match(/^\/api\/cms\/sites\/([^/]+)\/global-nav$/);
  if (globalNavMatch) {
    const siteId = decodeURIComponent(globalNavMatch[1]);
    const site = await app.resolveSiteByKey(siteId);
    if (!site) return Response.json({ error: 'site_not_found' }, { status: 404 });
    if (request.method === 'GET') {
      cms.require(ctx, 'site.read');
      return Response.json({ globalCmsNav: await app.getGlobalCmsNav(site.id) });
    }
    if (request.method === 'PATCH') {
      cms.require(ctx, 'theme.update');
      const body = await request.json<{ data?: Omit<GlobalCmsNavDto, 'id' | 'siteId' | 'updatedAt'> }>().catch(() => ({ data: undefined }));
      if (!body.data) return Response.json({ error: 'data_required' }, { status: 400 });
      return Response.json({ globalCmsNav: await app.saveGlobalCmsNav(site.id, body.data) });
    }
  }

  const globalNavPublishMatch = url.pathname.match(/^\/api\/cms\/sites\/([^/]+)\/global-nav\/publish$/);
  if (globalNavPublishMatch && request.method === 'POST') {
    cms.require(ctx, 'publish.page', true);
    const site = await app.resolveSiteByKey(decodeURIComponent(globalNavPublishMatch[1]));
    if (!site) return Response.json({ error: 'site_not_found' }, { status: 404 });
    const globalCmsNav = await app.getGlobalCmsNav(site.id);
    if (!globalCmsNav) return Response.json({ error: 'global_nav_not_found' }, { status: 404 });
    return Response.json({ globalCmsNav, publication: await published.publishGlobalNav(site.id, globalCmsNav) });
  }

  const themeMatch = url.pathname.match(/^\/api\/cms\/sites\/([^/]+)\/theme$/);
  if (themeMatch) {
    const site = await app.resolveSiteByKey(decodeURIComponent(themeMatch[1]));
    if (!site) return Response.json({ error: 'site_not_found' }, { status: 404 });
    if (request.method === 'GET') {
      cms.require(ctx, 'theme.read');
      return Response.json({ theme: await store.getTheme(site.id) });
    }
    if (request.method === 'PATCH') {
      cms.require(ctx, 'theme.update');
      const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
      const current = await store.getTheme(site.id);
      const theme: CmsTheme = {
        id: current?.id ?? `theme_${site.brandId}`,
        siteId: site.id,
        name: body.name == null ? (current?.name ?? site.name) : String(body.name),
        tokens: isRecord(body.tokens) ? body.tokens as Record<string, string | number> : (current?.tokens ?? {}),
        updatedAt: Date.now(),
      };
      return Response.json({ theme: await store.saveTheme(theme) });
    }
  }

  const themePublishMatch = url.pathname.match(/^\/api\/cms\/sites\/([^/]+)\/theme\/publish$/);
  if (themePublishMatch && request.method === 'POST') {
    cms.require(ctx, 'publish.page', true);
    const site = await app.resolveSiteByKey(decodeURIComponent(themePublishMatch[1]));
    if (!site) return Response.json({ error: 'site_not_found' }, { status: 404 });
    const theme = await store.getTheme(site.id);
    if (!theme) return Response.json({ error: 'theme_not_found' }, { status: 404 });
    const dto: CmsThemeDto = { id: theme.id, name: theme.name, tokens: theme.tokens };
    return Response.json({ theme, publication: await published.publishTheme(site.id, dto) });
  }

  const previewMatch = url.pathname.match(/^\/api\/cms\/pages\/([^/]+)\/preview$/);
  if (previewMatch && request.method === 'GET') {
    cms.require(ctx, 'preview.read');
    const page = await store.getPageTree(decodeURIComponent(previewMatch[1]));
    if (!page) return Response.json({ error: 'not_found' }, { status: 404 });
    const theme = await store.getTheme(page.siteId);
    const globalCmsNav = await app.getGlobalCmsNav(page.siteId);
    return Response.json({ ...buildCmsPreviewModel(page, theme), globalCmsNav });
  }

  const revisionsMatch = url.pathname.match(/^\/api\/cms\/pages\/([^/]+)\/revisions$/);
  if (revisionsMatch && request.method === 'GET') {
    cms.require(ctx, 'revision.list');
    const pageId = decodeURIComponent(revisionsMatch[1]);
    const page = await store.getPage(pageId);
    if (!page) return Response.json({ error: 'not_found' }, { status: 404 });
    await cms.listPages(ctx, page.siteId);
    return Response.json({ revisions: await store.listRevisions(pageId) });
  }

  const restoreMatch = url.pathname.match(/^\/api\/cms\/revisions\/([^/]+)\/restore$/);
  if (restoreMatch && request.method === 'POST') {
    cms.require(ctx, 'revision.restore', true);
    return Response.json({ page: await restoreRevision(db, store, cms, ctx, decodeURIComponent(restoreMatch[1])) });
  }

  const sectionMatch = url.pathname.match(/^\/api\/cms\/sections\/([^/]+)$/);
  if (sectionMatch) {
    const sectionId = decodeURIComponent(sectionMatch[1]);
    const existing = await findSection(store, sectionId);
    if (!existing) return Response.json({ error: 'not_found' }, { status: 404 });
    if (request.method === 'PATCH') {
      const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
      const updated = await cms.updateSection(ctx, {
        ...existing,
        name: body.name == null ? existing.name : String(body.name),
        visible: body.visible == null ? existing.visible : Boolean(body.visible),
        sortOrder: body.sortOrder == null ? existing.sortOrder : Number(body.sortOrder),
        data: isRecord(body.data) ? { ...existing.data, ...body.data } : existing.data,
      });
      await recordDraftRevision(store, existing.pageId, ctx);
      return Response.json({ section: updated });
    }
    if (request.method === 'DELETE') {
      await cms.removeSection(ctx, existing, true);
      await recordDraftRevision(store, existing.pageId, ctx);
      return Response.json({ ok: true });
    }
  }

  const sectionBlocksMatch = url.pathname.match(/^\/api\/cms\/sections\/([^/]+)\/blocks$/);
  if (sectionBlocksMatch && request.method === 'POST') {
    const section = await findSection(store, decodeURIComponent(sectionBlocksMatch[1]));
    if (!section) return Response.json({ error: 'section_not_found' }, { status: 404 });
    const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
    const block = await cms.createBlock(ctx, section, {
      type: String(body.type || 'text'),
      data: isRecord(body.data) ? body.data : {},
    });
    await recordDraftRevision(store, section.pageId, ctx);
    return Response.json({ block }, { status: 201 });
  }

  const blockMatch = url.pathname.match(/^\/api\/cms\/blocks\/([^/]+)$/);
  if (blockMatch) {
    const block = await findBlock(store, decodeURIComponent(blockMatch[1]));
    if (!block) return Response.json({ error: 'not_found' }, { status: 404 });
    const section = await findSection(store, block.sectionId);
    if (!section) return Response.json({ error: 'section_not_found' }, { status: 404 });
    if (request.method === 'PATCH') {
      const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
      const updated = await cms.updateBlock(ctx, section, {
        ...block,
        type: body.type == null ? block.type : String(body.type),
        visible: body.visible == null ? block.visible : Boolean(body.visible),
        sortOrder: body.sortOrder == null ? block.sortOrder : Number(body.sortOrder),
        data: isRecord(body.data) ? { ...block.data, ...body.data } : block.data,
      });
      await recordDraftRevision(store, section.pageId, ctx);
      return Response.json({ block: updated });
    }
    if (request.method === 'DELETE') {
      await cms.removeBlock(ctx, section, block.id, true);
      await recordDraftRevision(store, section.pageId, ctx);
      return Response.json({ ok: true });
    }
  }

  const publishMatch = url.pathname.match(/^\/api\/cms\/pages\/([^/]+)\/publish$/);
  if (publishMatch && request.method === 'POST') {
    const tree = await cms.publishPage(ctx, decodeURIComponent(publishMatch[1]), true);
    const page = await app.getPublishedPage(tree.siteId, tree.route);
    if (!page) throw new Error(`Published page could not be reloaded: ${tree.id}`);
    return Response.json({ page: tree, publication: await published.publishPage(page) });
  }

  if (url.pathname === '/api/cms/registry' && request.method === 'GET') {
    return Response.json(cms.registry.manifest());
  }

  if (url.pathname === '/api/cms/whoami' && request.method === 'GET') {
    return Response.json({ actorId: ctx.actorId });
  }

  return null;
}

async function recordDraftRevision(store: D1CmsStore, pageId: string, ctx: CmsRequestContext) {
  const tree = await store.getPageTree(pageId);
  if (!tree) return;
  await store.createRevision({
    id: `revision_${crypto.randomUUID().replaceAll('-', '')}`,
    siteId: tree.siteId,
    pageId,
    kind: 'draft',
    snapshot: tree,
    actorId: ctx.actorId,
    createdAt: Date.now(),
  });
}

async function restoreRevision(db: CmsD1Database, store: D1CmsStore, cms: CmsService, ctx: CmsRequestContext, revisionId: string) {
  const row = await db.prepare('SELECT * FROM cms_revisions WHERE id=?').bind(revisionId).first<Record<string, unknown>>();
  if (!row?.snapshot_json) throw new Error('Revision has no restorable snapshot');
  const snapshot = safeJson<CmsPageTree>(row.snapshot_json, null);
  if (!snapshot) throw new Error('Revision snapshot is invalid');
  await cms.listPages(ctx, snapshot.siteId);

  for (const section of snapshot.sections) {
    const sectionCheck = cms.registry.validate('section', section.type, section.data);
    if (!sectionCheck.ok) throw new Error(sectionCheck.errors.join('; '));
    for (const block of section.blocks) {
      const blockCheck = cms.registry.validate('block', block.type, block.data);
      if (!blockCheck.ok) throw new Error(blockCheck.errors.join('; '));
    }
  }

  const existing = await store.listSections(snapshot.id);
  for (const section of existing) await store.deleteSection(section.id);
  await store.updatePage({ ...snapshot, status: 'draft', updatedAt: Date.now() });
  for (const section of snapshot.sections) {
    const { blocks, ...sectionRow } = section;
    await store.createSection(sectionRow);
    for (const block of blocks) await store.createBlock(block);
  }
  const restored = await store.getPageTree(snapshot.id);
  if (!restored) throw new Error('Restored page could not be reloaded');
  await store.createRevision({
    id: `revision_${crypto.randomUUID().replaceAll('-', '')}`,
    siteId: restored.siteId,
    pageId: restored.id,
    kind: 'restore',
    snapshot: restored,
    actorId: ctx.actorId,
    createdAt: Date.now(),
  });
  return restored;
}

async function findSection(store: D1CmsStore, sectionId: string): Promise<CmsSection | null> {
  const row = await store.db.prepare('SELECT * FROM cms_sections WHERE id=?').bind(sectionId).first<Record<string, unknown>>();
  if (!row) return null;
  return {
    id: String(row.id),
    pageId: String(row.page_id),
    type: String(row.type),
    name: String(row.name),
    zone: row.zone as CmsSection['zone'],
    visible: Boolean(row.visible),
    sortOrder: Number(row.sort_order),
    data: safeJson<Record<string, unknown>>(row.data_json, {}),
  };
}

async function findBlock(store: D1CmsStore, blockId: string): Promise<CmsBlock | null> {
  const row = await store.db.prepare('SELECT * FROM cms_blocks WHERE id=?').bind(blockId).first<Record<string, unknown>>();
  if (!row) return null;
  return {
    id: String(row.id),
    sectionId: String(row.section_id),
    type: String(row.type),
    visible: Boolean(row.visible),
    sortOrder: Number(row.sort_order),
    data: safeJson<Record<string, unknown>>(row.data_json, {}),
  };
}

function defaultSectionData(fields: Array<{ key: string; defaultValue?: unknown; required?: boolean; type: string }>) {
  return Object.fromEntries(fields
    .filter((field) => field.defaultValue !== undefined || field.required)
    .map((field) => [field.key, field.defaultValue ?? (field.type === 'json' || field.type === 'images' ? [] : '')]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeJson<T>(value: unknown, fallback: T): T {
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}
