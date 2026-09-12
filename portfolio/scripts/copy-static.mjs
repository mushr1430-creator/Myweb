import { cp, rm, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
await import('./sync-home-projects.mjs');
await import('./sync-page-data.mjs');
const out = new URL('../dist/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of ['index.html','main.css','main.js','main.js.LICENSE.txt','blank.png','d','site.webmanifest','d77b39f40383b63d32e3.woff2','fde82e4f834a588a4a58.woff2','311b7f2775e42105e53e.woff2']) {
  await cp(new URL(`../${name}`, import.meta.url), new URL(`../dist/${name}`, import.meta.url), { recursive: true });
}
for (const route of ['projects','contact','project','server','assets']) {
  await cp(new URL(`../${route}`, import.meta.url), new URL(`../dist/${route}`, import.meta.url), {
    recursive: true,
    // Module inputs are included in the homepage gallery bundle.
    filter: source => !['/.DS_Store', '/home-background.js', '/projects-webgl.js', '/project-catalog.json'].some(name => source.endsWith(name)),
  });
}
await build({
  entryPoints: [new URL('../assets/home-spiral.js', import.meta.url).pathname],
  outdir: new URL('../dist/assets/', import.meta.url).pathname,
  bundle: true,
  format: 'esm',
  splitting: true,
  target: ['es2020'],
  minify: true,
  sourcemap: false,
});
console.log('Static mirror copied to dist/');
