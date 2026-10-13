import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanLink, isAllowedMediaUrl, sanitizeDownloadFilename } from '../src/background/url-policy.js';

test('media URL policy only accepts HTTPS Reddit hosts', () => {
  assert.equal(isAllowedMediaUrl('https://i.redd.it/image.jpg'), true);
  assert.equal(isAllowedMediaUrl('https://v.redd.it/video'), true);
  assert.equal(isAllowedMediaUrl('http://i.redd.it/image.jpg'), false);
  assert.equal(isAllowedMediaUrl('https://reddit.com.evil.example/image.jpg'), false);
  assert.equal(isAllowedMediaUrl('javascript:alert(1)'), false);
});

test('download filename is safe and has a fallback', () => {
  assert.equal(sanitizeDownloadFilename('  '), 'reddit-media');
  assert.equal(sanitizeDownloadFilename('../foo\\bar?.jpg'), '-foo-bar-.jpg');
  assert.equal(sanitizeDownloadFilename('normal.jpg'), 'normal.jpg');
});

test('clean links remove tracking parameters but preserve useful parameters', () => {
  const result = new URL(cleanLink('https://www.reddit.com/r/test/?utm_source=x&context=3&sort=top'));
  assert.equal(result.searchParams.has('utm_source'), false);
  assert.equal(result.searchParams.has('context'), false);
  assert.equal(result.searchParams.get('sort'), 'top');
});
