import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { toFirefoxManifest } from './firefox-manifest.mjs';

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const errors = [];
if (manifest.manifest_version !== 3) errors.push('manifest_version must be 3');
if (manifest.version !== '1.0.0') errors.push(`manifest version is ${manifest.version}, expected 1.0.0`);
if (pkg.version !== manifest.version) errors.push('package.json version must match manifest version');
const required = [manifest.background?.service_worker, manifest.action?.default_popup, ...Object.values(manifest.icons || {})];
for (const group of manifest.content_scripts || []) required.push(...(group.js || []), ...(group.css || []));
for (const resource of required.filter(Boolean)) {
  try { if (!(await stat(path.join(root, resource))).isFile()) errors.push(`not a file: ${resource}`); }
  catch { errors.push(`missing manifest resource: ${resource}`); }
}
for (const group of manifest.web_accessible_resources || []) {
  for (const pattern of group.resources || []) {
    if (pattern.includes('*')) {
      const [dir] = pattern.split('*');
      try { await stat(path.join(root, dir)); } catch { errors.push(`missing web accessible resource directory: ${dir}`); }
    } else {
      try { await stat(path.join(root, pattern)); } catch { errors.push(`missing web accessible resource: ${pattern}`); }
    }
  }
}
for (const doc of ['LICENSE', 'README.md', 'PRIVACY.md', 'THIRD_PARTY_NOTICES.md', 'SECURITY.md']) {
  try { await stat(path.join(root, doc)); } catch { errors.push(`missing required document: ${doc}`); }
}
if (!manifest.minimum_chrome_version) errors.push('manifest.json (Chrome) must declare minimum_chrome_version');
const ff = toFirefoxManifest(manifest);
if (!ff.background?.scripts?.length) errors.push('Firefox manifest needs background.scripts');
if (ff.background?.service_worker) errors.push('Firefox manifest must not use background.service_worker');
if (!ff.browser_specific_settings?.gecko?.id) errors.push('Firefox manifest needs gecko id');
if (!ff.browser_specific_settings?.gecko?.data_collection_permissions) errors.push('Firefox manifest needs data_collection_permissions');
if (ff.minimum_chrome_version) errors.push('Firefox manifest must not declare minimum_chrome_version');
const forbiddenFiles = /(^|\/)(\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|log|map)|cookies?\.json|diagnostic.*\.json)$/i;
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (forbiddenFiles.test(rel)) errors.push(`sensitive or generated filename should not be committed: ${rel}`);
    if (entry.isDirectory()) await scan(full);
    else if (entry.isFile() && /\.(?:js|mjs|html|css|json|md|yml|yaml|txt)$/i.test(entry.name)) {
      const text = await readFile(full, 'utf8');
      if (/(?:\/Users\/[^\s/]+|\/home\/[^\s/]+|C:\\\\Users\\\\[^\\]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i.test(text)) errors.push(`possible local path or private key marker: ${rel}`);
    }
  }
}
await scan(root);
if (errors.length) {
  console.error('Release validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else console.log('Release metadata and manifest resource checks passed.');
