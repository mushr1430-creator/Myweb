(() => {
  if (window.__portfolioSmoothWheelInstalled) return;
  window.__portfolioSmoothWheelInstalled = true;

  const generatedEvents = new WeakSet();
  const speed = 0.42;
  const release = 0.22;
  let pendingX = 0;
  let pendingY = 0;
  let frame = 0;
  let sourceTarget = document;
  let sourceEvent = null;

  // An embedded section takes over input without inheriting queued page inertia.
  window.addEventListener("portfolio:clear-wheel", () => {
    cancelAnimationFrame(frame);
    frame = 0;
    pendingX = pendingY = 0;
    sourceEvent = null;
  });

  const dispatchStep = () => {
    frame = 0;
    if (!sourceEvent) return;

    let stepX = pendingX * release;
    let stepY = pendingY * release;
    if (Math.abs(pendingX) < 0.15) stepX = pendingX;
    if (Math.abs(pendingY) < 0.15) stepY = pendingY;
    pendingX -= stepX;
    pendingY -= stepY;

    const smoothEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      deltaX: stepX,
      deltaY: stepY,
      ctrlKey: sourceEvent.ctrlKey,
      altKey: sourceEvent.altKey,
      shiftKey: sourceEvent.shiftKey,
      metaKey: sourceEvent.metaKey,
    });
    // Section gates must distinguish page easing from a new physical gesture.
    Object.defineProperty(smoothEvent, "__portfolioSmoothedWheel", { value: true });
    generatedEvents.add(smoothEvent);
    (sourceTarget?.isConnected ? sourceTarget : document).dispatchEvent(
      smoothEvent,
    );

    if (Math.abs(pendingX) > 0.01 || Math.abs(pendingY) > 0.01) {
      frame = requestAnimationFrame(dispatchStep);
    }
  };

  document.addEventListener(
    "wheel",
    (event) => {
      if (generatedEvents.has(event)) return;
      if (event.target.closest?.('.home-spiral-fallback')) return;
      if (!document.documentElement.classList.contains("desktop")) return;
      if (event.ctrlKey || event.metaKey) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();


      const modeScale =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;
      const nextX = event.deltaX * modeScale * speed;
      const nextY = event.deltaY * modeScale * speed;

      if (pendingX && nextX && Math.sign(pendingX) !== Math.sign(nextX)) {
        pendingX *= 0.2;
      }
      if (pendingY && nextY && Math.sign(pendingY) !== Math.sign(nextY)) {
        pendingY *= 0.2;
      }

      pendingX += nextX;
      pendingY += nextY;
      sourceTarget = event.target || document;
      sourceEvent = event;
      if (!frame) frame = requestAnimationFrame(dispatchStep);
    },
    { capture: true, passive: false },
  );
})();
