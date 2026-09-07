import { cp, rm, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import './sync-page-data.mjs';
const out = new URL('../dist/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of ['index.html','main.css','main.js','main.js.LICENSE.txt','blank.png','d','site.webmanifest','d77b39f40383b63d32e3.woff2','fde82e4f834a588a4a58.woff2','311b7f2775e42105e53e.woff2']) {
  await cp(new URL(`../${name}`, import.meta.url), new URL(`../dist/${name}`, import.meta.url), { recursive: true });
}
for (const route of ['projects','contact','project','cdn-cgi','server','assets']) {
  await cp(new URL(`../${route}`, import.meta.url), new URL(`../dist/${route}`, import.meta.url), { recursive: true });
}
await build({
  entryPoints: [new URL('../assets/projects-webgl.js', import.meta.url).pathname],
  outfile: new URL('../dist/assets/projects-webgl.js', import.meta.url).pathname,
  bundle: true,
  format: 'esm',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
});
console.log('Static mirror copied to dist/');
