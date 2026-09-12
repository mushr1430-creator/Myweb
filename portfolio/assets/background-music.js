(() => {
  const storageKey = 'zportfolio:background-music:unseen';
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}') || {}; } catch (_) {}

  const audio = document.createElement('audio');
  audio.dataset.backgroundMusic = '';
  audio.preload = 'none';
  audio.loop = true;
  audio.volume = 0.3;
  audio.hidden = true;
  document.body.append(audio);

  let active = false;
  let enabled = false;
  let pageLeaving = false;
  let awaitingGesture = false;
  let request = 0;
  let failed = false;
  let position = Number.isFinite(saved.position) ? Math.max(0, saved.position) : 0;

  function save() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        position: audio.readyState ? audio.currentTime : position,
      }));
    } catch (_) {}
  }

  function render() {
    const playing = active && enabled && !audio.paused;
    document.documentElement.dataset.musicPlaying = String(playing);
    document.querySelectorAll('[data-music-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(playing));
      const label = failed ? '重试播放背景音乐' : playing ? '关闭背景音乐' : '开启背景音乐';
      button.setAttribute('aria-label', label);
      button.title = label;
    });
    document.dispatchEvent(new CustomEvent('portfolio:music-state', { detail: { playing } }));
  }

  async function play() {
    if (!active || !enabled || pageLeaving) return;
    const currentRequest = ++request;
    failed = false;
    awaitingGesture = false;
    if (!audio.hasAttribute('src')) audio.src = '/assets/unseen-backing.m4a';
    audio.muted = document.hidden;
    try {
      await audio.play();
      if (currentRequest !== request) return;
      render();
    } catch (error) {
      if (currentRequest !== request) return;
      awaitingGesture = error.name === 'NotAllowedError';
      failed = !awaitingGesture;
      if (failed) enabled = false;
      render();
      save();
    }
  }

  function setActive(next) {
    if (active === next) { render(); return; }
    active = next;
    enabled = next;
    awaitingGesture = false;
    failed = false;
    if (active) play();
    else {
      ++request;
      audio.pause();
      save();
    }
    render();
  }

  document.addEventListener('portfolio:gallery-music', event => setActive(event.detail.active));

  audio.addEventListener('loadedmetadata', () => {
    if (position && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = position % audio.duration;
    }
    position = 0;
  }, { once: true });
  audio.addEventListener('playing', render);
  audio.addEventListener('pause', render);
  audio.addEventListener('error', () => {
    ++request;
    failed = true;
    enabled = false;
    awaitingGesture = false;
    audio.removeAttribute('src');
    render();
    save();
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-music-toggle]');
    if (!button || !active) return;
    if (enabled && !awaitingGesture) {
      enabled = false;
      ++request;
      audio.pause();
      render();
    } else {
      enabled = true;
      play();
    }
    save();
  });

  // A fresh browser may require a click or key press before audible playback.
  function resumeOnGesture(event) {
    if (!active || !enabled || !awaitingGesture || event.target.closest('[data-music-toggle]')) return;
    play();
  }
  document.addEventListener('pointerdown', resumeOnGesture);
  document.addEventListener('keydown', resumeOnGesture);
  document.addEventListener('visibilitychange', () => {
    audio.muted = document.hidden;
    if (document.hidden) save();
  });
  window.addEventListener('pagehide', () => {
    pageLeaving = true;
    save();
    ++request;
    audio.pause();
  });
  window.addEventListener('pageshow', event => {
    pageLeaving = false;
    if (event.persisted && active && enabled) play();
  });

  setActive(!!document.querySelector('.home-spiral.is-active'));
})();
