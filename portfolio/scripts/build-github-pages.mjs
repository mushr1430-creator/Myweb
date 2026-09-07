import './copy-static.mjs';
import { readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
const base = '/';
const prefix = base.slice(0, -1);
const assetPath = (value) => value.startsWith('/') && !value.startsWith('//') && !value.startsWith(base)
  ? prefix + value : value;

function rewriteHtml(html) {
  return html.replace(/((?:src|href|poster|data-[\w-]+)\s*=\s*["'])(\/[^"']*)(["'])/g,
    (_, before, value, after) => before + assetPath(value) + after);
}

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) { await visit(file); continue; }
    if (entry.name.endsWith('.html')) {
      await writeFile(file, rewriteHtml(await readFile(file, 'utf8')));
    } else if (entry.name.endsWith('.css')) {
      const css = await readFile(file, 'utf8');
      await writeFile(file, css.replace(/(url\(["']?)(\/(?!\/)[^)'"\s]*)(["']?\))/g,
        (_, before, value, after) => before + assetPath(value) + after));
    } else if (entry.name.endsWith('.js') && entry.name !== 'main.js') {
      const js = await readFile(file, 'utf8');
      await writeFile(file, js.replace(/(["'`])(\/(?:assets\/|project\/)[^"'`]*)(["'`])/g,
        (_, before, value, after) => before + assetPath(value) + after));
    }
  }
}

await rm(new URL('server/', output), { recursive: true, force: true });
await visit(output);

const data = JSON.parse(await readFile(new URL('d', output), 'utf8'));
function rewriteData(value) {
  if (typeof value === 'string') return value.startsWith('/') ? assetPath(value) : rewriteHtml(value);
  if (Array.isArray(value)) return value.map(rewriteData);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteData(item)]));
  return value;
}
await writeFile(new URL('d', output), JSON.stringify(rewriteData(data)));

let main = await readFile(new URL('main.js', output), 'utf8');
const routeExpression = 't.replace(window.location.origin,"")';
if (!main.includes(routeExpression)) throw new Error('The legacy router changed; review the Pages path adapter.');
main = main.replaceAll('window.location.pathname', 'window.portfolioRoute(window.location.href)')
  .replace(routeExpression, 'window.portfolioRoute(t)')
  .replaceAll('"/d?v=', '"' + prefix + '/d?v=')
  .replaceAll('"/data.json"', JSON.stringify(prefix + '/data.json'))
  .replaceAll('"/mbBG.mp4"', JSON.stringify(prefix + '/mbBG.mp4'));
// Keep route identifiers canonical while media and actual links include the Pages base.
main = `window.portfolioRoute = function (value) {
  var path = new URL(value, window.location.origin).pathname;
  if (path === ${JSON.stringify(prefix)}) return '/';
  if (path.startsWith(${JSON.stringify(base)})) path = path.slice(${prefix.length});
  return path.length > 1 ? path.replace(/\\/$/, '') : path;
};\n` + main;
// All Projects uses its own renderer and must navigate as a full page.
main = main.replace('"/projects"===n', JSON.stringify(prefix + '/projects') + '===n');
await writeFile(new URL('main.js', output), main);

const manifest = JSON.parse(await readFile(new URL('site.webmanifest', output), 'utf8'));
manifest.scope = base;
manifest.start_url = base;
await writeFile(new URL('site.webmanifest', output), JSON.stringify(manifest, null, 2));
await writeFile(new URL('.nojekyll', output), '');
await mkdir(new URL('about/', output), { recursive: true });
await writeFile(new URL('about/index.html', output), `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${base}"><title>张玳源作品集</title></head><body><a href="${base}">返回首页</a></body></html>`);
await writeFile(new URL('404.html', output), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面未找到</title><body style="background:#111;color:#fff;font-family:sans-serif;padding:10vw"><h1>页面未找到</h1><a style="color:inherit" href="${base}">返回作品集首页</a></body></html>`);
console.log('GitHub Pages build ready in dist/ at ' + base);
