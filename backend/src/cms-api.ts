import {
  CmsService,
  buildCmsPreviewModel,
  createLegendaryCmsRegistry,
  type CmsRequestContext,
  type CmsSection,
} from '@legendary-os/iam-cms';
import { D1CmsStore, type CmsD1Database } from '@legendary-os/iam-cms/cloudflare/d1-store';

// Every authenticated request currently gets the same broad capability set.
// Legendary OS does not have a People/Roles domain yet, so per-user scoping
// is not possible — Cloudflare Access is the only gate in front of this API.
// Narrow this once real roles exist. Never hardcode a *resource* id here;
// this is a capability list, not a lookup into specific records.
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

// Cloudflare Workers restricts real wall-clock time in module (global) scope
// — Date.now() there is frozen, not the actual time — so seed timestamps must
// be computed inside the request-scoped function below, not at module load.
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
    const SEED = buildSeed(Date.now());
    for (const site of SEED.sites) {
      await store.db
        .prepare('INSERT OR IGNORE INTO cms_sites(id,organization_id,brand_id,name,domain,theme_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
        .bind(site.id, site.organizationId, site.brandId, site.name, site.domain, site.themeId, site.createdAt, site.updatedAt)
        .run();
    }
    for (const page of SEED.pages) await store.createPage(page).catch(() => null);
    for (const section of SEED.sections) await store.createSection(section as CmsSection).catch(() => null);
    for (const theme of SEED.themes) await store.saveTheme(theme).catch(() => null);
    seeded = true;
  } catch (error) {
    // Non-fatal: a seeding failure should not take the API down. Worst case
    // is an empty site list, which the frontend already handles.
    console.error('cms_seed_failed', error);
  }
}

export async function handleCmsApi(request: Request, db: CmsD1Database): Promise<Response | null> {
  const url = new URL(request.url);
  const store = new D1CmsStore(db);
  const cms = new CmsService(store, { registry: createLegendaryCmsRegistry() });
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

  const previewMatch = url.pathname.match(/^\/api\/cms\/pages\/([^/]+)\/preview$/);
  if (previewMatch && request.method === 'GET') {
    cms.require(ctx, 'preview.read');
    const page = await store.getPageTree(previewMatch[1]);
    if (!page) return Response.json({ error: 'not_found' }, { status: 404 });
    const theme = await store.getTheme(page.siteId);
    return Response.json(buildCmsPreviewModel(page, theme));
  }

  const sectionMatch = url.pathname.match(/^\/api\/cms\/sections\/([^/]+)$/);
  if (sectionMatch && request.method === 'PATCH') {
    const sectionId = sectionMatch[1];
    const body = await request.json<{ data?: Record<string, unknown> }>().catch(() => ({}) as { data?: Record<string, unknown> });
    const existing = await findSection(store, sectionId);
    if (!existing) return Response.json({ error: 'not_found' }, { status: 404 });
    const updated = await cms.updateSection(ctx, { ...existing, data: { ...existing.data, ...(body.data ?? {}) } });
    return Response.json({ section: updated });
  }

  const publishMatch = url.pathname.match(/^\/api\/cms\/pages\/([^/]+)\/publish$/);
  if (publishMatch && request.method === 'POST') {
    const tree = await cms.publishPage(ctx, publishMatch[1], true);
    return Response.json({ page: tree });
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
