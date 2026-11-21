export {};
/** One visibility controller owns replay; content is never hidden while waiting. */
const root = document.documentElement;
(window as unknown as { __rt: number }).__rt = 1;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const selector = '[data-reveal],.section>h2,.page-head>*,.product__media,.product__info,.cta-band__inner,.price-table tbody';
const elements = [...document.querySelectorAll<HTMLElement>(selector)];
const inside = new Set<HTMLElement>();
const running = new Map<HTMLElement, Animation[]>();
type PriceRun = { original: string; prefix: string; suffix: string; value: number; start: number };
const originals = new WeakMap<HTMLElement, string>();
const counters = new Map<HTMLElement, PriceRun>();
const number = new Intl.NumberFormat('ru-RU');
let counterFrame = 0;
const priceNodes = (scope: HTMLElement) => scope.matches('.price[data-price]') ? [scope]
  : [...scope.querySelectorAll<HTMLElement>('.price[data-price]')];
const restorePrice = (price: HTMLElement) => {
  counters.delete(price);
  const original = originals.get(price);
  if (original !== undefined) price.textContent = original;
  price.classList.remove('is-counting');
  price.style.minWidth = '';
};
const countFrame = (now: number) => {
  counterFrame = 0;
  for (const [price, run] of counters) {
    const progress = Math.max(0, Math.min(1, (now - run.start) / 1000));
    if (progress >= 1) { restorePrice(price); continue; }
    const value = Math.round(run.value * (1 - (1 - progress) ** 3));
    price.textContent = run.prefix + number.format(value) + run.suffix;
  }
  if (counters.size) counterFrame = requestAnimationFrame(countFrame);
};
const countPrices = (scope: HTMLElement, delay: number) => {
  if (reduced.matches) return;
  const nodes = priceNodes(scope).filter((price) => {
    const box = price.getBoundingClientRect();
    return isVisible(price) && box.top < innerHeight - 100;
  }).map((price) => ({ price, width: price.getBoundingClientRect().width }));
  nodes.forEach(({ price, width }, index) => {
    const original = originals.get(price) ?? price.textContent ?? '';
    originals.set(price, original);
    const digits = /\d[\d\s\u00a0\u202f]*/.exec(original);
    const value = Number(price.dataset.price);
    if (!digits || !Number.isFinite(value) || value <= 0) return;
    const numericText = digits[0].trimEnd();
    const prefix = original.slice(0, digits.index);
    const suffix = original.slice(digits.index + numericText.length);
    counters.set(price, { original, prefix, suffix, value, start: performance.now() + delay + index * 65 });
    price.style.minWidth = `${width}px`;
    price.classList.add('is-counting');
    price.textContent = prefix + '0' + suffix;
  });
  if (counters.size && !counterFrame) counterFrame = requestAnimationFrame(countFrame);
};
const stop = (el: HTMLElement) => {
  running.get(el)?.forEach((a) => a.cancel());
  running.delete(el);
  priceNodes(el).forEach(restorePrice);
  if (!counters.size) { cancelAnimationFrame(counterFrame); counterFrame = 0; }
};
const isVisible = (el: HTMLElement) => {
  if (el.closest('[hidden]')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
};
const play = (el: HTMLElement, order = 0) => {
  stop(el);
  el.classList.add('in');
  if (reduced.matches) return;
  // The observed box only fades. Moving that box caused observer-boundary flicker.
  const delay = Math.min(order, 4) * 60;
  countPrices(el, delay + 100);
  const animations = [el.animate([{ opacity: .48 }, { opacity: 1 }], {
    duration: 650, delay, easing: 'ease-out', fill: 'backwards',
  })];
  const children = el.matches('.card,.steps__item,.price-tabs__filters')
    ? [...el.children].filter((e): e is HTMLElement => e instanceof HTMLElement && !e.matches('h1,h2,h3,h4,.price-list')) : [];
  const rows = [...el.querySelectorAll<HTMLElement>('.price-row')];
  children.forEach((child, index) => {
    const filter = el.matches('.price-tabs__filters');
    animations.push(child.animate([
      { opacity: filter ? .15 : .4, transform: 'translateY(12px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 600, fill: 'backwards', delay: delay + Math.min(index, 8) * 65, easing: 'cubic-bezier(.22,1,.36,1)' }));
  });
  rows.forEach((row, index) => {
    const rowDelay = delay + 100 + Math.min(index, 5) * 70;
    animations.push(row.animate([
      { opacity: .1, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'translateX(0)' },
    ], { duration: 600, delay: rowDelay, fill: 'backwards', easing: 'cubic-bezier(.22,1,.36,1)' }));
    const leader = row.querySelector<HTMLElement>('.price-row__leader');
    if (leader) animations.push(leader.animate([{ scale: '0 1' }, { scale: '1 1' }], {
      duration: 850, delay: rowDelay, fill: 'backwards', easing: 'ease-out',
    }));
  });
  running.set(el, animations);
  Promise.all(animations.map((a) => a.finished)).then(() => {
    if (running.get(el) === animations) running.delete(el);
  }).catch(() => {});
};
const observer = new IntersectionObserver((entries) => {
  let order = 0;
  for (const entry of entries) {
    const el = entry.target as HTMLElement;
    if (entry.isIntersecting && !el.closest('[hidden]')) {
      if (!inside.has(el)) { inside.add(el); play(el, order++); }
    } else {
      inside.delete(el);
      stop(el);
      el.classList.remove('in');
    }
  }
});
elements.forEach((el) => { el.dataset.reveal = ''; observer.observe(el); });
// A tall card can enter before its price. Start numbers when the amount itself is visible.
const priceObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const price = entry.target as HTMLElement;
    if (entry.isIntersecting && !price.closest('[hidden]')) {
      if (!counters.has(price)) countPrices(price, 100);
    } else restorePrice(price);
  }
}, { rootMargin: '0px 0px -100px 0px' });
document.querySelectorAll<HTMLElement>('.price[data-price]').forEach((price) => priceObserver.observe(price));
const replay = (scope: Element = document.body) => {
  let order = 0;
  for (const el of elements) {
    if (!scope.contains(el) && el !== scope) continue;
    // Re-observe after a filter change so stale hidden-panel entries cannot win.
    observer.unobserve(el);
    inside.delete(el);
    stop(el);
    if (isVisible(el)) { inside.add(el); play(el, order++); }
    observer.observe(el);
  }
};
document.addEventListener('kontur:reveal', (event) => {
  const scope = (event as CustomEvent<{ scope: Element }>).detail?.scope;
  if (scope) replay(scope);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { for (const el of [...counters.keys()]) restorePrice(el); cancelAnimationFrame(counterFrame); counterFrame = 0; }
  else replay();
});
window.addEventListener('pageshow', (event) => { if (event.persisted) replay(); });
reduced.addEventListener('change', () => {
  if (reduced.matches) {
    for (const el of [...running.keys()]) stop(el);
    for (const price of [...counters.keys()]) restorePrice(price);
    cancelAnimationFrame(counterFrame); counterFrame = 0;
  }
  else replay();
});

// Desktop header stays steady; the mobile header scrolls away with the document.
const bar = document.querySelector<HTMLElement>('.scroll-progress');
if (bar && !CSS.supports('animation-timeline: scroll()')) {
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      bar.style.setProperty('--sp', String(scrollY / Math.max(1, root.scrollHeight - innerHeight)));
      scheduled = false;
    });
  }, { passive: true });
}

const $$ = <T extends Element = HTMLElement>(s: string) => [...document.querySelectorAll<T>(s)];
const on = (t: EventTarget, e: string, f: EventListener) => t.addEventListener(e, f);
// ---------- заявка: mailto + копирование шаблона (работает и без анимаций) ----------
for (const form of $$<HTMLFormElement>('form[data-lead]')) {
  const email = form.dataset.email ?? '';
  const out = form.querySelector<HTMLElement>('[data-template]');
  const build = () => {
    const f = new FormData(form);
    const val = (k: string) => String(f.get(k) ?? '').trim();
    const subject = `Заявка с сайта: ${val('item') || 'рабочие перчатки'}`;
    const body = [
      `Что нужно: ${val('item')}`,
      `Количество: ${val('qty')}`,
      `Организация и реквизиты: ${val('org')}`,
      `Доставка: ${val('delivery')}`,
      `Контакт: ${val('contact')}`,
      val('comment') && `Комментарий: ${val('comment')}`,
    ].filter(Boolean).join('\n');
    return { subject, body };
  };
  const refresh = () => { if (out) out.textContent = `Тема: ${build().subject}\n\n${build().body}`; };
  on(form, 'input', refresh);
  refresh();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { subject, body } = build();
    // данные никуда не отправляются со страницы: открывается почтовый клиент пользователя
    location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  form.querySelector<HTMLButtonElement>('[data-copy]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const { subject, body } = build();
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      btn.textContent = 'Скопировано';
    } catch {
      btn.textContent = 'Не удалось скопировать — выделите текст ниже';
    }
  });
}
