import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts } from './helpers/load-script.js';

const { MRXBlocker } = loadScripts(['src/content/features/blocking/content-blocker.js']);
const { isSafeRegexSource, compilePatterns } = MRXBlocker;

test('regex safety rejects catastrophic-backtracking shapes', () => {
  for (const src of ['(a+)+', '(a|a)*', '(.*a){5,}', '(a*)*b', '(\\w+\\s?)+$', '(a)\\1']) {
    assert.equal(isSafeRegexSource(src), false, src);
  }
});

test('regex safety rejects oversized and over-quantified sources', () => {
  assert.equal(isSafeRegexSource('a'.repeat(201)), false);
  assert.equal(isSafeRegexSource('a+b+c+d+e+f+g+h+i+'), false);
});

test('regex safety accepts ordinary patterns', () => {
  for (const src of ['foo', 'foo|bar', '^crypto\\w*$', '[a-z]+\\d{2}', 'elon\\s+musk']) {
    assert.equal(isSafeRegexSource(src), true, src);
  }
});

test('substring mode matches anywhere, case-insensitively', () => {
  const [re] = compilePatterns('Spoiler', 'substring');
  assert.ok(re.test('no SPOILERS here'));
  assert.ok(!re.test('safe'));
});

test('substring mode escapes regex metacharacters in plain entries', () => {
  const [re] = compilePatterns('a.b', 'substring');
  assert.ok(re.test('xa.by'));
  assert.ok(!re.test('axb'));
});

test('exact mode matches the whole name and ignores u/ and r/ prefixes', () => {
  const [user] = compilePatterns('u/Spez', 'exact');
  assert.ok(user.test('spez'));
  assert.ok(!user.test('spez2'));
  const [sub] = compilePatterns('/r/Funny', 'exact');
  assert.ok(sub.test('funny'));
  assert.ok(!sub.test('unfunny'));
});

test('/regex/ entries work in both modes and unsafe or invalid ones are dropped', () => {
  assert.equal(compilePatterns('/(a+)+/', 'substring').length, 0);
  assert.equal(compilePatterns('/[unclosed/', 'substring').length, 0);
  const [re] = compilePatterns('/^bot_\\d+$/', 'exact');
  assert.ok(re.test('BOT_42'));
});

test('blank lines are skipped and the g/y flags are stripped', () => {
  const patterns = compilePatterns('\n  \nfoo\n/bar/g\n', 'substring');
  assert.equal(patterns.length, 2);
  assert.ok(patterns.every((re) => !re.global && !re.sticky));
});
