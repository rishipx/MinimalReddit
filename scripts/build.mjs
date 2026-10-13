// Builds store-ready packages: dist/minimal-reddit-chrome-v<version>.zip and dist/minimal-reddit-firefox-v<version>.zip.
// No dependencies. Usage: node scripts/build.mjs  (or: npm run build)
import { readFile, writeFile, readdir, stat, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { toFirefoxManifest } from './firefox-manifest.mjs';

const root = process.cwd();
const dist = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const version = manifest.version;

const INCLUDE = ['src', 'assets', 'LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md', 'PRIVACY.md'];

async function listFiles(rel) {
  const full = path.join(root, rel);
  const info = await stat(full);
  if (info.isFile()) return [rel];
  const out = [];
  for (const entry of (await readdir(full, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    out.push(...(await listFiles(path.posix.join(rel.split(path.sep).join('/'), entry.name))));
  }
  return out;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function zip(entries) { // entries: [{ name, data: Buffer }]
  const locals = []; const centrals = []; let offset = 0;
  const dosTime = 0; const dosDate = (1 << 5) | 1; // fixed timestamp => reproducible archives
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(useDeflate ? 8 : 0, 8); lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, nameBuf, body);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(useDeflate ? 8 : 0, 10); ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, nameBuf);
    offset += lh.length + nameBuf.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

async function pack(target, manifestObj) {
  const entries = [{ name: 'manifest.json', data: Buffer.from(JSON.stringify(manifestObj, null, 2) + '\n') }];
  for (const item of INCLUDE) {
    try { await stat(path.join(root, item)); } catch { continue; }
    for (const rel of await listFiles(item)) entries.push({ name: rel, data: await readFile(path.join(root, rel)) });
  }
  const file = path.join(dist, `minimal-reddit-${target}-v${version}.zip`);
  await writeFile(file, zip(entries));
  console.log(`Built ${path.relative(root, file)} (${entries.length} files)`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await pack('chrome', manifest);
await pack('firefox', toFirefoxManifest(manifest));
