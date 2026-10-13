import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.chrome = { runtime: {}, storage: { session: { get: async () => ({}), set: async () => {} } } };
const { lookupArchivedComment } = await import('../src/background/archive-lookup.js');

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const comment = (body) => ({ body, author: 'someone', created_utc: 1700000000 });

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url) => { calls.push(String(url)); return handler(String(url)); };
  return calls;
}

test('returns the PullPush hit and strips the t1_ prefix from the id', async () => {
  const calls = mockFetch(() => json({ data: [comment('recovered text')] }));
  const result = await lookupArchivedComment('t1_abc123');
  assert.deepEqual([result.ok, result.source, result.body, result.author], [true, 'PullPush', 'recovered text', 'someone']);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /ids=abc123$/);
});

test('falls back to Arctic Shift when PullPush has nothing', async () => {
  mockFetch((url) => (url.includes('pullpush') ? json({ data: [] }) : json({ data: [comment('from arctic')] })));
  const result = await lookupArchivedComment('abc');
  assert.deepEqual([result.ok, result.source, result.body], [true, 'Arctic Shift', 'from arctic']);
});

test('a [removed] placeholder is not treated as recovered text', async () => {
  mockFetch(() => json({ data: [comment('[removed]')] }));
  const result = await lookupArchivedComment('abc');
  assert.deepEqual([result.ok, result.code], [false, 'not_found']);
});

test('rate limiting is reported even if the other archive reports not found', async () => {
  mockFetch((url) => (url.includes('pullpush') ? json({}, 429) : json({ data: [] })));
  const result = await lookupArchivedComment('abc');
  assert.deepEqual([result.ok, result.code], [false, 'rate_limited']);
});

test('network failure on both archives is reported as an error, not not-found', async () => {
  mockFetch(() => json({}, 500));
  const result = await lookupArchivedComment('abc');
  assert.equal(result.ok, false);
  assert.notEqual(result.code, 'not_found');
});

test('an empty id never reaches the network', async () => {
  const calls = mockFetch(() => json({ data: [] }));
  const result = await lookupArchivedComment('t1_');
  assert.deepEqual([result.ok, result.code, calls.length], [false, 'not_found', 0]);
});
