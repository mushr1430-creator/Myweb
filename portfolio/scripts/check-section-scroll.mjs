import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the actual legacy section controller without a browser or WebGL.
const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
const start = main.indexOf('class $n{');
const end = main.indexOf('class Qn', start);
assert.ok(start >= 0 && end > start, 'Review the section-controller test adapter if the bundle changes.');
const context = vm.createContext({ window: { innerHeight: 900 }, Ln: element => element.bounds });
vm.runInContext(main.slice(start, end) + ';globalThis.Section = $n;', context);

function section(top, height) {
  const element = { bounds: { top, bottom: top + height }, style: { transform: '' } };
  const controller = new context.Section({ el: element });
  controller.update(0);
  controller.rs();
  return { element, controller };
}
function visibleTop({ element }) {
  const match = element.style.transform.match(/translate3d\(0,\s*(-?[\d.]+)px,\s*0\)/);
  assert.ok(match, `Expected a finite scroll transform, got ${element.style.transform}`);
  return element.bounds.top + Number(match[1]);
}

const hero = section(0, 900);
const profile = section(1000, 1000);
const projects = section(2300, 900);
const contact = section(3400, 1200);
const sections = [hero, profile, projects, contact];

// Returning from a detail page to /#all-projects must move the hero offscreen
// in the same frame as the gallery, even though it skips the culling window.
sections.forEach(({ controller }) => controller.update(2300));
assert.ok(visibleTop(hero) + 900 <= 0, 'The first-screen title must leave the viewport on direct gallery entry.');
assert.ok(visibleTop(profile) + 1000 <= 0, 'The profile must leave the viewport on direct gallery entry.');
assert.equal(visibleTop(projects), 0);

// Fast movement in either direction, including back-to-top, keeps every section
// in its document position instead of leaving skipped sections frozen onscreen.
for (const scroll of [3700, 1000, 0, 2450, 150, 2300]) {
  sections.forEach(({ controller }) => controller.update(scroll));
  for (const item of sections) assert.equal(visibleTop(item), item.element.bounds.top - scroll);
}

// The layout pass temporarily clears transforms; it must restore the current
// offset, and the next jump must still move sections that are outside view.
for (const { element, controller } of sections) {
  element.style.transform = 'translate3d(0,0,0)';
  controller.rs();
}
assert.equal(visibleTop(hero), -2300);
sections.forEach(({ controller }) => controller.update(0));
assert.equal(visibleTop(hero), 0);
assert.equal(visibleTop(projects), 2300);

const fresh = new context.Section({ el: { bounds: { top: 0, bottom: 900 }, style: {} } });
fresh.rs();
assert.equal(visibleTop({ element: fresh.el }), 0, 'Initial layout must not write an undefined scroll offset.');

console.log('Section scroll checks passed: direct gallery entry, fast jumps, reverse navigation, resize and initial layout.');
