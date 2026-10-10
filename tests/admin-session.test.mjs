import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';
import { registerHooks } from 'node:module';

const mocks = {
  'server-only': 'export {};',
  'next/headers': 'export const cookies = async () => globalThis.__testCookies;',
  '@/lib/supabase': 'export const getSupabase = () => globalThis.__testDb;',
};
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier in mocks) return { url: 'data:text/javascript,' + encodeURIComponent(mocks[specifier]), shortCircuit: true };
  return nextResolve(specifier, context);
} });
const auth = await import('../lib/admin-auth.ts');
let cookie, rows, insertsFail, deletesFail, unavailable, options;
const originalNow = Date.now;
beforeEach(() => {
  process.env.ADMIN_PASSWORD = 'synthetic-test-password-only';
  cookie = undefined; rows = new Map(); insertsFail = deletesFail = unavailable = false;
  Date.now = () => 1800000000000;
  globalThis.__testCookies = {
    get: () => cookie ? { value: cookie } : undefined,
    set: (_, value, opts) => { cookie = value; options = opts; },
  };
  globalThis.__testDb = { from(table) {
    assert.equal(table, 'admin_sessions');
    if (unavailable) throw new Error('synthetic unavailable');
    return {
      async insert(row) { if (insertsFail) return { error: new Error('insert') }; rows.set(row.token_hash, row); return { error: null }; },
      select: () => ({ eq: (_, hash) => ({ maybeSingle: async () => ({ data: rows.get(hash) ?? null, error: null }) }) }),
      delete: () => ({ eq: async (_, hash) => { if (deletesFail) return { error: new Error('delete') }; rows.delete(hash); return { error: null }; } }),
    };
  } };
});
afterEach(() => { Date.now = originalNow; delete process.env.ADMIN_PASSWORD; });
test('fresh random token authenticates; only hash is stored with secure cookie flags', async () => {
  assert.equal(await auth.startSession(), true);
  const first = cookie;
  assert.equal(await auth.isAdmin(), true);
  assert.match(first, /^v2\.[A-Za-z0-9_-]{43}$/);
  assert.equal(JSON.stringify([...rows.values()]).includes(first), false);
  assert.deepEqual(options, { httpOnly: true, secure: true, sameSite: 'strict', path: '/admin', maxAge: auth.ADMIN_COOKIE_MAX_AGE });
  await auth.startSession();
  assert.notEqual(cookie, first);
});
test('server rejects token exactly at expiry even if browser still sends cookie', async () => {
  await auth.startSession();
  Date.now = () => 1800000000000 + auth.ADMIN_COOKIE_MAX_AGE * 1000;
  assert.equal(await auth.isAdmin(), false);
});
test('logout deletes shared session, so a copied cookie cannot replay', async () => {
  await auth.startSession();
  const copied = cookie;
  assert.equal(await auth.endSession(), true);
  assert.equal(rows.size, 0);
  assert.equal(cookie, '');
  cookie = copied;
  assert.equal(await auth.isAdmin(), false);
});
test('password change invalidates previous sessions without knowing their tokens', async () => {
  await auth.startSession();
  process.env.ADMIN_PASSWORD = 'different-synthetic-password';
  assert.equal(await auth.isAdmin(), false);
});
test('legacy, tampered, missing, and malformed tokens are rejected', async () => {
  assert.equal(await auth.isAdmin(), false);
  cookie = 'a'.repeat(64);
  assert.equal(await auth.isAdmin(), false);
  await auth.startSession();
  cookie = cookie.slice(0, 4) + (cookie[4] === 'a' ? 'b' : 'a') + cookie.slice(5);
  assert.equal(await auth.isAdmin(), false);
  cookie = 'v2.';
  assert.equal(await auth.isAdmin(), false);
});
test('database failure and missing config fail closed', async () => {
  await auth.startSession();
  unavailable = true;
  assert.equal(await auth.isAdmin(), false);
  assert.equal(await auth.startSession(), false);
  globalThis.__testDb = null;
  assert.equal(await auth.isAdmin(), false);
  assert.equal(await auth.startSession(), false);
});
test('failed insert never sets an authenticated cookie', async () => {
  insertsFail = true;
  assert.equal(await auth.startSession(), false);
  assert.equal(cookie, undefined);
});
test('failed logout retains cookie and reports failure instead of claiming revocation', async () => {
  await auth.startSession();
  const prior = cookie;
  deletesFail = true;
  assert.equal(await auth.endSession(), false);
  assert.equal(cookie, prior);
  assert.equal(await auth.isAdmin(), true);
});
test('missing password and corrupt expiry fail closed', async () => {
  await auth.startSession();
  [...rows.values()][0].expires_at = 'invalid';
  assert.equal(await auth.isAdmin(), false);
  delete process.env.ADMIN_PASSWORD;
  assert.equal(await auth.isAdmin(), false);
  assert.equal(await auth.startSession(), false);
});
test('independent module instances observe the same server-side revocation', async () => {
  const other = await import('../lib/admin-auth.ts?second-instance');
  await auth.startSession();
  const copied = cookie;
  assert.equal(await other.isAdmin(), true);
  await auth.endSession();
  cookie = copied;
  assert.equal(await other.isAdmin(), false);
});
