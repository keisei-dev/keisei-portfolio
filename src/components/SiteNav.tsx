const LINKS = [
  { href: '#about', label: 'about', index: '01' },
  { href: '#skills', label: 'skills', index: '02' },
  { href: '#projects', label: 'work', index: '03' },
  { href: '#contact', label: 'contact', index: '04' },
] as const;

export default function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Primary">
      <ul>
        {LINKS.map((link) => (
          <li key={link.href}>
            <a href={link.href}>
              <span className="nav-index">{link.index}</span>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
