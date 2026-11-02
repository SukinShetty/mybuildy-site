import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

// Replace only the database boundary; execute the real route and validator.
const mockUrl = 'data:text/javascript,' + encodeURIComponent(`export const SIGNUPS_TABLE = 'signups'; export const getSupabase = () => globalThis.__signupDb;`);
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/supabase') return { url: mockUrl, shortCircuit: true };
  if (specifier === '@/lib/signup') return { url: new URL('../lib/signup.ts', import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { POST } = await import('../app/api/signup/route.ts');
const payload = { name: 'Test', email: 'test@example.com', build: ['A website or landing page'], agents: ['Claude Code'], self: "I'm a developer", platform: 'windows' };
const uuid = '95e5c16f-7d94-49e1-81c1-767b5e0955cd';
let client = 0;
function request({ body = JSON.stringify(payload), key = uuid, ip = `192.0.2.${++client}`, type = 'application/json' } = {}) {
  return new Request('http://localhost/api/signup', { method: 'POST', headers: { 'content-type': type, 'idempotency-key': key, 'x-forwarded-for': ip }, body });
}
test('successful retry uses existing UUID key and ignoreDuplicates, preserving original row', async () => {
  const rows = new Map();
  globalThis.__signupDb = { from(table) {
    assert.equal(table, 'signups');
    return { async upsert(row, options) {
      assert.deepEqual(options, { onConflict: 'id', ignoreDuplicates: true });
      if (!rows.has(row.id)) rows.set(row.id, row);
      return { error: null };
    } };
  } };
  assert.equal((await POST(request())).status, 201);
  assert.equal((await POST(request())).status, 201);
  assert.equal(rows.size, 1);
  assert.equal(rows.get(uuid).email, payload.email);
  assert.deepEqual(Object.keys(rows.get(uuid)).sort(), ['id', 'name', 'email', 'platform', 'building', 'agents', 'skill_level'].sort());
});
test('missing database, database error and thrown database error never return 201', async () => {
  globalThis.__signupDb = null;
  assert.equal((await POST(request())).status, 202);
  globalThis.__signupDb = { from: () => ({ upsert: async () => ({ error: { code: 'TEST' } }) }) };
  assert.equal((await POST(request())).status, 202);
  globalThis.__signupDb = { from: () => ({ upsert: async () => { throw new Error('private error'); } }) };
  assert.equal((await POST(request())).status, 202);
});
test('old clients without idempotency header still insert', async () => {
  let count = 0;
  globalThis.__signupDb = { from: () => ({ insert: async row => { count++; assert.equal(row.id, undefined); return { error: null }; } }) };
  assert.equal((await POST(request({ key: '' }))).status, 201);
  assert.equal(count, 1);
});
test('invalid types, payloads and idempotency keys are rejected before storage', async () => {
  globalThis.__signupDb = { from() { throw new Error('must not access database'); } };
  assert.equal((await POST(request({ type: 'text/plain' }))).status, 415);
  assert.equal((await POST(request({ body: '{' }))).status, 400);
  assert.equal((await POST(request({ body: '{}' }))).status, 400);
  assert.equal((await POST(request({ key: 'not-a-uuid' }))).status, 400);
  assert.equal((await POST(request({ body: JSON.stringify({ ...payload, unexpected: 'value' }) }))).status, 400);
  assert.equal((await POST(request({ body: 'a'.repeat(4097) }))).status, 413);
});
test('rate limiter allows five attempts and rejects the sixth', async () => {
  globalThis.__signupDb = null;
  for (let i = 0; i < 5; i++) assert.equal((await POST(request({ ip: '198.51.100.1' }))).status, 202);
  assert.equal((await POST(request({ ip: '198.51.100.1' }))).status, 429);
});
