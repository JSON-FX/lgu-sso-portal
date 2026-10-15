/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync } = require('node:fs');
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

const source = ts.transpileModule(readFileSync('app/api/sso-backend/[...path]/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

function handler(fetch, overrides = {}) {
  const exports = {};
  vm.runInNewContext(source, {
    exports, require, URL, Headers, Response, AbortSignal, Set, Uint8Array, RangeError,
    fetch,
    process: { env: {
      NODE_ENV: 'production', SSO_API_URL: 'http://backend/api/v1',
      SSO_PORTAL_ORIGIN: 'https://portal.example', SSO_LEGACY_COOKIE_DOMAIN: '.example',
      SSO_TRUST_PROXY_HEADERS: 'true', ...overrides,
    } },
  });
  return exports;
}
function request(path, { method = 'POST', origin = 'https://portal.example', cookie = '', headers = {}, body = {} } = {}) {
  const requestHeaders = { 'Content-Type': 'application/json', ...headers };
  if (origin !== null) requestHeaders.Origin = origin;
  if (cookie) requestHeaders.Cookie = cookie;
  return new NextRequest('https://portal.example/api/sso-backend/' + path, {
    method, headers: requestHeaders, ...(['GET', 'HEAD'].includes(method) ? {} : { body: JSON.stringify(body) }),
  });
}
function context(path) { return { params: Promise.resolve({ path: path.split('/') }) }; }

test('login hides bearer, sets a host-only HttpOnly cookie, and expires legacy shared cookies', async () => {
  const routes = handler(async () => Response.json({ access_token: 'central-secret', token_type: 'bearer', expires_in: 120 }, {
    headers: { 'Set-Cookie': 'lgu_sso_token=central-secret; Domain=.example; HttpOnly; Secure' },
  }));
  const result = await routes.POST(request('auth/login'), context('auth/login'));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).access_token, undefined);
  const cookies = result.headers.getSetCookie();
  const session = cookies.find(value => value.startsWith('__Host-portal_session='));
  assert.match(session, /HttpOnly/); assert.match(session, /Secure/); assert.match(session, /SameSite=lax/i);
  assert.match(session, /Max-Age=120/); assert.doesNotMatch(session, /Domain=/);
  assert.ok(cookies.some(value => value.startsWith('lgu_sso_token=;') && value.includes('Domain=.example')));
  assert.ok(!cookies.some(value => value.includes('lgu_sso_token=central-secret')));
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('forwards only the central host cookie and ingress client IP to the backend', async () => {
  let seen;
  const routes = handler(async (url, init) => { seen = { url: String(url), init }; return Response.json({ data: {} }); });
  await routes.GET(request('auth/me', { method: 'GET', cookie: '__Host-portal_session=central; portal_session=legacy; lgu_sso_token=shared', headers: { 'x-forwarded-for': 'untrusted, 192.0.2.10' } }), context('auth/me'));
  assert.equal(seen.url, 'http://backend/api/v1/auth/me');
  assert.equal(seen.init.headers.get('Authorization'), 'Bearer central');
  assert.equal(seen.init.headers.get('Cookie'), null);
  assert.equal(seen.init.headers.get('X-Forwarded-For'), '192.0.2.10');
  assert.equal(seen.init.cache, 'no-store');
  assert.equal(seen.init.redirect, 'error');
});

test('denies cross-origin and missing-origin writes even with spoofed forwarded host', async () => {
  let called = false;
  const routes = handler(async () => { called = true; return Response.json({}); });
  for (const origin of ['https://attacker.example', null]) {
    const result = await routes.POST(request('auth/login', { origin, headers: { 'x-forwarded-host': 'attacker.example' } }), context('auth/login'));
    assert.equal(result.status, 403);
  }
  assert.equal(called, false);
});

test('does not expose consumer exchange or cookie endpoints through the portal proxy', async () => {
  const routes = handler(async () => { throw Error('must not fetch'); });
  for (const path of ['sso/exchange', 'sso/check', 'sso/authorize', 'sso/validate', 'auth/register', 'employees/../auth']) {
    assert.equal((await routes.POST(request(path), context(path))).status, 404);
  }
});

test('backend outage returns 503 and preserves the session cookie for retry', async () => {
  const routes = handler(async () => { throw Error('connection failed'); });
  for (const path of ['auth/me', 'auth/logout', 'auth/logout-all']) {
    const result = await routes.POST(request(path, { cookie: '__Host-portal_session=central' }), context(path));
    assert.equal(result.status, 503);
    assert.match((await result.json()).message, /temporarily unavailable/);
    assert.equal(result.headers.getSetCookie().length, 0);
  }
});

test('both logout actions clear the portal cookie after success, while denied auth clears stale cookies', async () => {
  const routes = handler(async () => Response.json({ message: 'Signed out.' }));
  for (const path of ['auth/logout', 'auth/logout-all']) {
    const result = await routes.POST(request(path, { cookie: '__Host-portal_session=central' }), context(path));
    assert.ok(result.headers.getSetCookie().some(value => value.startsWith('__Host-portal_session=;') && value.includes('Max-Age=0')));
  }
  const denied = handler(async () => Response.json({ message: 'Unauthenticated.' }, { status: 401 }));
  const result = await denied.GET(request('portal/profile', { method: 'GET', cookie: '__Host-portal_session=central' }), context('portal/profile'));
  assert.equal(result.status, 401);
  assert.ok(result.headers.getSetCookie().some(value => value.startsWith('__Host-portal_session=;')));
});

test('preserves rate-limit retry information and accepts empty 204 responses', async () => {
  const limited = handler(async () => Response.json({ message: 'Too many attempts.' }, { status: 429, headers: { 'Retry-After': '900' } }));
  assert.equal((await limited.POST(request('auth/login'), context('auth/login'))).headers.get('retry-after'), '900');
  const empty = handler(async () => new Response(null, { status: 204 }));
  assert.equal((await empty.DELETE(request('employees/example', { method: 'DELETE' }), context('employees/example'))).status, 204);
});


test('office writes preserve payloads and validation responses through the central cookie proxy', async () => {
  for (const [path, method, body] of [
    ['offices', 'POST', { name: 'Community Office', abbreviation: 'CO' }],
    ['offices/12', 'PUT', { name: 'Community Services Office', abbreviation: 'CSO' }],
    ['offices/12', 'PUT', { is_active: false }],
    ['offices/12', 'PUT', { is_active: true }],
  ]) {
    let seen;
    const errors = { message: 'Invalid office.', errors: { abbreviation: ['Already used.'] } };
    const routes = handler(async (url, init) => {
      seen = { url: String(url), init };
      return Response.json(errors, { status: 422 });
    });
    const result = await routes[method](request(path, { method, body, cookie: '__Host-portal_session=central', headers: { Authorization: 'Bearer attacker' } }), context(path));
    assert.equal(seen.url, 'http://backend/api/v1/' + path);
    assert.equal(seen.init.method, method);
    assert.deepEqual(JSON.parse(new TextDecoder().decode(seen.init.body)), body);
    assert.equal(seen.init.headers.get('Authorization'), 'Bearer central');
    assert.equal(result.status, 422);
    assert.deepEqual(await result.json(), errors);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
  }
});

test('office management list forwards include_inactive and blocks cross-origin writes', async () => {
  let seen;
  const routes = handler(async (url) => { seen = String(url); return Response.json({ data: [] }); });
  await routes.GET(request('offices?include_inactive=1', { method: 'GET' }), context('offices'));
  assert.equal(seen, 'http://backend/api/v1/offices?include_inactive=1');
  seen = null;
  for (const [path, method] of [['offices', 'POST'], ['offices/12', 'PUT']]) {
    for (const origin of [null, 'https://attacker.example']) {
      const result = await routes[method](request(path, { method, origin }), context(path));
      assert.equal(result.status, 403);
    }
  }
  assert.equal(seen, null);
});

test('position management uses the central cookie and enforces the same write origin boundary', async () => {
  for (const [path, method, body] of [
    ['positions', 'POST', { title: 'Planning Officer I' }],
    ['positions/12', 'PUT', { title: 'Planning Officer II' }],
    ['positions/12', 'PUT', { is_active: false }],
    ['positions/12', 'PUT', { is_active: true }],
  ]) {
    let seen;
    const routes = handler(async (url, init) => {
      seen = { url: String(url), init };
      return Response.json({ data: { id: 12, title: 'Planning Officer I', is_active: true } });
    });
    const response = await routes[method](request(path, { method, body, cookie: '__Host-portal_session=central', headers: { Authorization: 'Bearer attacker' } }), context(path));
    assert.equal(response.status, 200);
    assert.equal(seen.url, 'http://backend/api/v1/' + path);
    assert.deepEqual(JSON.parse(new TextDecoder().decode(seen.init.body)), body);
    assert.equal(seen.init.headers.get('Authorization'), 'Bearer central');
  }
  let seen;
  const routes = handler(async (url) => { seen = String(url); return Response.json({ data: [] }); });
  await routes.GET(request('positions?include_inactive=1', { method: 'GET' }), context('positions'));
  assert.equal(seen, 'http://backend/api/v1/positions?include_inactive=1');
  seen = null;
  for (const [path, method] of [['positions', 'POST'], ['positions/12', 'PUT']]) {
    for (const origin of [null, 'https://attacker.example']) {
      const response = await routes[method](request(path, { method, origin }), context(path));
      assert.equal(response.status, 403);
    }
  }
  assert.equal(seen, null);
});

test('photo upload preserves multipart binary bytes and central-cookie authorization', async () => {
  const bytes = new Uint8Array([0, 255, 128, 13, 10, 42]);
  let seen;
  const routes = handler(async (url, init) => { seen = init; return Response.json({ data: { avatar_version: 'new' } }); });
  const req = new NextRequest('https://portal.example/api/sso-backend/portal/profile/avatar', {
    method: 'POST', headers: { Origin: 'https://portal.example', 'Content-Type': 'multipart/form-data; boundary=example', Cookie: '__Host-portal_session=central' }, body: bytes,
  });
  assert.equal((await routes.POST(req, context('portal/profile/avatar'))).status, 200);
  assert.deepEqual([...seen.body], [...bytes]);
  assert.equal(seen.headers.get('Content-Type'), 'multipart/form-data; boundary=example');
  assert.equal(seen.headers.get('Authorization'), 'Bearer central');
});

test('photo proxy returns exact private image bytes and bounds uploads', async () => {
  const bytes = new Uint8Array([82, 73, 70, 70, 0, 255, 128]);
  const routes = handler(async () => new Response(bytes, { headers: { 'Content-Type': 'image/webp' } }));
  const image = await routes.GET(request('portal/profile/avatar', { method: 'GET' }), context('portal/profile/avatar'));
  assert.deepEqual([...new Uint8Array(await image.arrayBuffer())], [...bytes]);
  assert.equal(image.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(image.headers.get('X-Content-Type-Options'), 'nosniff');
  let fetched = false;
  const limited = handler(async () => { fetched = true; return Response.json({}); });
  const req = new NextRequest('https://portal.example/api/sso-backend/portal/profile/avatar', {
    method: 'POST', headers: { Origin: 'https://portal.example' }, body: new Uint8Array(6 * 1024 * 1024 + 1),
  });
  assert.equal((await limited.POST(req, context('portal/profile/avatar'))).status, 413);
  assert.equal(fetched, false);
});
