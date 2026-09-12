// GSAP 3.15 comes from the user's local Web/gsap-public/esm distribution.
import { gsap } from './vendor/gsap-3.15/index.js';

const animations = new WeakMap();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function addJelly(timeline, body) {
  // Squash, stretch in the opposite direction, then let the wobble decay.
  timeline
    .to(body, { scaleX: 1.11, scaleY: 0.95, rotation: -1.2, duration: 0.16, ease: 'power2.out' }, 0)
    .to(body, { scaleX: 0.97, scaleY: 1.115, rotation: 1.1, duration: 0.22, ease: 'sine.inOut' }, 0.16)
    .to(body, { scaleX: 1, scaleY: 1, rotation: 0, duration: 1.12, ease: 'elastic.out(1, 0.32)' }, 0.38);
}

function addBlink(timeline, eyes, at = 0.15) {
  timeline
    .to(eyes, { scaleY: 0.045, duration: 0.085, ease: 'power2.in' }, at)
    .to(eyes, { scaleY: 1, duration: 0.16, ease: 'power2.out' }, at + 0.13);
}

function animationFor(button) {
  let animation = animations.get(button);
  if (animation) return animation;

  const variant = button.dataset.starVariant;
  const view = button.querySelector('svg').viewBox.baseVal;
  const body = button.querySelector('[data-star-body]');
  const color = button.querySelector('[data-star-color]');
  const eyes = button.querySelectorAll('[data-star-eye]');
  const book = button.querySelectorAll('[data-star-book]');
  const dimChannels = button.querySelectorAll('[data-star-dim]');
  gsap.set(body, { svgOrigin: `${view.x + view.width / 2} ${view.y + view.height / 2}` });
  if (variant === 'angry') gsap.set(color, { svgOrigin: '85.75 71' });
  gsap.set(eyes, { transformOrigin: '50% 50%' });

  const reset = () => {
    gsap.set(body, { scale: 1, rotation: 0 });
    if (variant === 'angry') gsap.set(color, { rotation: 0 });
    gsap.set(eyes, { scaleY: 1, rotation: 0 });
    if (book.length) gsap.set(book, { y: 0 });
    if (dimChannels.length) gsap.set(dimChannels, { attr: { slope: 1 } });
  };

  const full = gsap.timeline({ paused: true, onComplete: reset });
  const quiet = gsap.timeline({ paused: true, onComplete: reset });
  addJelly(full, body);

  if (variant === 'dizzy') {
    // Rotate each spiral around its own centre; dizzy eyes never blink.
    full
      .to(eyes, { rotation: 360, duration: 1.8, ease: 'power2.inOut' }, 0)
      .to(dimChannels, { attr: { slope: 0.4 }, duration: 0.45, ease: 'power2.inOut' }, 0)
      .to(dimChannels, { attr: { slope: 1 }, duration: 0.75, ease: 'sine.inOut' }, 0.85);
    // A small brightness response also respects reduced-motion preferences.
    quiet
      .to(dimChannels, { attr: { slope: 0.8 }, duration: 0.2, ease: 'sine.inOut' })
      .to(dimChannels, { attr: { slope: 1 }, duration: 0.3, ease: 'sine.inOut' });
  } else {
    addBlink(full, eyes);
    addBlink(quiet, eyes, 0);
    if (variant === 'reading') {
      full
        .to(book, { y: -4.2, duration: 0.15, ease: 'sine.out' }, 0.12)
        .to(book, { y: 3, duration: 0.18, ease: 'sine.inOut' }, 0.27)
        .to(book, { y: 0, duration: 0.55, ease: 'elastic.out(1, 0.35)' }, 0.45);
    } else {
      full.to(color, { rotation: 360, duration: 1.8, ease: 'power2.inOut' }, 0);
    }
  }

  animation = { full, quiet };
  animations.set(button, animation);
  return animation;
}

function play(button) {
  const { full, quiet } = animationFor(button);
  // Finish each expression even if the pointer leaves. Re-entering cannot stack
  // timelines or leave an eye, the book, or the body in an unfinished pose.
  if (full.isActive() || quiet.isActive()) return;
  (reducedMotion.matches ? quiet : full).restart();
}

// Delegation also works when the portfolio router replaces the page from `d`.
document.addEventListener('pointerover', event => {
  if (event.pointerType === 'touch') return;
  const button = event.target.closest?.('[data-combos-star]');
  if (button && !button.contains(event.relatedTarget)) play(button);
});

document.addEventListener('focusin', event => {
  const button = event.target.closest?.('[data-combos-star]');
  if (button?.matches(':focus-visible')) play(button);
});

document.addEventListener('click', event => {
  const button = event.target.closest?.('[data-combos-star]');
  if (button) play(button);
});
