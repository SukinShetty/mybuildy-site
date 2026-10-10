import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSignupAttempt } from '../lib/signup-client.ts';

const answers = { name: 'Test', email: 'test@example.com', build: ['Website'], agents: ['Claude Code'], self: 'Beginner', platform: 'windows' };
function setup(fetcher) {
  const calls = { stored: 0, downloads: 0 };
  const attempt = createSignupAttempt(answers, {
    onStored: () => calls.stored++, onDownload: () => calls.downloads++,
  }, fetcher, '95e5c16f-7d94-49e1-81c1-767b5e0955cd');
  return { attempt, calls };
}
test('201 marks stored, downloads once, and repeated submit is a no-op', async () => {
  let requests = 0;
  const { attempt, calls } = setup(async () => { requests++; return new Response(null, { status: 201 }); });
  assert.equal(await attempt.submit(), true);
  assert.equal(await attempt.submit(), true);
  assert.deepEqual(calls, { stored: 1, downloads: 1 });
  assert.equal(requests, 1);
});
for (const status of [202, 400, 429, 503]) test(`${status} preserves download without marking signup`, async () => {
  const { attempt, calls } = setup(async () => new Response(null, { status }));
  assert.equal(await attempt.submit(), false);
  assert.deepEqual(calls, { stored: 0, downloads: 1 });
});
test('lost response can retry same immutable payload and ID without downloading again', async () => {
  const requests = [];
  const { attempt, calls } = setup(async (_, init) => {
    requests.push(init);
    if (requests.length === 1) throw new Error('network');
    return new Response(null, { status: 201 });
  });
  assert.equal(await attempt.submit(), false);
  assert.equal(await attempt.submit(), true);
  assert.equal(requests[0].body, requests[1].body);
  assert.equal(requests[0].headers['Idempotency-Key'], requests[1].headers['Idempotency-Key']);
  assert.deepEqual(calls, { stored: 1, downloads: 1 });
});
test('simultaneous clicks share one request and one download', async () => {
  let finish;
  let requests = 0;
  const { attempt, calls } = setup(() => { requests++; return new Promise(resolve => { finish = resolve; }); });
  const first = attempt.submit();
  const second = attempt.submit();
  assert.equal(first, second);
  finish(new Response(null, { status: 201 }));
  await Promise.all([first, second]);
  assert.equal(requests, 1);
  assert.deepEqual(calls, { stored: 1, downloads: 1 });
});
test('timeout aborts and still permits download without claiming success', async () => {
  const { attempt, calls } = setup((_, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  assert.equal(await attempt.submit(), false);
  assert.deepEqual(calls, { stored: 0, downloads: 1 });
});
