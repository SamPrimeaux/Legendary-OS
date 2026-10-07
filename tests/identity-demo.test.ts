import assert from 'node:assert/strict';
import test from 'node:test';
import { isWorkspacePath, requireDashboardSession } from '../backend/src/identity/require-dashboard-session';
import { handleIdentityRequest } from '../backend/src/identity/handle-identity-request';
import { publicSiteRoute, serializeBootstrap } from '../backend/src/public-page-bootstrap';

test('Legendary workspaces are open while authentication is disabled', async () => {
  for (const path of [
    '/dashboard/cms?site=site_scapes',
    '/media',
    '/content',
    '/collaborate',
    '/projects/123',
    '/mail',
    '/artifacts',
    '/team',
    '/cms',
  ]) {
    const response = await requireDashboardSession(
      new Request(`https://legendary.example${path}`),
      {} as any,
    );
    assert.equal(response, null, path);
    assert.equal(isWorkspacePath(path), false, path);
  }
});

test('Legendary auth and OAuth endpoints are disabled instead of gating the build', async () => {
  for (const [method, path] of [
    ['POST', '/api/auth/login'],
    ['POST', '/api/auth/signup'],
    ['POST', '/api/auth/password-reset/request'],
    ['POST', '/api/auth/password'],
    ['GET', '/api/auth/me'],
    ['GET', '/api/oauth/iam/start'],
  ] as const) {
    const response = await handleIdentityRequest(
      new Request(`https://legendary.example${path}`, { method }),
      {} as any,
    );
    assert.equal(response?.status, 410, `${method} ${path}`);
    assert.equal((await response!.json() as { error?: string }).error, 'auth_disabled');
  }

  for (const path of ['/auth/login', '/auth/signup', '/auth/reset']) {
    const response = await handleIdentityRequest(
      new Request(`https://legendary.example${path}`),
      {} as any,
    );
    assert.equal(response?.status, 302);
    assert.equal(new URL(response!.headers.get('location')!).pathname, '/dashboard/cms');
  }
});

test('public bootstrap preserves the two Legendary site mounts', () => {
  assert.deepEqual(publicSiteRoute('/scapes/contact'), { siteKey: 'site_scapes', route: '/contact' });
  assert.deepEqual(publicSiteRoute('/site/site_scapes/services'), { siteKey: 'site_scapes', route: '/services' });
  assert.deepEqual(publicSiteRoute('/contact'), { siteKey: 'site_contractors', route: '/contact' });
  for (const path of ['/dashboard/cms', '/auth/login', '/assets/index.js', '/brand/legendary-mark.svg']) {
    assert.equal(publicSiteRoute(path), null);
  }
  const data = { heading: '</script><script>alert(1)</script>' };
  const encoded = serializeBootstrap(data);
  assert.equal(encoded.includes('</script>'), false);
  assert.deepEqual(JSON.parse(encoded), data);
});
