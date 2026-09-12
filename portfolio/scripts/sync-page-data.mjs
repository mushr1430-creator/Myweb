import { readFile, writeFile } from 'node:fs/promises';

// The transition router reads these fragments; keep them aligned with direct URLs.
const dataUrl = new URL('../d', import.meta.url);
const original = await readFile(dataUrl, 'utf8');
const data = JSON.parse(original);
// /projects is retired; its old URL redirects to /#all-projects.
delete data.pages['/projects'];
delete data.pages['/'].cpblt;
const sources = [
  ['index.html', data.pages['/']],
  ['contact/index.html', data.pages['/contact']],
  ...Object.entries(data.pages.projects).map(([route, page]) => [
    `project${route}/index.html`, page,
  ]),
];

const textures = new Set([data.data.media]);
const decodeAttribute = (value) => value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
  const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
  if (named[entity]) return named[entity];
  return String.fromCodePoint(parseInt(entity.slice(entity[2]?.toLowerCase() === 'x' ? 3 : 2, -1), entity[2]?.toLowerCase() === 'x' ? 16 : 10));
});

for (const [source, page] of sources) {
  const html = await readFile(new URL(`../${source}`, import.meta.url), 'utf8');
  const content = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);
  // External project redirects have no app content to synchronize.
  if (content) page.html = content[1];
  // Only legacy data-src/data-touch images need window.TEXTURES. Native images,
  // videos and the spiral's catalog textures have their own loading paths.
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    for (const attribute of tag[0].matchAll(/\bdata-(?:src|touch)\s*=\s*(["'])(.*?)\1/gi)) {
      textures.add(decodeAttribute(attribute[2]));
    }
  }
}

data.medias = [...textures].filter(Boolean);

const updated = JSON.stringify(data);
if (updated !== original) await writeFile(dataUrl, updated);
