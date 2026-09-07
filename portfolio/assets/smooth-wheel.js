(() => {
  if (window.__portfolioSmoothWheelInstalled) return;
  window.__portfolioSmoothWheelInstalled = true;

  const generatedEvents = new WeakSet();
  const isProjectsPage = /^\/projects\/?$/.test(window.location.pathname);
  const speed = 0.42;
  const release = 0.22;
  let projectWheelDistance = 0;
  let projectWheelLocked = false;
  let projectWheelUnlockTimer = 0;
  let pendingX = 0;
  let pendingY = 0;
  let frame = 0;
  let sourceTarget = document;
  let sourceEvent = null;

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
      if (event.__projectsSliderGesture) return;
      if (!document.documentElement.classList.contains("desktop")) return;
      if (event.ctrlKey || event.metaKey) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (isProjectsPage) {
        const modeScale =
          event.deltaMode === WheelEvent.DOM_DELTA_LINE
            ? 16
            : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
              ? window.innerHeight
              : 1;
        const dominantDelta =
          Math.abs(event.deltaY) >= Math.abs(event.deltaX)
            ? event.deltaY
            : event.deltaX;

        clearTimeout(projectWheelUnlockTimer);
        projectWheelUnlockTimer = window.setTimeout(() => {
          projectWheelLocked = false;
          projectWheelDistance = 0;
        }, 260);

        if (projectWheelLocked) return;
        projectWheelDistance += dominantDelta * modeScale;

        if (Math.abs(projectWheelDistance) >= 28) {
          const stepEvent = new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            deltaMode: WheelEvent.DOM_DELTA_PIXEL,
            deltaY: Math.sign(projectWheelDistance) * 40,
          });
          Object.defineProperty(stepEvent, "__projectsSliderGesture", {
            value: true,
          });
          projectWheelDistance = 0;
          projectWheelLocked = true;
          (event.target?.isConnected ? event.target : document).dispatchEvent(
            stepEvent,
          );
        }
        return;
      }

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
