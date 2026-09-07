const SELECTOR = '.about-pill, .about-direction';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// The nearest point on the pill's rounded outline, including its corner arcs.
export function capsuleEdge(x, y, width, height, radius) {
  const px = x - width / 2;
  const py = y - height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const cx = clamp(px, -width / 2 + r, width / 2 - r);
  const cy = clamp(py, -height / 2 + r, height / 2 - r);
  const dx = px - cx;
  const dy = py - cy;
  const length = Math.hypot(dx, dy);
  if (length > 0.001) {
    return { x: cx + dx / length * r + width / 2, y: cy + dy / length * r + height / 2, nx: dx / length, ny: dy / length, distance: length - r };
  }
  const horizontal = width / 2 - Math.abs(px) < height / 2 - Math.abs(py);
  const nx = horizontal ? Math.sign(px) || 1 : 0;
  const ny = horizontal ? 0 : Math.sign(py) || 1;
  return { x: horizontal ? width / 2 + nx * width / 2 : x, y: horizontal ? y : height / 2 + ny * height / 2, nx, ny, distance: -(horizontal ? width / 2 - Math.abs(px) : height / 2 - Math.abs(py)) };
}

// One continuous outline is deformed; there is no separate droplet or bridge.
export function roundedOutline(width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  const points = [];
  const corners = [[width-r,r,-Math.PI/2], [width-r,height-r,0], [r,height-r,Math.PI/2], [r,r,Math.PI]];
  for (let i = 0; i < corners.length; i++) {
    const [cx, cy, angle] = corners[i];
    for (let step = 0; step <= 12; step++) {
      const a = angle + step / 12 * Math.PI / 2;
      points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    const end = points.at(-1);
    const [nextX, nextY, nextAngle] = corners[(i + 1) % 4];
    const next = { x: nextX + Math.cos(nextAngle) * r, y: nextY + Math.sin(nextAngle) * r };
    if (Math.hypot(next.x-end.x, next.y-end.y) > 0.1) {
      for (let step = 1; step < 8; step++) points.push({ x: end.x + (next.x-end.x)*step/8, y: end.y + (next.y-end.y)*step/8 });
    }
  }
  return points.filter((point, i) => Math.hypot(point.x-points[(i+points.length-1)%points.length].x, point.y-points[(i+points.length-1)%points.length].y) > 0.001);
}

export function contourTarget(x, y, width, height, edgeDistance) {
  const reach = clamp(height * 1.1, 44, 112);
  const dx = x - width / 2;
  const dy = y - height / 2;
  const length = Math.hypot(dx, dy);
  if (edgeDistance >= reach || length < 0.001) return { pullX: 0, pullY: 0 };
  const proximity = 1 - Math.max(0, edgeDistance) / reach;
  const strength = Math.sqrt(proximity * proximity * (3 - 2 * proximity));
  const pull = Math.min(Math.min(width, height) * 0.28, 30) * strength * Math.min(1, length / (height * 0.7));
  return { pullX: dx / length * pull, pullY: dy / length * pull };
}

export function deformOutline(points, width, height, pullX, pullY) {
  const length = Math.hypot(pullX, pullY);
  if (length < 0.001) return points;
  const nx = pullX / length;
  const ny = pullY / length;
  const support = Math.abs(nx) * width / 2 + Math.abs(ny) * height / 2;
  return points.map(point => {
    const projection = ((point.x-width/2)*nx + (point.y-height/2)*ny) / support;
    const influence = Math.pow((clamp(projection, -1, 1)+1)/2, 2);
    return { x: point.x + pullX * influence, y: point.y + pullY * influence };
  });
}

export function magneticTarget(x, y, width, height, edgeDistance) {
  const reach = clamp(height * 1.1, 44, 112);
  if (edgeDistance >= reach) return { shiftX: 0, shiftY: 0 };
  const dx = x - width / 2;
  const dy = y - height / 2;
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return { shiftX: 0, shiftY: 0 };
  const proximity = 1 - Math.max(0, edgeDistance) / reach;
  const strength = Math.sqrt(proximity * proximity * (3 - 2 * proximity));
  const offset = clamp(height * 0.1, 3, 8) * Math.min(1, length / (height * 0.7)) * strength;
  return { shiftX: dx / length * offset, shiftY: dy / length * offset };
}

function startLiquidCapsules() {
  const items = new Map();
  const pointer = { x: 0, y: 0, active: false };
  let frame = 0;
  let lastTime = 0;
  let followUntil = 0;
  const events = new AbortController();

  const wake = (duration = 0) => {
    followUntil = Math.max(followUntil, performance.now() + duration);
    if (!frame && !document.hidden && items.size) {
      lastTime = performance.now();
      frame = requestAnimationFrame(update);
    }
  };

  function draw(item) {
    const { context: c, width: w, height: h, padding: pad, scale, corner, state } = item;
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, w + pad * 2, h + pad * 2);
    c.translate(pad, pad);
    c.fillStyle = '#fff';
    c.beginPath();
    if (Math.hypot(state.pullX, state.pullY) < 0.01) {
      c.roundRect(0, 0, w, h, corner);
    } else {
      const points = deformOutline(item.outline, w, h, state.pullX, state.pullY);
      c.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length; i++) {
        const previous = points[(i+points.length-1)%points.length];
        const current = points[i];
        const next = points[(i+1)%points.length];
        const after = points[(i+2)%points.length];
        c.bezierCurveTo(current.x+(next.x-previous.x)/6, current.y+(next.y-previous.y)/6,
          next.x-(after.x-current.x)/6, next.y-(after.y-current.y)/6, next.x, next.y);
      }
      c.closePath();
    }
    c.fill();
  }

  function measure(item) {
    const box = item.element.getBoundingClientRect();
    const style = getComputedStyle(item.element);
    item.width = box.width;
    item.height = box.height;
    item.corner = Math.min(parseFloat(style.borderTopLeftRadius), box.width / 2, box.height / 2);
    item.padding = Math.ceil(clamp(box.height * 1.4, 72, 150));
    item.scale = Math.min(devicePixelRatio || 1, 2);
    const width = box.width + item.padding * 2;
    const height = box.height + item.padding * 2;
    item.canvas.width = Math.ceil(width * item.scale);
    item.canvas.height = Math.ceil(height * item.scale);
    Object.assign(item.canvas.style, { width: `${width}px`, height: `${height}px`, left: `${-item.padding}px`, top: `${-item.padding}px` });
    item.outline = roundedOutline(item.width, item.height, item.corner);
    draw(item);
  }

  const resize = new ResizeObserver(entries => {
    for (const entry of entries) {
      const item = items.get(entry.target);
      if (item) measure(item);
    }
    wake();
  });

  function restore(item) {
    resize.unobserve(item.element);
    item.element.classList.remove('has-liquid-capsule');
    item.element.style.translate = item.originalTranslate;
    item.canvas.remove();
    item.caption.replaceWith(...item.caption.childNodes);
    items.delete(item.element);
  }

  function refresh() {
    for (const item of items.values()) if (!item.element.isConnected) restore(item);
    document.querySelectorAll(SELECTOR).forEach(element => {
      if (items.has(element)) return;
      const canvas = document.createElement('canvas');
      canvas.className = 'about-liquid-surface';
      canvas.setAttribute('aria-hidden', 'true');
      const context = canvas.getContext('2d');
      if (!context) return;
      const caption = document.createElement('span');
      caption.className = 'about-liquid-caption';
      caption.append(...element.childNodes);
      element.append(canvas, caption);
      const item = { element, canvas, context, caption, originalTranslate: element.style.translate, state: { pullX: 0, pullY: 0, shiftX: 0, shiftY: 0 }, velocity: { pullX: 0, pullY: 0, shiftX: 0, shiftY: 0 } };
      items.set(element, item);
      measure(item);
      element.classList.add('has-liquid-capsule');
      resize.observe(element);
    });
    wake();
  }

  function update(time) {
    frame = 0;
    const dt = Math.min((time - lastTime) / 1000, 1 / 30);
    lastTime = time;
    let closest = null;
    let distance = Infinity;
    if (pointer.active) {
      for (const item of items.values()) {
        const box = item.element.getBoundingClientRect();
        if (box.bottom < 0 || box.top > innerHeight) continue;
        // Use the resting position for attraction to avoid a moving-target feedback loop.
        const x = pointer.x - box.left + item.state.shiftX;
        const y = pointer.y - box.top + item.state.shiftY;
        const edge = capsuleEdge(x, y, box.width, box.height, item.corner);
        if (edge.distance < distance) { distance = edge.distance; closest = { item, edge, x, y }; }
      }
    }
    let moving = false;
    for (const item of items.values()) {
      const target = { pullX: 0, pullY: 0, shiftX: 0, shiftY: 0 };
      if (closest?.item === item) {
        Object.assign(target, magneticTarget(closest.x, closest.y, item.width, item.height, closest.edge.distance));
        Object.assign(target, contourTarget(closest.x, closest.y, item.width, item.height, closest.edge.distance));
      }
      let changed = false;
      for (const axis of ['pullX', 'pullY', 'shiftX', 'shiftY']) {
        const force = (target[axis] - item.state[axis]) * 230 - item.velocity[axis] * 23;
        item.velocity[axis] += force * dt;
        item.state[axis] += item.velocity[axis] * dt;
        if (Math.abs(target[axis] - item.state[axis]) > 0.03 || Math.abs(item.velocity[axis]) > 0.03) changed = true;
        else { item.state[axis] = target[axis]; item.velocity[axis] = 0; }
      }
      if (changed || item.wasMoving) {
        item.element.style.translate = `${item.state.shiftX}px ${item.state.shiftY}px`;
        draw(item);
      }
      item.wasMoving = changed;
      moving ||= changed;
    }
    if (moving || time < followUntil) frame = requestAnimationFrame(update);
  }

  const listen = (target, event, handler) => target.addEventListener(event, handler, { passive: true, signal: events.signal });
  listen(window, 'pointermove', event => {
    if (event.pointerType === 'touch') return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    wake();
  });
  const leave = () => { pointer.active = false; wake(); };
  listen(document.documentElement, 'pointerleave', leave);
  listen(window, 'blur', leave);
  listen(window, 'wheel', () => wake(1200));
  listen(window, 'scroll', () => wake(1200));
  listen(window, 'resize', () => { for (const item of items.values()) measure(item); wake(200); });
  listen(document, 'visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; pointer.active = false; }
    else wake();
  });
  const mutations = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && (node.matches(SELECTOR) || node.querySelector(SELECTOR))))) refresh();
  });
  mutations.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  refresh();
  return () => {
    events.abort();
    mutations.disconnect();
    resize.disconnect();
    cancelAnimationFrame(frame);
    for (const item of [...items.values()]) restore(item);
  };
}

if (typeof document !== 'undefined') {
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let stop = null;
  const sync = () => {
    stop?.();
    stop = mouse.matches && !reducedMotion.matches ? startLiquidCapsules() : null;
  };
  mouse.addEventListener('change', sync);
  reducedMotion.addEventListener('change', sync);
  sync();
}
