import assert from 'node:assert/strict';
import test from 'node:test';
import { siteHref, scopeSectionLinks } from '../frontend/src/site/siteLinks';
import { rejectUnauthorizedCmsApi } from '../backend/src/auth/cms-route-auth';
import { handleMediaRequest } from '../backend/src/media';
import { handlePublicCmsApi } from '../backend/src/public-cms-api';

test('Scapes and explicit site URLs retain their business context', () => {
  assert.equal(siteHref('/contact', '/scapes'), '/scapes/contact');
  assert.equal(siteHref('/', '/scapes'), '/scapes/');
  assert.equal(siteHref('services?type=lighting#details', '/scapes'), '/scapes/services?type=lighting#details');
  assert.equal(siteHref('/scapes/contact', '/scapes'), '/scapes/contact');
  assert.equal(siteHref('/contact', '/site/site_scapes'), '/site/site_scapes/contact');
  assert.equal(siteHref('/contact'), '/contact');
  for (const href of ['/dashboard/cms', '/site/site_contractors/', '/scapes/', '#work', 'mailto:hello@example.com', 'tel:123', 'https://example.com']) {
    assert.equal(siteHref(href, '/scapes'), href);
  }
});

test('unsafe link schemes are rejected and source content is preserved', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,x', 'java\nscript:alert(1)', '/\\evil.example']) {
    assert.equal(siteHref(href, '/scapes'), '#');
  }
  const data = { ctaHref: '/contact', items: [{ href: '/services', image: '/assets/photo.jpg' }] };
  const next = scopeSectionLinks(data, '/scapes');
  assert.equal(next.ctaHref, '/scapes/contact');
  assert.deepEqual(next.items, [{ href: '/scapes/services', image: '/assets/photo.jpg' }]);
  assert.equal(data.ctaHref, '/contact');
});

// Any access to storage before authentication fails the test.
const inaccessibleDb = { prepare() { throw new Error('Unauthenticated storage access'); } } as any;

test('bridge mode fails closed without a secret or with a forged email header', async () => {
  for (const headers of [{}, { 'Cf-Access-Authenticated-User-Email': 'owner@example.com' }]) {
    const response = await rejectUnauthorizedCmsApi(new Request('https://example.com/api/cms/sites', { headers }), {
      DB: inaccessibleDb, CMS_AUTH_MODE: 'bridge',
    });
    assert.equal(response?.status, 401);
  }
  assert.equal(await rejectUnauthorizedCmsApi(new Request('https://example.com/api/cms/sites', {
    headers: { Authorization: 'Bearer test-machine-key' },
  }), { DB: inaccessibleDb, CMS_AUTH_MODE: 'bridge', AGENTSAM_BRIDGE_KEY: 'test-machine-key' }), null);
});

test('anonymous media library reads and writes are rejected before storage access', async () => {
  for (const [method, path] of [
    ['GET', '/api/media/assets'], ['GET', '/api/media/assets/asset_x/usages'],
    ['POST', '/api/media/uploads'], ['POST', '/api/media/imports/site-manifest'],
    ['PATCH', '/api/media/assets/asset_x'], ['DELETE', '/api/media/assets/asset_x'],
    ['DELETE', '/api/media/usages/usage_x'],
  ]) {
    const response = await handleMediaRequest(new Request(`https://example.com${path}`, { method }), {
      DB: inaccessibleDb, ASSETS_BUCKET: {} as any,
    });
    assert.equal(response?.status, 401, `${method} ${path}`);
  }
});

function publicEnv({ snapshot = true, publishedSettings = false } = {}) {
  const tree = { id: 'page_scapes', siteId: 'site_scapes', title: 'Home', route: '/', pageType: 'home', status: 'published', seoTitle: 'Scapes', sections: [] };
  const site = { id: 'site_scapes', organization_id: 'legendary', brand_id: 'scapes', name: 'Legendary Scapes' };
  const publishedTheme = { id: 'theme', name: 'Published', tokens: { brand: '#123456' } };
  const page = { site: { id: site.id }, page: { route: '/' }, sections: [], theme: publishedTheme };
  const nav = { id: 'nav', brand: { name: 'Published nav' } };
  return {
    DB: {
      prepare(sql: string) {
        return {
          bind() { return this; },
          async first() {
            if (sql.includes('SELECT id FROM cms_sites')) return { id: site.id };
            if (sql.includes('SELECT * FROM cms_sites')) return site;
            if (sql.includes('SELECT id FROM cms_pages')) return { id: tree.id };
            if (sql.includes('cms_publications')) return { tree_json: JSON.stringify(tree) };
            if (sql.includes('cms_themes')) return { id: 'draft_theme', name: 'Unpublished', tokens_json: '{"brand":"draft-secret"}' };
            if (sql.includes('cms_global_nav')) throw new Error('Public request read unpublished navigation');
            throw new Error(`Unexpected SQL: ${sql}`);
          },
        };
      },
    },
    CMS_CACHE: {
      async get(key: string) {
        if (key.startsWith('cms:page:') && snapshot) return JSON.stringify({ r2Key: 'page' });
        if (publishedSettings && key.startsWith('cms:nav:')) return JSON.stringify({ r2Key: 'nav' });
        if (publishedSettings && key.startsWith('cms:theme:')) return JSON.stringify({ r2Key: 'theme' });
        return null;
      },
    },
    ASSETS_BUCKET: {
      async get(key: string) { return { async text() { return JSON.stringify(key === 'page' ? page : key === 'nav' ? nav : publishedTheme); } }; },
    },
  } as any;
}

test('public pages use snapshot settings without reading unpublished navigation', async () => {
  const response = await handlePublicCmsApi(new Request('https://example.com/api/public/sites/site_scapes/page'), publicEnv());
  const body = await response!.json() as any;
  assert.equal(body.theme.name, 'Published');
  assert.equal(body.globalCmsNav, null);
});

test('legacy D1 publication does not leak the mutable editor theme', async () => {
  const response = await handlePublicCmsApi(new Request('https://example.com/api/public/sites/site_scapes/page'), publicEnv({ snapshot: false }));
  const body = await response!.json() as any;
  assert.equal(body.theme, null);
  assert.equal(body.globalCmsNav, null);
  assert.equal(body.page.title, 'Home');
});

test('separately published global settings remain available', async () => {
  const response = await handlePublicCmsApi(new Request('https://example.com/api/public/sites/site_scapes/page'), publicEnv({ publishedSettings: true }));
  const body = await response!.json() as any;
  assert.equal(body.globalCmsNav.brand.name, 'Published nav');
  assert.equal(body.theme.tokens.brand, '#123456');
});
