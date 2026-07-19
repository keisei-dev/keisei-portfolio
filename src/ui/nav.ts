/** Hamburger menu: toggle, Escape, outside click, close on navigate. */
export function initNav() {
  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const nav = document.querySelector<HTMLElement>('.site-nav');
  const wrap = document.querySelector<HTMLElement>('.nav-wrap');
  const backdrop = document.querySelector<HTMLElement>('[data-nav-backdrop]');
  const label = document.querySelector<HTMLElement>('[data-menu-label]');
  if (!toggle || !nav || !wrap) return;

  const setOpen = (open: boolean) => {
    wrap.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (label) label.textContent = open ? 'Close' : 'Menu';

    if (open) {
      nav.removeAttribute('hidden');
      backdrop?.removeAttribute('hidden');
    } else {
      nav.setAttribute('hidden', '');
      backdrop?.setAttribute('hidden', '');
    }
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!wrap.classList.contains('is-open'));
  });

  backdrop?.addEventListener('click', () => setOpen(false));

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  document.addEventListener('click', (e) => {
    if (!wrap.classList.contains('is-open')) return;
    if (e.target instanceof Node && !wrap.contains(e.target)) {
      setOpen(false);
    }
  });
}
