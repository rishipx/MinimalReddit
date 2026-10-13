import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { toFirefoxManifest } from '../scripts/firefox-manifest.mjs';

const chrome = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));

test('Firefox manifest uses background scripts, not a service worker', () => {
  const ff = toFirefoxManifest(chrome);
  assert.deepEqual(ff.background.scripts, [chrome.background.service_worker]);
  assert.equal(ff.background.service_worker, undefined);
});

test('Firefox manifest declares Gecko id and data collection, drops Chrome-only keys', () => {
  const ff = toFirefoxManifest(chrome);
  assert.match(ff.browser_specific_settings.gecko.id, /^[^@\s]+@[^@\s]+$/);
  assert.ok(ff.browser_specific_settings.gecko.data_collection_permissions.required.length > 0);
  assert.equal(ff.minimum_chrome_version, undefined);
});

test('Firefox transform does not mutate the Chrome manifest', () => {
  const before = JSON.stringify(chrome);
  toFirefoxManifest(chrome);
  assert.equal(JSON.stringify(chrome), before);
});

test('Chrome manifest keeps service worker and minimum version', () => {
  assert.ok(chrome.background.service_worker);
  assert.ok(chrome.minimum_chrome_version);
});
