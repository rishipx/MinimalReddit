import test from 'node:test';
import assert from 'node:assert/strict';
import { pickWorkingMediaUrl } from '../src/background/video-probe.js';

const reply = (status, type = 'video/mp4') => ({ ok: status >= 200 && status < 300, status, headers: { get: () => type } });
const a = 'https://v.redd.it/x/CMAF_720.mp4';
const b = 'https://v.redd.it/x/CMAF_480.mp4';

test('returns the first candidate that exists, best quality first', async () => {
  const seen = [];
  const fetchFn = async (url) => { seen.push(url); return reply(url === a ? 404 : 200); };
  assert.equal(await pickWorkingMediaUrl([a, b], fetchFn), b);
  assert.deepEqual(seen, [a, b]);
});

test('hosts outside the media allow-list are never requested', async () => {
  const seen = [];
  const fetchFn = async (url) => { seen.push(url); return reply(200); };
  assert.equal(await pickWorkingMediaUrl(['https://evil.example/x.mp4', 'http://v.redd.it/x.mp4', 42], fetchFn), null);
  assert.deepEqual(seen, []);
});

test('falls back to a one-byte ranged GET when HEAD is rejected', async () => {
  const methods = [];
  const fetchFn = async (url, init) => { methods.push(init.method); return init.method === 'HEAD' ? reply(405) : reply(206); };
  assert.equal(await pickWorkingMediaUrl([a], fetchFn), a);
  assert.deepEqual(methods, ['HEAD', 'GET']);
});

test('text responses (error pages) do not count as media', async () => {
  assert.equal(await pickWorkingMediaUrl([a], async () => reply(200, 'text/html')), null);
});

test('network errors and non-array input yield null', async () => {
  assert.equal(await pickWorkingMediaUrl([a], async () => { throw new Error('offline'); }), null);
  assert.equal(await pickWorkingMediaUrl('nope', async () => reply(200)), null);
});
