import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts } from './helpers/load-script.js';

const ctx = loadScripts(['src/content/features/timestamps.js']);
const fmt = (date, pattern) => ctx.formatTimestampCustom(date, pattern);
const at = (h, min, s = 0) => new Date(2026, 2, 5, h, min, s); // 5 March 2026, local time

test('numeric tokens are padded as documented', () => {
  assert.equal(fmt(at(9, 4, 7), 'yyyy-MM-dd hh:mm:ss'), '2026-03-05 09:04:07');
  assert.equal(fmt(at(9, 4, 7), 'd/M/yy h:m:s'), '5/3/26 9:4:7');
});

test('12-hour clock is used only when AP/ap is present', () => {
  assert.equal(fmt(at(0, 30), 'h:mm AP'), '12:30 AM');
  assert.equal(fmt(at(13, 5), 'hh:mm ap'), '01:05 pm');
  assert.equal(fmt(at(13, 5), 'hh:mm'), '13:05');
});

test('longer tokens win over their prefixes', () => {
  const d = at(10, 0);
  assert.equal(fmt(d, 'MMMM'), d.toLocaleDateString(undefined, { month: 'long' }));
  assert.equal(fmt(d, 'MM'), '03');
  assert.equal(fmt(d, 'yyyy'), '2026');
});

test('text without tokens passes through unchanged', () => {
  assert.equal(fmt(at(10, 0), '--'), '--');
});

test('timestamp attributes parse epoch milliseconds and ISO strings', () => {
  assert.equal(ctx.parseTimestampAttr(''), null);
  assert.equal(ctx.parseTimestampAttr('1700000000000').getTime(), 1700000000000);
  assert.equal(ctx.parseTimestampAttr('2024-01-02T03:04:05Z').getTime(), Date.UTC(2024, 0, 2, 3, 4, 5));
  assert.equal(ctx.parseTimestampAttr('not a date'), null);
});
