import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';

// Follow references from real page entrypoints, including JSON, inline scripts
// and dynamically created media. Browser-only coverage misses those resources.
const root = resolve(process.argv[2] || '.');
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else result.push(path);
  }
  return result;
}
const assetFiles = await files(resolve(root, 'assets'));
const assets = new Map(assetFiles.map(path => [relative(root, path), path]));
const entrypoints = ['index.html', 'main.js', 'main.css', 'd', 'site.webmanifest',
  'projects/index.html', 'contact/index.html'];
entrypoints.push(...(await files(resolve(root, 'project')))
  .filter(path => path.endsWith('.html')).map(path => relative(root, path)));

const queue = entrypoints.map(path => resolve(root, path));
const visited = new Set();
const reached = new Set();
const missing = new Set();
for (let index = 0; index < queue.length; index++) {
  const path = queue[index];
  if (visited.has(path)) continue;
  visited.add(path);
  const text = await readFile(path, 'utf8');
  for (const match of text.matchAll(/\/assets\/([\w.%+/-]+\.(?:png|jpe?g|webp|svg|gif|mp4|mov|webm|m4a|mp3|ogg|wav|js|css|json|woff2?))/g)) {
    const reference = `assets/${decodeURIComponent(match[1])}`;
    if (!assets.has(reference)) missing.add(`${relative(root, path)} → ${reference}`);
  }
  // Also check literal root-level assets, including dynamically created videos.
  for (const match of text.matchAll(/["'`(]\s*(\/(?!\/)[\w.%+/-]+\.(?:png|jpe?g|webp|svg|gif|mp4|mov|webm|m4a|mp3|ogg|wav|js|css|json|woff2?))(?=[?"'`)\s])/g)) {
    const reference = decodeURIComponent(match[1]);
    try { await access(resolve(root, `.${reference}`)); }
    catch { missing.add(`${relative(root, path)} → ${reference}`); }
  }
  for (const [name, asset] of assets) {
    if (asset === path || reached.has(name)) continue;
    const filename = name.slice(name.lastIndexOf('/') + 1);
    if (!text.includes(filename)) continue;
    reached.add(name);
    if (['.js', '.css', '.json'].includes(extname(asset))) queue.push(asset);
  }
}
const unused = [...assets.keys()].filter(name => !reached.has(name));
if (missing.size || unused.length) {
  if (missing.size) console.error('Missing assets:\n' + [...missing].join('\n'));
  if (unused.length) console.error('Unreferenced assets (review before deleting):\n' + unused.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Asset check passed: ${reached.size} reachable files; no missing or unreferenced assets.`);
}
