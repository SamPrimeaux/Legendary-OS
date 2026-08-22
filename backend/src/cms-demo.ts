import { CmsService, MemoryCmsStore, buildCmsPreviewModel, createLegendaryCmsRegistry, type CmsRequestContext } from '@legendary-os/iam-cms';

const now = Date.now();
const store = new MemoryCmsStore().seed({
  sites: [
    { id: 'site_contractors', organizationId: 'legendary', brandId: 'contractors', name: 'Legendary Contractors', domain: 'legendarycontractors.com', themeId: 'theme_contractors', createdAt: now, updatedAt: now },
    { id: 'site_scapes', organizationId: 'legendary', brandId: 'scapes', name: 'Legendary Scapes', domain: 'legendary-scapes.com', themeId: 'theme_scapes', createdAt: now, updatedAt: now },
  ],
  pages: [
    { id: 'page_contractors_home', siteId: 'site_contractors', title: 'Home', route: '/', pageType: 'home', status: 'draft', parentId: null, seoTitle: 'Legendary Contractors', seoDescription: 'Custom home building in Acadiana.', createdAt: now, updatedAt: now },
    { id: 'page_scapes_home', siteId: 'site_scapes', title: 'Home', route: '/', pageType: 'home', status: 'draft', parentId: null, seoTitle: 'Legendary Scapes', seoDescription: 'Landscape design and outdoor living in Acadiana.', createdAt: now, updatedAt: now },
  ],
  sections: [
    { id: 'section_contractors_hero', pageId: 'page_contractors_home', type: 'hero', name: 'Hero', zone: 'BODY', visible: true, sortOrder: 0, data: { eyebrow: 'Custom homes · Acadiana', heading: 'Your dream. Our priority. That’s Legendary.', body: 'A refined design-build experience from lot to final walkthrough.', ctaLabel: 'Start your build', ctaHref: '/contact' } },
    { id: 'section_scapes_hero', pageId: 'page_scapes_home', type: 'hero', name: 'Hero', zone: 'BODY', visible: true, sortOrder: 0, data: { eyebrow: 'Landscape · Outdoor living', heading: 'Exceptional spaces, built around your property.', body: 'Landscape construction, drainage, lighting, hardscapes and outdoor living.', ctaLabel: 'Request a consultation', ctaHref: '/contact' } },
  ],
  themes: [
    { id: 'theme_contractors', siteId: 'site_contractors', name: 'Contractors', tokens: { brand: '#111111', surface: '#f4f1ea', radius: 18 }, updatedAt: now },
    { id: 'theme_scapes', siteId: 'site_scapes', name: 'Scapes', tokens: { brand: '#23372b', surface: '#f4f1ea', radius: 18 }, updatedAt: now },
  ],
});

export const cms = new CmsService(store, { registry: createLegendaryCmsRegistry() });

const demoContext: CmsRequestContext = {
  organizationId: 'legendary',
  brandIds: ['contractors', 'scapes'],
  actorId: 'demo_richard',
  capabilities: [
    'site.read','page.list','page.read','page.create','page.update','section.list','section.read','section.create','section.update','block.list','block.read','block.create','block.update','asset.list','asset.read','theme.read','theme.update','preview.read','revision.list','publish.verify','publish.page'
  ],
};

export async function handleCmsDemo(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === '/api/cms/sites' && request.method === 'GET') {
    return Response.json({ sites: [...store.sites.values()] });
  }
  const pageMatch = url.pathname.match(/^\/api\/cms\/sites\/([^/]+)\/pages$/);
  if (pageMatch && request.method === 'GET') {
    return Response.json({ pages: await cms.listPages(demoContext, pageMatch[1]) });
  }
  const previewMatch = url.pathname.match(/^\/api\/cms\/pages\/([^/]+)\/preview$/);
  if (previewMatch && request.method === 'GET') {
    cms.require(demoContext, 'preview.read');
    const page = await store.getPageTree(previewMatch[1]);
    if (!page) return Response.json({ error: 'not_found' }, { status: 404 });
    const theme = await store.getTheme(page.siteId);
    return Response.json(buildCmsPreviewModel(page, theme));
  }
  const manifestPath = '/api/cms/registry';
  if (url.pathname === manifestPath && request.method === 'GET') {
    return Response.json(cms.registry.manifest());
  }
  return null;
}
