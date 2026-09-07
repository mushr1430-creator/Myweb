import { readFile, writeFile } from 'node:fs/promises';

// The transition router reads these fragments; keep them aligned with direct URLs.
const dataUrl = new URL('../d', import.meta.url);
const original = await readFile(dataUrl, 'utf8');
const data = JSON.parse(original);
const sources = [
  ['index.html', data.pages['/']],
  ['contact/index.html', data.pages['/contact']],
  ...Object.entries(data.pages.projects).map(([route, page]) => [
    `project${route}/index.html`, page,
  ]),
];

for (const [source, page] of sources) {
  const html = await readFile(new URL(`../${source}`, import.meta.url), 'utf8');
  const content = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);
  // External project redirects have no app content to synchronize.
  if (content) page.html = content[1];
}

const updated = JSON.stringify(data);
if (updated !== original) await writeFile(dataUrl, updated);
