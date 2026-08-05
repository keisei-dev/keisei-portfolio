import { useCallback, useEffect, useRef, useState } from 'react';

const LINKS = [
  { href: '#about', label: 'About', index: '01' },
  { href: '#skills', label: 'Skills', index: '02' },
  { href: '#projects', label: 'Projects', index: '03' },
  { href: '#value', label: 'Value', index: '04' },
  { href: '#contact', label: 'Contact', index: '05' },
] as const;

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    document.documentElement.classList.toggle('nav-open', open);
    return () => {
      document.documentElement.classList.remove('nav-open');
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    const onPointerDown = (e: MouseEvent) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      if (e.target instanceof Node && !wrap.contains(e.target)) {
        close();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onPointerDown);
    };
  }, [open, close]);

  return (
    <div className={`nav-wrap${open ? ' is-open' : ''}`} ref={wrapRef}>
      <button
        className="menu-toggle"
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        <span className="menu-toggle__label">{open ? 'Close' : 'Menu'}</span>
        <span className="menu-toggle__box" aria-hidden="true">
          <span className="menu-toggle__bar" />
          <span className="menu-toggle__bar" />
        </span>
      </button>

      <div className="nav-backdrop" hidden={!open} onClick={close} />

      <nav
        className="site-nav"
        id="site-menu"
        aria-label="Primary"
        hidden={!open}
      >
        <div className="site-nav__panel">
          <header className="site-nav__head">
            <p className="nav-label">Navigate</p>
            <p className="nav-meta">Keisei Kondo</p>
          </header>
          <ul>
            {LINKS.map((link, i) => (
              <li key={link.href} style={{ ['--i' as string]: i }}>
                <a href={link.href} onClick={close}>
                  <span className="nav-index">{link.index}</span>
                  <span className="nav-link-text">{link.label}</span>
                </a>
              </li>
            ))}
          </ul>
          <footer className="site-nav__foot">
            <span>Front-End Developer</span>
            <a href="mailto:keisei20001206@gmail.com">Email</a>
          </footer>
        </div>
      </nav>
    </div>
  );
}
