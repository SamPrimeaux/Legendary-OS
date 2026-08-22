import {
  CmsService,
  buildCmsPreviewModel,
  createLegendaryCmsRegistry,
  type CmsRequestContext,
  type CmsSection,
} from '@legendary-os/iam-cms';
import { D1CmsStore, type CmsD1Database } from '@legendary-os/iam-cms/cloudflare/d1-store';
import { CmsApplication } from './cms/application';
import type { GlobalCmsNavDto } from './cms/contracts';
import { CmsPublishedStore } from './cms/published-store';

export type CmsApiEnv = {
  CMS_DB: CmsD1Database;
  ASSETS_BUCKET: R2Bucket;
  CMS_CACHE: KVNamespace;
};

const ALL_CAPABILITIES = [
  'site.read', 'page.list', 'page.read', 'page.create', 'page.update',
  'section.list', 'section.read', 'section.create', 'section.update',
  'block.list', 'block.read', 'block.create', 'block.update',
  'asset.list', 'asset.read', 'theme.read', 'theme.update',
  'preview.read', 'revision.list', 'publish.verify', 'publish.page',
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

async function ensureSeeded(store: D1CmsStore) {
  if (seeded) return;
  try {
    const existing = await store.db.prepare('SELECT id FROM cms_sites LIMIT 1').first();
    if (existing) { seeded = true; return; }
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
    seeded = true;
  } catch (error) {
    console.error('cms_seed_failed', error);
  }
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

  if (url.pathname === '/api/cms/sites' && request.method === 'GET') {
    cms.require(ctx, 'site.read');
    const rows = await db.prepare('SELECT * FROM cms_sites ORDER BY name').all();
    return Response.json({ sites: rows.results ?? [] });
  }

  const pagesMatch = url.pathname.match(/^\/api\/cms\/sites\/([^/]+)\/pages$/);
  if (pagesMatch && request.method === 'GET') {
    return Response.json({ pages: await cms.listPages(ctx, pagesMatch[1]) });
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
      const body = await request.json<{ data?: Omit<GlobalCmsNavDto, 'id' | 'siteId' | 'updatedAt'> }>().catch(() => ({}));
      if (!body.data) return Response.json({ error: 'data_required' }, { status: 400 });
      const globalCmsNav = await app.saveGlobalCmsNav(site.id, body.data);
      return Response.json({ globalCmsNav });
    }
  }

  const globalNavPublishMatch = url.pathname.match(/^\/api\/cms\/sites\/([^/]+)\/global-nav\/publish$/);
  if (globalNavPublishMatch && request.method === 'POST') {
    cms.require(ctx, 'publish.page');
    const site = await app.resolveSiteByKey(decodeURIComponent(globalNavPublishMatch[1]));
    if (!site) return Response.json({ error: 'site_not_found' }, { status: 404 });
    const globalCmsNav = await app.getGlobalCmsNav(site.id);
    if (!globalCmsNav) return Response.json({ error: 'global_nav_not_found' }, { status: 404 });
    return Response.json({ globalCmsNav, publication: await published.publishGlobalNav(site.id, globalCmsNav) });
  }

  const previewMatch = url.pathname.match(/^\/api\/cms\/pages\/([^/]+)\/preview$/);
  if (previewMatch && request.method === 'GET') {
    cms.require(ctx, 'preview.read');
    const page = await store.getPageTree(previewMatch[1]);
    if (!page) return Response.json({ error: 'not_found' }, { status: 404 });
    const theme = await store.getTheme(page.siteId);
    const globalCmsNav = await app.getGlobalCmsNav(page.siteId);
    return Response.json({ ...buildCmsPreviewModel(page, theme), globalCmsNav });
  }

  const sectionMatch = url.pathname.match(/^\/api\/cms\/sections\/([^/]+)$/);
  if (sectionMatch && request.method === 'PATCH') {
    const sectionId = sectionMatch[1];
    const body = await request.json<{ data?: Record<string, unknown> }>().catch(() => ({}));
    const existing = await findSection(store, sectionId);
    if (!existing) return Response.json({ error: 'not_found' }, { status: 404 });
    const updated = await cms.updateSection(ctx, { ...existing, data: { ...existing.data, ...(body.data ?? {}) } });
    return Response.json({ section: updated });
  }

  const publishMatch = url.pathname.match(/^\/api\/cms\/pages\/([^/]+)\/publish$/);
  if (publishMatch && request.method === 'POST') {
    const tree = await cms.publishPage(ctx, publishMatch[1], true);
    const page = await app.getPublishedPage(tree.siteId, tree.route);
    if (!page) throw new Error(`Published page could not be reloaded: ${tree.id}`);
    const pagePublication = await published.publishPage(page);
    const globalCmsNav = await app.getGlobalCmsNav(tree.siteId);
    const navPublication = globalCmsNav ? await published.publishGlobalNav(tree.siteId, globalCmsNav) : null;
    return Response.json({ page: tree, publication: pagePublication, globalCmsNav, globalNavPublication: navPublication });
  }

  if (url.pathname === '/api/cms/registry' && request.method === 'GET') {
    return Response.json(cms.registry.manifest());
  }

  if (url.pathname === '/api/cms/whoami' && request.method === 'GET') {
    return Response.json({ actorId: ctx.actorId });
  }

  return null;
}

async function findSection(store: D1CmsStore, sectionId: string) {
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
    data: JSON.parse(String(row.data_json || '{}')),
  };
}
