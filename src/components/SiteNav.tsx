const LINKS = [
  { href: '#about', label: 'about' },
  { href: '#skills', label: 'skills' },
  { href: '#projects', label: 'work' },
  { href: '#contact', label: 'contact' },
] as const;

export default function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Primary">
      <ul>
        {LINKS.map((link) => (
          <li key={link.href}>
            <a href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
