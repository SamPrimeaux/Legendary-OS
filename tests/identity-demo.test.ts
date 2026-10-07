import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { legendaryIdentityRoutes } from '../backend/src/identity/app-config';
import { isWorkspacePath, requireDashboardSession } from '../backend/src/identity/require-dashboard-session';
import { handleIdentityRequest } from '../backend/src/identity/handle-identity-request';
import { publicSiteRoute, serializeBootstrap } from '../backend/src/public-page-bootstrap';

function database(beforeUpgrade?: (sqlite: DatabaseSync) => void) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  const dir = new URL('../migrations/', import.meta.url);
  for (const file of readdirSync(dir).filter(file => file.endsWith('.sql')).sort()) {
    if (file.startsWith('0005')) beforeUpgrade?.(sqlite);
    sqlite.exec(readFileSync(new URL(file, dir), 'utf8'));
  }
  return {
    sqlite,
    DB: {
      prepare(sql: string) {
        const stmt = sqlite.prepare(sql);
        let values: any[] = [];
        return {
          bind(...input: any[]) { values = input; return this; },
          async first() { return stmt.get(...values) || null; },
          async all() { return { results: stmt.all(...values) }; },
          async run() { return stmt.run(...values); },
        };
      },
    },
  };
}

test('SDK route projection accepts business workspaces and rejects external destinations', () => {
  assert.equal(legendaryIdentityRoutes.resolve('legendary-os', 'identity.login'), '/auth/login');
  for (const value of ['/dashboard/cms?site=site_scapes', '/media/asset_x', '/projects/job_x']) {
    assert.equal(legendaryIdentityRoutes.resolveReturnTo({ appId: 'legendary-os', value }), value);
  }
  for (const value of ['https://example.com', '//example.com', '/scapes', '/unowned']) {
    assert.equal(legendaryIdentityRoutes.resolveReturnTo({ appId: 'legendary-os', value }), null);
  }
});

test('every workspace mount redirects anonymous visitors to the portal with its return path', async () => {
  const { sqlite, DB } = database();
  try {
    for (const path of ['/dashboard/cms?site=site_scapes', '/media', '/leads', '/projects/123', '/team', '/cms']) {
      const response = await requireDashboardSession(new Request(`https://legendary.example${path}`), { DB } as any);
      assert.equal(response?.status, 302);
      assert.equal(new URL(response!.headers.get('location')!).pathname, '/auth/login');
      assert.equal(new URL(response!.headers.get('location')!).searchParams.get('next'), path);
    }
    for (const path of ['/', '/scapes/', '/auth/login', '/dashboard-public']) assert.equal(isWorkspacePath(path), false);
  } finally { sqlite.close(); }
});

test('updated SDK completes password signup, login, session gate, and logout on migrated schema', async () => {
  const { sqlite, DB } = database();
  const cache = new Map<string, string>();
  const env = { DB, CMS_CACHE: {
    async get(key: string) { return cache.get(key) ?? null; },
    async put(key: string, value: string) { cache.set(key, value); },
    async delete(key: string) { cache.delete(key); },
  } } as any;
  const post = (path: string, body: unknown, cookie = '') => new Request(`https://legendary.example${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body),
  });
  try {
    const credentials = { email: 'demo-fixture@example.test', password: 'Demo-fixture-password-123!', displayName: 'Demo Fixture' };
    const signup = await handleIdentityRequest(post('/api/auth/signup', credentials), env);
    assert.equal(signup?.status, 200);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS total FROM accounts').get()?.total, 1);
    const login = await handleIdentityRequest(post('/api/auth/login', { ...credentials, next: '/dashboard/cms?site=site_scapes' }), env);
    assert.equal(login?.status, 200);
    const result = await login!.json() as any;
    assert.equal(result.redirect, '/dashboard/cms?site=site_scapes');
    const cookie = login!.headers.get('set-cookie')!.split(';')[0];
    const authenticated = new Request('https://legendary.example/dashboard/cms', { headers: { cookie } });
    assert.equal(await requireDashboardSession(authenticated, env), null);
    const me = await handleIdentityRequest(new Request('https://legendary.example/api/auth/me', { headers: { cookie } }), env);
    assert.equal(me?.status, 200);
    const logout = await handleIdentityRequest(post('/api/auth/logout', {}, cookie), env);
    assert.equal(logout?.status, 200);
    assert.equal((await requireDashboardSession(authenticated, env))?.status, 302);
  } finally { sqlite.close(); }
});

test('public bootstrap preserves two demo mounts and safely embeds CMS content', () => {
  assert.deepEqual(publicSiteRoute('/scapes/contact'), { siteKey: 'site_scapes', route: '/contact' });
  assert.deepEqual(publicSiteRoute('/site/site_scapes/services'), { siteKey: 'site_scapes', route: '/services' });
  assert.deepEqual(publicSiteRoute('/contact'), { siteKey: 'site_contractors', route: '/contact' });
  for (const path of ['/dashboard/cms', '/auth/login', '/assets/index.js', '/brand/legendary-mark.svg']) assert.equal(publicSiteRoute(path), null);
  const data = { heading: '</script><script>alert(1)</script>' };
  const encoded = serializeBootstrap(data);
  assert.equal(encoded.includes('</script>'), false);
  assert.deepEqual(JSON.parse(encoded), data);
});

test('identity upgrade preserves an existing user and browser session', async () => {
  const { sqlite, DB } = database(db => {
    db.exec(`INSERT INTO auth_users(id,email,display_name,password_hash,salt,status,created_at,updated_at)
      VALUES('existing-user','existing@example.test','Existing User','original-hash','original-salt','active',1,1);
      INSERT INTO auth_sessions(id,user_id,email,expires_at,created_at)
      VALUES('existing-session','existing-user','existing@example.test',unixepoch()+3600,1);`);
  });
  try {
    assert.equal(sqlite.prepare('SELECT id FROM accounts').get()?.id, 'existing-user');
    assert.equal(sqlite.prepare('SELECT password_hash FROM auth_users').get()?.password_hash, 'original-hash');
    const request = new Request('https://legendary.example/dashboard/cms', { headers: { cookie: 'session=existing-session' } });
    assert.equal(await requireDashboardSession(request, { DB } as any), null);
  } finally { sqlite.close(); }
});
