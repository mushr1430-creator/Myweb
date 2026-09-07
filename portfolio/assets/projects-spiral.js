(() => {
  const gallery = document.querySelector("[data-spiral-gallery]");
  if (!gallery) return;

  const cards = [...gallery.querySelectorAll(".project-card")];
  const progressItems = [...gallery.querySelectorAll(".progress-item")];
  const space = gallery.querySelector(".spiral-space");
  const copy = gallery.querySelector(".project-copy");
  const title = gallery.querySelector(".project-title");
  const current = gallery.querySelector(".index-current");
  const detailTitle = gallery.querySelector(".detail-title");
  const detailSummary = gallery.querySelector(".detail-summary");
  const detailRole = gallery.querySelector(".detail-role");
  const detailDate = gallery.querySelector(".detail-date");
  const menuButton = document.querySelector(".menu-button");
  const mobileMenu = document.querySelector(".mobile-menu");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = cards.length;

  let offset = 0;
  let targetVelocity = reducedMotion ? 0 : 0.00055;
  let velocity = 0;
  let direction = 1;
  let activeIndex = 0;
  let destination = null;
  let pointerX = 0;
  let pointerY = 0;
  let smoothPointerX = 0;
  let smoothPointerY = 0;
  let pointerId = null;
  let dragStartX = 0;
  let lastDragX = 0;
  let dragging = false;
  let suppressClick = false;
  let copyTimer = 0;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const mod = (value, length) => ((value % length) + length) % length;

  const relativeIndex = (index) => {
    let relative = index - offset;
    relative = mod(relative + count / 2, count) - count / 2;
    return relative;
  };

  const setProjectCopy = (index, immediate = false) => {
    const card = cards[index];
    if (!card) return;

    window.clearTimeout(copyTimer);
    if (!immediate) copy.classList.add("is-changing");

    copyTimer = window.setTimeout(() => {
      title.textContent = card.dataset.title;
      const isLongTitle = card.dataset.title.length > 12;
      copy.style.setProperty("--title-size", isLongTitle ? "7.6vw" : "10.5vw");
      copy.style.setProperty("--title-size-mobile", isLongTitle ? "9.2vw" : "12.4vw");
      current.textContent = String(index + 1).padStart(2, "0");
      detailTitle.textContent = card.dataset.title;
      detailSummary.textContent = card.dataset.summary;
      detailRole.textContent = card.dataset.role;
      detailDate.textContent = card.dataset.date;
      copy.classList.remove("is-changing");
    }, immediate ? 0 : 125);

    cards.forEach((item, itemIndex) => {
      const isActive = itemIndex === index;
      item.classList.toggle("is-active", isActive);
      item.querySelector("a").tabIndex = isActive ? 0 : -1;
    });

    progressItems.forEach((item, itemIndex) => {
      const isActive = itemIndex === index;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });
  };

  const goToProject = (index) => {
    const currentOffset = mod(offset, count);
    let delta = index - currentOffset;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    destination = offset + delta;
    direction = delta >= 0 ? 1 : -1;
  };

  const addImpulse = (delta) => {
    destination = null;
    if (delta === 0) return;
    direction = Math.sign(delta);
    targetVelocity = clamp(targetVelocity + delta * 0.0015, -1.65, 1.65);
  };

  const render = () => {
    if (destination !== null) {
      const distance = destination - offset;
      targetVelocity += distance * 0.032;
      targetVelocity *= 0.82;
      if (Math.abs(distance) < 0.003 && Math.abs(velocity) < 0.003) {
        offset = destination;
        destination = null;
        targetVelocity = reducedMotion ? 0 : direction * 0.00055;
      }
    } else {
      if (!reducedMotion && Math.abs(targetVelocity) < 0.00055) {
        targetVelocity = direction * 0.00055;
      }
      targetVelocity *= reducedMotion ? 0.72 : 0.9;
    }

    velocity += (targetVelocity - velocity) * (reducedMotion ? 0.28 : 0.1);
    offset += velocity;

    if (Math.abs(offset) > 10000) offset = mod(offset, count);

    const motion = clamp(Math.abs(velocity) * 2.4, 0, 1);
    gallery.style.setProperty("--motion", motion.toFixed(3));

    const width = window.innerWidth;
    const height = window.innerHeight;
    const mobile = width <= 900;
    const xRadius = width * (mobile ? 0.48 : 0.34);
    const yGap = Math.min(mobile ? 108 : 145, height * (mobile ? 0.14 : 0.17));

    cards.forEach((card, index) => {
      const relative = relativeIndex(index);
      const distance = Math.abs(relative);
      const angle = relative * (mobile ? 0.74 : 0.86);
      const x = Math.sin(angle) * xRadius;
      const y = relative * yGap;
      const z = (Math.cos(angle) - 1) * (mobile ? 360 : 520) - distance * 42;
      const rotateY = relative * (mobile ? -20 : -28);
      const rotateZ = relative * -1.7;
      const scale = Math.max(mobile ? 0.48 : 0.42, 1 - distance * (mobile ? 0.19 : 0.2));
      const opacity = clamp(1 - Math.max(0, distance - 0.35) * 0.22, 0.18, 1);

      card.style.setProperty("--x", `${x.toFixed(2)}px`);
      card.style.setProperty("--y", `${y.toFixed(2)}px`);
      card.style.setProperty("--z", `${z.toFixed(2)}px`);
      card.style.setProperty("--ry", `${rotateY.toFixed(2)}deg`);
      card.style.setProperty("--rz", `${rotateZ.toFixed(2)}deg`);
      card.style.setProperty("--scale", scale.toFixed(4));
      card.style.setProperty("--card-opacity", opacity.toFixed(3));
      card.style.zIndex = String(100 - Math.round(distance * 10));
    });

    smoothPointerX += (pointerX - smoothPointerX) * 0.06;
    smoothPointerY += (pointerY - smoothPointerY) * 0.06;
    space.style.transform = `rotateX(${(-smoothPointerY * 0.9).toFixed(3)}deg) rotateY(${(smoothPointerX * 1.15).toFixed(3)}deg)`;

    const nextActive = mod(Math.round(offset), count);
    if (nextActive !== activeIndex) {
      activeIndex = nextActive;
      setProjectCopy(activeIndex);
    }

    window.requestAnimationFrame(render);
  };

  gallery.addEventListener(
    "wheel",
    (event) => {
      if (event.cancelable) event.preventDefault();
      addImpulse(event.deltaY);
    },
    { passive: false }
  );

  gallery.addEventListener("pointermove", (event) => {
    pointerX = event.clientX / window.innerWidth * 2 - 1;
    pointerY = event.clientY / window.innerHeight * 2 - 1;

    if (pointerId !== event.pointerId) return;
    const distance = event.clientX - dragStartX;
    if (!dragging && Math.abs(distance) > 8) {
      dragging = true;
      gallery.classList.add("is-dragging");
    }
    if (!dragging) return;
    const deltaX = event.clientX - lastDragX;
    addImpulse(-deltaX * 0.55);
    lastDragX = event.clientX;
  });

  gallery.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    pointerId = event.pointerId;
    dragStartX = event.clientX;
    lastDragX = event.clientX;
    suppressClick = false;
    gallery.setPointerCapture?.(event.pointerId);
  });

  const endDrag = (event) => {
    if (pointerId !== event.pointerId) return;
    suppressClick = dragging;
    pointerId = null;
    dragging = false;
    gallery.classList.remove("is-dragging");
    gallery.releasePointerCapture?.(event.pointerId);
  };

  gallery.addEventListener("pointerup", endDrag);
  gallery.addEventListener("pointercancel", endDrag);
  gallery.addEventListener(
    "click",
    (event) => {
      if (!suppressClick || !event.target.closest(".project-card a")) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    },
    true
  );
  gallery.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
  });

  progressItems.forEach((item) => {
    item.addEventListener("click", () => goToProject(Number(item.dataset.goTo)));
  });

  window.addEventListener("keydown", (event) => {
    if (["ArrowDown", "ArrowRight", "PageDown"].includes(event.key)) {
      event.preventDefault();
      goToProject(mod(activeIndex + 1, count));
    }
    if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      goToProject(mod(activeIndex - 1, count));
    }
    if (event.key === "Enter" && document.activeElement === document.body) {
      cards[activeIndex].querySelector("a").click();
    }
  });

  menuButton?.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.textContent = open ? "CLOSE" : "MENU";
    mobileMenu.hidden = !open;
    mobileMenu.classList.toggle("is-open", open);
  });

  setProjectCopy(0, true);
  render();
})();
