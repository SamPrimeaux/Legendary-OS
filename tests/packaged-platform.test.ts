import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('Legendary consumes the shipped AgentSam CMS and Content Studio products', () => {
  const pkg = JSON.parse(read('frontend/package.json')) as { dependencies?: Record<string, string> };
  const deps = pkg.dependencies || {};

  assert.equal(deps['@inneranimalmedia/ecommerce-cms-agentsam'], '2.6.12');
  assert.equal(deps['@inneranimalmedia/client-cms-editor'], '2.6.12');
  assert.equal(deps['@inneranimalmedia/agentsam-content'], '2.6.12');
  assert.equal(deps['@inneranimalmedia/agentsam-content-studio'], '2.6.12');
  assert.equal(deps['@inneranimalmedia/agentsam-work'], '2.6.12');

  const cmsApp = read('frontend/src/cms/LegendaryCmsApp.tsx');
  assert.match(cmsApp, /CmsHubPage.*@inneranimalmedia\/ecommerce-cms-agentsam\/cms/s);
  assert.match(cmsApp, /<CmsWorkspace \/>/, 'existing stronger Legendary authoring stays available during package promotion');

  const contentRuntime = read('frontend/src/content/legendaryContentRuntime.ts');
  assert.match(contentRuntime, /createContentRuntime/);
  assert.match(contentRuntime, /mediaClient\.listAssets/);
  assert.match(contentRuntime, /mediaClient\.upload/);
  assert.match(contentRuntime, /mediaClient\.updateAsset/);
  assert.match(contentRuntime, /query\.cursor/);
  assert.match(contentRuntime, /usagesByAsset/);
  assert.match(contentRuntime, /nextOffset/);
  assert.doesNotMatch(contentRuntime, /InMemoryContentStore/, 'Legendary content must not fall back to an in-memory shadow library');

  const workPage = read('frontend/src/work/LegendaryWorkPage.tsx');
  const workApi = read('backend/src/work-api.ts');
  assert.match(workPage, /@inneranimalmedia\/agentsam-work\/frontend/);
  assert.match(workPage, /createHttpWorkHost/);
  assert.match(workPage, /presentation="embedded"/);
  assert.match(workPage, /<AppShell/);
  const workTheme = read('frontend/src/work/legendaryWork.css');
  assert.match(workTheme, /--agentsam-work-accent:\s*var\(--los-accent\)/);
  assert.match(workTheme, /--agentsam-work-panel:\s*var\(--los-surface\)/);
  assert.match(workApi, /FROM media_assets/);
  assert.match(workApi, /fixtureName: 'legendary-live'/);
  assert.match(workApi, /tickets: \[\]/);
  assert.match(workApi, /projects: \[\]/);
  assert.doesNotMatch(workApi, /populatedWorkFixture|createFixtureWorkHost/);
});

test('packaged CMS compatibility endpoints project existing authorities only', () => {
  const api = read('backend/src/cms-api.ts');

  assert.match(api, /\/api\/cms\/bootstrap/);
  assert.match(api, /\/api\/cms\/activity/);
  assert.match(api, /FROM media_assets/);
  assert.match(api, /FROM cms_revisions/);

  const mediaApi = read('backend/src/media/routes/media-api.ts');
  const mediaStore = read('backend/src/media/adapters/d1-media-store.ts');
  assert.match(mediaApi, /usagesByAsset/);
  assert.match(mediaApi, /nextOffset/);
  assert.match(mediaStore, /LIMIT \? OFFSET \?/);
  assert.match(mediaStore, /listUsagesForAssets/);

  const addedBlock = api.slice(api.indexOf("'/api/cms/bootstrap'"), api.indexOf("'/api/cms/section-schemas'"));
  assert.doesNotMatch(addedBlock, /CREATE TABLE|INSERT INTO|UPDATE .* SET|DELETE FROM/i,
    'hub compatibility routes must remain read models over existing Legendary state');
});

test('public site renderer remains independent from authenticated packaged dashboard code', () => {
  const main = read('frontend/src/main.tsx');
  assert.match(main, /lazy\(\(\) => import\('\.\/cms\/LegendaryCmsApp'\)/);
  assert.match(main, /lazy\(\(\) => import\('\.\/content\/ContentStudioPage'\)/);
  assert.match(main, /lazy\(\(\) => import\('\.\/work\/LegendaryWorkPage'\)/);
  assert.match(main, /<PublicCmsPage siteKey="site_contractors" route="\/" \/>/);
  assert.match(main, /<PublicCmsPage siteKey="site_scapes"/);

  const gate = read('backend/src/identity/require-dashboard-session.ts');
  assert.match(gate, /return null/);

  const publicPage = read('frontend/src/site/PublicCmsPage.tsx');
  assert.doesNotMatch(publicPage, /ecommerce-cms-agentsam|agentsam-content-studio/,
    'public visitors must not pull authenticated CMS/admin packages into the public renderer');
});

test('Legendary runtime authentication is intentionally disabled', () => {
  const gate = read('backend/src/identity/require-dashboard-session.ts');
  const identity = read('backend/src/identity/handle-identity-request.ts');
  const cmsAuth = read('backend/src/auth/cms-route-auth.ts');
  const sessionHook = read('frontend/src/auth/useSessionUser.ts');
  const wrangler = read('wrangler.jsonc');
  const main = read('frontend/src/main.tsx');

  assert.match(gate, /return null/);
  assert.match(identity, /auth_disabled/);
  assert.match(identity, /dashboard\/cms/);
  assert.match(cmsAuth, /CMS_AUTH_MODE === 'disabled'/);
  assert.match(wrangler, /"CMS_AUTH_MODE": "disabled"/);
  assert.doesNotMatch(sessionHook, /fetchSessionUser/);
  assert.doesNotMatch(main, /AccountPage/);
});
