import { PortfolioExperience } from './projects-webgl.js?v=20260910-projects-nav-1';

const clearWheel = () => window.dispatchEvent(new Event('portfolio:clear-wheel'));
const setGalleryMusic = active => document.dispatchEvent(new CustomEvent('portfolio:gallery-music', { detail: { active } }));
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// Layout offsets stay stable while beta translates each .ssc independently.
function sectionTop(element) {
  let top = 0;
  for (let node = element; node && !node.matches('.app'); node = node.offsetParent) top += node.offsetTop;
  return top;
}

class HomeSpiral {
  constructor(root, bridge) {
    this.root = root;
    this.bridge = bridge;
    this.state = 'idle';
    this.events = new AbortController();
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.lastPosition = bridge.read()?.current ?? 0;
    this.lastWheelAt = -Infinity;
    this.waitingSince = 0;
    this.boundaryDirection = 1;
    this.pendingEntry = window.portfolioProjectsRequest ||
      (window.location.hash === '#all-projects' ? { immediate: true } : null);
    delete window.portfolioProjectsRequest;
    root.classList.add('is-loading');
    try {
      this.experience = new PortfolioExperience({
        root, embedded: true,
        onReady: () => {
          this.ready = true;
          root.classList.remove('is-loading');
          root.classList.add('is-ready');
        },
        onError: () => this.fallback()
      });
    } catch (_error) {
      this.fallback();
    }
    const signal = this.events.signal;
    root.querySelectorAll('[data-spiral-go]').forEach(button => {
      button.addEventListener('click', () => this.leave(button.dataset.spiralGo), { signal });
    });
    document.querySelectorAll('[data-spiral-enter]').forEach(button => {
      button.addEventListener('click', () => this.requestEntry(), { signal });
    });
    document.addEventListener('portfolio:open-projects', () => {
      this.requestEntry(window.portfolioProjectsRequest);
      delete window.portfolioProjectsRequest;
    }, { signal });
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#all-projects') this.requestEntry();
    }, { signal });
    root.querySelector('.home-spiral-fallback').addEventListener('wheel', event => event.stopPropagation(), { signal });
    root.addEventListener('focusin', () => {
      if (this.ready && (this.state === 'idle' || this.state === 'waiting')) this.enter();
    }, { signal });
    // Capture before the shared wheel smoother and the legacy page scroller.
    window.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey || event.target.closest?.('.home-spiral-fallback')) return;
      const now = performance.now();
      const freshGesture = !event.__portfolioSmoothedWheel && now - this.lastWheelAt > 180;
      if (!event.__portfolioSmoothedWheel) this.lastWheelAt = now;
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
      const delta = (Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * units;
      if (this.state === 'waiting' && !event.__portfolioSmoothedWheel && delta) {
        if (Math.sign(delta) !== this.boundaryDirection) {
          this.releaseBoundary();
          return;
        }
        if (freshGesture && now - this.waitingSince >= 220) this.enter();
      }
      if (!this.ownsScroll()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (this.state !== 'active') return;
      this.experience.controls.onWheel(delta);
    }, { capture: true, passive: false, signal });
    window.addEventListener('touchstart', event => {
      this.touchY = event.touches[0]?.clientY ?? 0;
      // A finger already down when the boundary is reached cannot launch entry.
      this.freshTouch = this.state === 'waiting' && performance.now() - this.waitingSince >= 220;
      this.touchDistance = 0;
    }, { capture: true, passive: true, signal });
    window.addEventListener('touchmove', event => {
      const y = event.touches[0]?.clientY ?? this.touchY;
      const delta = this.touchY - y;
      this.touchY = y;
      this.touchDistance += delta;
      if (this.state === 'waiting' && Math.abs(this.touchDistance) > 12) {
        if (Math.sign(this.touchDistance) !== this.boundaryDirection) {
          this.releaseBoundary();
          return;
        }
        if (this.freshTouch) this.enter();
      }
      if (!this.ownsScroll() || root.querySelector('.home-spiral-fallback')?.contains(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true, passive: false, signal });
    window.addEventListener('keydown', event => {
      if (!this.ownsScroll() || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Escape') { event.preventDefault(); this.leave('back'); return; }
      if (event.target.closest('button, a')) return;
      const directions = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, PageDown: 1, PageUp: -1, ' ': event.shiftKey ? -1 : 1 };
      if (directions[event.key]) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (this.state === 'waiting') {
          if (directions[event.key] !== this.boundaryDirection) {
            this.releaseBoundary();
            this.bridge.moveTo((this.bridge.read()?.current ?? 0) + directions[event.key] * 120);
          } else if (!event.repeat && performance.now() - this.waitingSince >= 220) this.enter();
        } else if (this.state === 'active') this.experience.controls.onWheel(directions[event.key] * 110);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        this.leave(event.key === 'Home' ? 'back' : 'connect');
      }
    }, { capture: true, signal });
    this.bridge.setFrame(() => this.update());
  }

  ownsScroll() { return this.state === 'waiting' || this.state === 'active' || this.state === 'entering' || this.state === 'leaving'; }

  requestEntry({ immediate = false } = {}) {
    this.pendingEntry = { immediate };
  }

  boundary(direction = this.boundaryDirection) {
    const top = sectionTop(this.root);
    return direction === 1 ? Math.max(0, top - innerHeight) : top + this.root.clientHeight;
  }

  pauseAtBoundary(direction) {
    this.state = 'waiting';
    this.boundaryDirection = direction;
    this.waitingSince = performance.now();
    this.freshTouch = false;
    this.touchDistance = 0;
    this.root.classList.remove('is-presenting');
    clearWheel();
    this.bridge.moveTo(this.boundary(), true);
  }

  releaseBoundary() {
    this.state = 'idle';
    clearWheel();
    // Move just outside the gate so reversing can resume the normal page scroll.
    const position = this.boundary() - this.boundaryDirection;
    this.bridge.moveTo(position, true);
    this.lastPosition = position;
  }

  fallback() {
    setGalleryMusic(false);
    this.ready = false;
    this.root.classList.remove('is-loading', 'is-ready', 'is-active', 'is-presenting');
    this.root.classList.add('is-fallback');
    this.state = 'idle';
    this.transition = null;
    clearWheel();
    if (this.experience) this.experience.active = false;
  }

  enter() {
    this.state = 'entering';
    clearWheel();
    this.root.classList.add('is-active', 'is-presenting');
    setGalleryMusic(true);
    this.experience.active = true;
    this.startTransition(this.root, 'active');
  }

  leave(direction) {
    if (this.state === 'leaving') return;
    const target = document.querySelector(direction === 'back' ? '.home_about' : '.home_contact');
    if (!target) return;
    this.state = 'leaving';
    setGalleryMusic(false);
    clearWheel();
    this.root.classList.remove('is-active');
    if (this.experience) {
      this.experience.active = false;
      this.experience.clearHover();
      this.experience.controls.targetWheelDeltaY = 0;
      this.experience.controls.wheelDeltaY = 0;
    }
    this.startTransition(target, 'idle', direction === 'connect');
  }

  startTransition(target, after, toBottom = false) {
    this.transition = { target, after, toBottom, from: this.bridge.read()?.current ?? 0, started: performance.now(), duration: this.motion.matches ? 0 : after === 'active' ? 860 : 850 };
  }

  update() {
    const page = this.bridge.read();
    if (!page || !this.root.isConnected) return;
    const top = sectionTop(this.root);
    const height = this.root.clientHeight;
    const position = page.current;
    if (this.experience) this.experience.visible = top - position < innerHeight + 80 && top + height - position > -80;

    // Deep links wait for the legacy page layout and scroll bridge to be ready.
    // Header clicks use the same transition as the in-page Projects button.
    if (this.pendingEntry && page.ready && Number.isFinite(page.limit) && top > 0 && page.limit >= top) {
      const { immediate } = this.pendingEntry;
      this.pendingEntry = null;
      this.bridge.closeMenu();
      if (this.state !== 'active' && this.state !== 'entering') {
        if (this.experience && !this.root.classList.contains('is-fallback')) this.enter();
        else {
          this.state = 'leaving';
          clearWheel();
          this.root.classList.add('is-presenting');
          this.startTransition(this.root, 'idle');
        }
      }
      if (immediate && this.transition) this.transition.duration = 0;
    }

    if (this.transition) {
      const transition = this.transition;
      const progress = transition.duration ? clamp((performance.now() - transition.started) / transition.duration, 0, 1) : 1;
      const eased = transition.after === 'active' ? progress * progress * progress * (progress * (progress * 6 - 15) + 10) : 1 - Math.pow(1 - progress, 3);
      // Short about sections still return to a full viewport with no gallery peek.
      const targetTop = transition.target.matches('.home_about') ? Math.min(sectionTop(transition.target), this.boundary(1)) : sectionTop(transition.target);
      // Connect lands at the page end, including the full contact section and footer.
      const destination = transition.toBottom ? page.limit : clamp(targetTop, 0, page.limit);
      this.bridge.moveTo(transition.from + (destination - transition.from) * eased, true);
      if (progress === 1) {
        this.state = transition.after;
        this.transition = null;
        clearWheel();
        if (this.state === 'active') this.root.querySelector('.home-spiral-canvas').focus({ preventScroll: true });
        if (this.state === 'idle') {
          this.root.classList.remove('is-presenting');
          transition.target.focus({ preventScroll: true });
          // Rearm only after leaving the gallery, so the exit animation cannot recapture it.
          this.lastPosition = destination;
        }
      }
      return;
    }
    if (this.state === 'waiting') {
      this.bridge.moveTo(this.boundary(), true);
    } else if (this.state === 'active') {
      this.bridge.moveTo(top, true);
    } else if (!this.root.classList.contains('is-fallback') && page.ready) {
      const before = this.boundary(1);
      const after = this.boundary(-1);
      // Clamp the target before the legacy scroller advances: even a fast wheel
      // gesture cannot leave the next frame resting halfway through the gallery.
      if (this.lastPosition < top && page.target >= before && page.target >= position) {
        if (position >= before - 0.75) this.pauseAtBoundary(1);
        else this.bridge.moveTo(before);
      } else if (this.lastPosition >= top && page.target <= after && page.target <= position) {
        if (position <= after + 0.75) this.pauseAtBoundary(-1);
        else this.bridge.moveTo(after);
      }
    }
    this.lastPosition = position;
  }

  destroy() {
    setGalleryMusic(false);
    this.events.abort();
    this.bridge.setFrame(null);
    this.experience?.destroy();
    clearWheel();
  }
}

let gallery;
function mount() {
  const root = document.querySelector('.home-spiral');
  const bridge = window.portfolioSectionScroll;
  if (gallery?.root === root) return;
  gallery?.destroy();
  gallery = null;
  if (root && bridge) gallery = new HomeSpiral(root, bridge);
}

// Main can finish booting after this module, and its router replaces only the page.
const waitForBridge = setInterval(() => {
  if (!window.portfolioSectionScroll) return;
  clearInterval(waitForBridge);
  mount();
  const app = document.querySelector('.app');
  if (app) new MutationObserver(mount).observe(app, { childList: true });
}, 50);
