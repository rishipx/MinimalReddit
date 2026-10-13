import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadScripts, readSource } from './helpers/load-script.js';

const manifest = JSON.parse(readSource('manifest.json'));
const contentFiles = manifest.content_scripts[0].js;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    statSync(full).isDirectory() ? walk(full, out) : out.push(full);
  }
  return out;
}
const srcFiles = walk('src').map((f) => f.split(path.sep).join('/'));
const jsFiles = srcFiles.filter((f) => f.endsWith('.js'));

test('content scripts share one global scope: no duplicate top-level const/let/class names', () => {
  const seen = new Map();
  const dupes = [];
  for (const file of contentFiles) {
    for (const m of readSource(file).matchAll(/^(?:const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (seen.has(m[1])) dupes.push(`${m[1]} in ${seen.get(m[1])} and ${file}`);
      else seen.set(m[1], file);
    }
  }
  assert.deepEqual(dupes, []);
});

test('on-demand tool scripts do not collide with the always-loaded content scripts', () => {
  const loaded = new Set();
  for (const file of contentFiles) for (const m of readSource(file).matchAll(/^(?:const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) loaded.add(m[1]);
  const clashes = [];
  for (const file of jsFiles.filter((f) => f.startsWith('src/content/on-demand/'))) {
    for (const m of readSource(file).matchAll(/^(?:const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) if (loaded.has(m[1])) clashes.push(`${m[1]} in ${file}`);
  }
  assert.deepEqual(clashes, []);
});

test('every content script file is listed in the manifest and every listed file exists', () => {
  const listed = new Set(contentFiles);
  const onDemand = new Set(jsFiles.filter((f) => f.startsWith('src/content/on-demand/')));
  const unlisted = jsFiles.filter((f) => f.startsWith('src/content/') || f.startsWith('src/shared/'))
    .filter((f) => !listed.has(f) && !onDemand.has(f));
  assert.deepEqual(unlisted, []);
  for (const f of listed) assert.ok(srcFiles.includes(f), `missing ${f}`);
});

test('content scripts load in manifest order without throwing', () => {
  const stub = new Proxy(function () {}, {
    get: (_, prop) => (prop === Symbol.toPrimitive ? () => '' : stub),
    apply: () => stub,
    construct: () => stub
  });
  const ctx = loadScripts([], {
    chrome: stub, document: stub, navigator: { language: 'en' }, Node: { ELEMENT_NODE: 1 },
    MutationObserver: class { observe() {} disconnect() {} }, CSSStyleSheet: class {},
    requestAnimationFrame: () => 0, setTimeout, clearTimeout, sessionStorage: stub, localStorage: stub,
    getComputedStyle: () => stub, matchMedia: () => stub, location: { href: 'https://www.reddit.com/', pathname: '/' },
    addEventListener() {}, removeEventListener() {}, HTMLElement: class {}, Element: class {}, ShadowRoot: class {}
  });
  // main.js starts the engine against a live DOM, so only the definition files run here.
  const files = contentFiles.filter((f) => f !== 'src/content/main.js');
  for (const file of files) {
    assert.doesNotThrow(() => vm.runInContext(readSource(file), ctx, { filename: file }), file);
  }
});

test('every setting the content scripts read exists in the defaults', () => {
  const ctx = loadScripts(['src/shared/defaults.js']);
  const keys = new Set(Object.keys(ctx.MRX_DEFAULTS));
  const missing = new Set();
  for (const file of jsFiles.filter((f) => f.startsWith('src/content/') && !f.includes('/styles/'))) {
    for (const m of readSource(file).matchAll(/\bsettings\.([A-Za-z_]\w*)/g)) {
      if (!keys.has(m[1])) missing.add(`${m[1]} (${file})`);
    }
  }
  assert.deepEqual([...missing], []);
});

test('every id the popup scripts look up exists in popup.html', () => {
  const html = readSource('src/popup/popup.html');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const missing = new Set();
  for (const file of jsFiles.filter((f) => f.startsWith('src/popup/'))) {
    for (const m of readSource(file).matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)) if (!ids.has(m[1])) missing.add(`${m[1]} (${file})`);
  }
  assert.deepEqual([...missing], []);
});

test('every icon the code or markup asks for exists in the icon set', () => {
  const defined = new Set([...readSource('src/shared/icons.js').matchAll(/^\s*"([a-z0-9-]+)":/gm)].map((m) => m[1]));
  const used = new Set();
  for (const file of srcFiles.filter((f) => /\.(js|html)$/.test(f) && f !== 'src/shared/icons.js')) {
    const text = readSource(file);
    for (const m of text.matchAll(/MRXIcons\.(?:el|svg)\(\s*'([a-z0-9-]+)'/g)) used.add(m[1]);
    for (const m of text.matchAll(/data-icon="([a-z0-9-]+)"/g)) used.add(m[1]);
  }
  assert.deepEqual([...used].filter((n) => !defined.has(n)), []);
});

test('theme presets: default first, unique ids, valid colours, no external CSS loads', () => {
  const { MRX_THEME_PRESETS: presets } = loadScripts(['src/shared/themes.js']);
  assert.equal(presets[0].id, 'default');
  assert.deepEqual(Object.keys(presets[0].tokens), []);
  assert.equal(new Set(presets.map((p) => p.id)).size, presets.length);
  for (const preset of presets.slice(1)) {
    for (const key of ['page', 'surface', 'text', 'accent']) assert.match(preset.tokens[key] || '', /^#[0-9a-f]{3,8}$/i, `${preset.id}.${key}`);
    assert.doesNotMatch(preset.css, /@import|url\(\s*['"]?https?:|<\/?style/i, preset.id);
  }
});

// crop.js assigns innerHTML from a constant template with no interpolation; guard that it stays constant.
test('crop toolbar innerHTML template stays free of interpolation', () => {
  const m = readSource('src/content/on-demand/crop.js').match(/toolbar\.innerHTML = `([\s\S]*?)`;/);
  assert.ok(m);
  assert.doesNotMatch(m[1], /\$\{/);
});

test('no dynamic code execution or HTML string injection in extension code', () => {
  const offenders = [];
  for (const file of jsFiles.filter((f) => f !== 'src/content/on-demand/crop.js')) {
    const code = readSource(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    if (/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(|new Function\s*\(/.test(code)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('manifest permissions match what the code actually uses', () => {
  const code = jsFiles.map(readSource).join('\n');
  const usage = { storage: /\.storage\./, scripting: /\.scripting\./, contextMenus: /\.contextMenus\./, downloads: /\.downloads\./ };
  for (const permission of manifest.permissions) {
    if (permission === 'unlimitedStorage') continue;
    assert.match(code, usage[permission], `${permission} is declared but never used`);
  }
  for (const [permission, pattern] of Object.entries(usage)) {
    if (pattern.test(code)) assert.ok(manifest.permissions.includes(permission), `${permission} is used but not declared`);
  }
});
