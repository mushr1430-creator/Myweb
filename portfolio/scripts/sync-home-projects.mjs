import { readFile, writeFile } from 'node:fs/promises';

// Keep the home list and the 3D gallery on the same project catalog.
const catalog = JSON.parse(await readFile(new URL('../assets/project-catalog.json', import.meta.url), 'utf8'));
const indexUrl = new URL('../index.html', import.meta.url);
const original = await readFile(indexUrl, 'utf8');
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const cards = catalog.filter((project) => !project.hidden).map((project) => {
  const background = project.coverBackground ? ` style="--cover-background:${escape(project.coverBackground)}"` : '';
  const content = `<figure class="home_featured_img"${background}><img class="home-projects-cover" src="${escape(project.homeImage || project.image)}" alt="${escape(project.title)} 项目封面" decoding="async"></figure><div class="home_featured_text"><span class="home-projects-name">${escape(project.title)}</span><span class="home-projects-category"> — ${escape(project.category)}</span></div>`;
  return `<article class="home_featured_project">${project.route ? `<a class="full-page-project-link home-projects-link" href="${escape(project.route)}">${content}</a>` : content}</article>`;
}).join('');

const start = '<!-- home-projects:start -->';
const end = '<!-- home-projects:end -->';
const startIndex = original.indexOf(start);
const endIndex = original.indexOf(end, startIndex);
if (startIndex < 0 || endIndex < 0) throw new Error('Home project list markers are missing.');
const updated = original.slice(0, startIndex + start.length) + cards + original.slice(endIndex);
if (updated !== original) await writeFile(indexUrl, updated);
