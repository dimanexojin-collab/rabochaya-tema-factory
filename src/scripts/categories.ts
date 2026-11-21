/** A finite native scroller: smooth range control, touch inertia and no loop seam. */
for (const track of document.querySelectorAll<HTMLElement>('[data-category-track]')) {
  const section = track.closest<HTMLElement>('[data-carousel]');
  const range = section?.querySelector<HTMLInputElement>('[data-category-position]');
  const controls = section?.querySelector<HTMLElement>('[data-category-controls]');
  if (!section || !range || !controls) continue;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 767px)');
  let visible = false, manual = false, hovered = false, rangeHeld = false;
  let maximum = 0, direction = 1, raf = 0, last = 0, position = 0;
  let target: number | null = null;
  let drag: { id: number; x: number; y: number; left: number; moved: boolean } | null = null;
  let suppressClick = false;
  const sync = () => {
    if (!rangeHeld && target === null) range.value = String(Math.round((manual ? track.scrollLeft : position) / Math.max(1, maximum) * 1000));
  };
  const autoplay = () => !manual && !hovered && !section.matches(':focus-within') && !reduced.matches;
  const tick = (time: number) => {
    raf = 0;
    if (!visible || document.hidden || maximum <= 0) return;
    const dt = Math.min(.05, (time - last) / 1000 || 1 / 60);
    last = time;
    if (target !== null) {
      const distance = target - position;
      if (Math.abs(distance) < .75 || reduced.matches) {
        position = target;
        track.scrollLeft = position;
        target = null;
      } else { position += distance * (1 - Math.exp(-dt * 16)); track.scrollLeft = position; }
    } else if (autoplay()) {
      const speed = Math.min(small.matches ? 18 : 24, maximum / 24);
      const next = position + direction * speed * dt;
      position = Math.max(0, Math.min(maximum, next));
      track.scrollLeft = position;
      // Reverse smoothly at the end instead of snapping the thumb from 100% to 0%.
      if (next >= maximum) direction = -1;
      else if (next <= 0) direction = 1;
    }
    sync();
    if (target !== null || autoplay()) raf = requestAnimationFrame(tick);
  };
  const start = () => {
    if (!raf && visible && !document.hidden && maximum > 0 && (target !== null || autoplay())) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  const setPosition = () => {
    manual = true;
    position = track.scrollLeft;
    target = Number(range.value) / 1000 * maximum;
    if (reduced.matches) { track.scrollLeft = target; target = null; }
    else start();
  };
  range.disabled = false;
  section.querySelector('[data-category-prev]')?.addEventListener('click', () => {
    range.value = String(Math.max(0, Number(range.value) - 1000 / Math.max(1, track.children.length - 1)));
    setPosition();
  });
  section.querySelector('[data-category-next]')?.addEventListener('click', () => {
    range.value = String(Math.min(1000, Number(range.value) + 1000 / Math.max(1, track.children.length - 1)));
    setPosition();
  });
  range.addEventListener('input', setPosition);
  range.addEventListener('pointerdown', () => { rangeHeld = true; manual = true; });
  window.addEventListener('pointerup', () => { rangeHeld = false; sync(); }, { passive: true });
  window.addEventListener('pointercancel', () => { rangeHeld = false; sync(); }, { passive: true });
  track.addEventListener('scroll', () => {
    if (manual && target === null) position = track.scrollLeft;
    sync();
  }, { passive: true });
  track.addEventListener('focusin', () => { manual = true; position = track.scrollLeft; });
  track.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') hovered = true; });
  track.addEventListener('pointerleave', () => { hovered = false; start(); });
  section.addEventListener('focusout', () => queueMicrotask(start));
  track.addEventListener('keydown', (event) => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    range.value = event.key === 'Home' ? '0' : event.key === 'End' ? '1000'
      : String(Math.max(0, Math.min(1000, Number(range.value) + (event.key === 'ArrowRight' ? 100 : -100))));
    setPosition();
  });
  track.addEventListener('pointerdown', (event) => {
    manual = true; target = null; position = track.scrollLeft; suppressClick = false;
    // Touch uses the browser's native horizontal scrolling and inertia.
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: track.scrollLeft, moved: false };
  });
  track.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { drag = null; return; }
      if (Math.abs(dx) < 8) return;
      drag.moved = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
    }
    track.scrollLeft = drag.left - dx;
  });
  const finish = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    suppressClick = drag.moved;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    track.classList.remove('is-dragging');
    drag = null;
  };
  track.addEventListener('pointerup', finish);
  track.addEventListener('pointercancel', finish);
  track.addEventListener('dragstart', (event) => event.preventDefault());
  track.addEventListener('click', (event) => {
    if (suppressClick) { event.preventDefault(); suppressClick = false; }
  }, true);
  new ResizeObserver(() => {
    maximum = Math.max(0, track.scrollWidth - track.clientWidth);
    position = track.scrollLeft;
    controls.hidden = maximum < 1;
    if (target !== null) target = Math.min(maximum, target);
    sync(); start();
  }).observe(track);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { cancelAnimationFrame(raf); raf = 0; }
    else start();
  }).observe(track);
  reduced.addEventListener('change', () => { if (target !== null) setPosition(); start(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else start();
  });
  track.classList.add('is-native');
}

