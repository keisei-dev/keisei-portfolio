import Lenis from 'lenis';

/**
 * Page-wide smooth wheel on desktop. Touch stays native.
 * Reduced motion never starts Lenis. One rAF drives it.
 * Nothing here snaps the user back after they stop.
 */

const EASE_OUT_EXPO = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const DURATION = 1.1;
const KEYS = new Set([
  'PageDown',
  'PageUp',
  'ArrowDown',
  'ArrowUp',
  'Home',
  'End',
  ' ',
]);

type Listener = (scroll: number) => void;

const listeners = new Set<Listener>();
let lenis: Lenis | null = null;
let rafId = 0;
let nativeBound = false;

const desktopQuery = () =>
  window.matchMedia('(min-width: 768px) and (pointer: fine)');

function emit(scroll: number) {
  for (const fn of listeners) fn(scroll);
}

function headerOffset() {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return -72;
  return -Math.ceil(header.getBoundingClientRect().height) - 8;
}

function frame(time: number) {
  lenis?.raf(time);
  rafId = requestAnimationFrame(frame);
}

function emitNative() {
  emit(window.scrollY);
}

function bindNative() {
  if (nativeBound) return;
  nativeBound = true;
  window.addEventListener('scroll', emitNative, { passive: true });
}

function unbindNative() {
  if (!nativeBound) return;
  nativeBound = false;
  window.removeEventListener('scroll', emitNative);
}

function keyDistance(key: string) {
  const page = window.innerHeight;
  if (key === 'PageDown' || key === ' ') return page;
  if (key === 'PageUp') return -page;
  if (key === 'ArrowDown') return 48;
  if (key === 'ArrowUp') return -48;
  return 0;
}

function onKeyDown(event: KeyboardEvent) {
  if (!lenis || event.metaKey || event.ctrlKey || event.altKey) return;
  if (!KEYS.has(event.key)) return;
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
      (event.key === ' ' && target.closest('a, button, [role="button"]')))
  ) {
    return;
  }
  event.preventDefault();
  if (event.key === 'Home') {
    lenis.scrollTo(0, { duration: DURATION });
    return;
  }
  if (event.key === 'End') {
    lenis.scrollTo(lenis.limit, { duration: DURATION });
    return;
  }
  lenis.scrollTo(lenis.scroll + keyDistance(event.key), { duration: DURATION });
}

function onAnchorClick(event: MouseEvent) {
  if (!lenis) return;
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const node = event.target;
  if (!(node instanceof Element)) return;
  const anchor = node.closest('a');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  const href = anchor.getAttribute('href');
  if (!href || !href.includes('#')) return;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
  if (!url.hash || url.hash === '#') return;
  const target = document.querySelector(url.hash);
  if (!(target instanceof HTMLElement)) return;
  event.preventDefault();
  lenis.scrollTo(target, { offset: headerOffset(), duration: DURATION });
}

function startLenis() {
  if (lenis) return;
  unbindNative();
  lenis = new Lenis({
    autoRaf: false,
    duration: DURATION,
    easing: EASE_OUT_EXPO,
    smoothWheel: true,
    syncTouch: false,
    anchors: false,
    stopInertiaOnNavigate: false,
  });
  lenis.on('scroll', (instance) => {
    emit(instance.scroll);
  });
  document.addEventListener('click', onAnchorClick);
  if (!rafId) rafId = requestAnimationFrame(frame);
  emit(lenis.scroll);
}

function stopLenis() {
  document.removeEventListener('click', onAnchorClick);
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  lenis?.destroy();
  lenis = null;
  bindNative();
  emit(window.scrollY);
}

export function pageScrollY() {
  return lenis ? lenis.scroll : window.scrollY;
}

export function onPageScroll(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Anchor and focus jumps go through Lenis when it is running. */
export function scrollPageTo(target: number | HTMLElement, offset = 0) {
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: DURATION });
    return;
  }
  if (typeof target === 'number') {
    window.scrollTo({ top: target + offset, behavior: 'auto' });
    return;
  }
  const top = target.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior: 'auto' });
}

export function refreshScrollBounds() {
  lenis?.resize();
}

export function initSmoothScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const query = desktopQuery();
  const sync = () => {
    if (query.matches) startLenis();
    else stopLenis();
  };

  sync();
  query.addEventListener('change', sync);
  window.addEventListener('keydown', onKeyDown, true);
}
