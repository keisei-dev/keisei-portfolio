const GROUPS = [
  {
    label: 'Languages',
    items: ['TypeScript', 'JavaScript', 'HTML', 'CSS', 'SCSS', 'SQL'],
  },
  {
    label: 'Frontend',
    items: ['React', 'Next.js (App Router)', 'Astro', 'Tailwind CSS', 'Three.js'],
  },
  {
    label: 'Backend',
    items: ['Node.js', 'Express', 'Socket.IO', 'REST APIs', 'cookie-based sessions'],
  },
  {
    label: 'Database',
    items: ['PostgreSQL (node-postgres)', 'Neon', 'Supabase'],
  },
  {
    label: 'Tools',
    items: ['Git', 'GitHub', 'Vercel', 'Web3Forms'],
  },
] as const;

export default function SkillsTags() {
  return (
    <div className="skill-groups">
      {GROUPS.map((group, i) => (
        <section
          key={group.label}
          className="skill-group"
          aria-labelledby={`skill-${i}`}
          data-reveal
          style={{ ['--reveal-delay' as string]: `${0.06 + i * 0.05}s` }}
        >
          <h3 id={`skill-${i}`} className="skill-group__label">
            {group.label}
          </h3>
          <ul className="tags" role="list">
            {group.items.map((skill) => (
              <li key={skill}>
                <span className="tag">{skill}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
