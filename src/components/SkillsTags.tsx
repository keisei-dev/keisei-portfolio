import type { ReactNode, SVGProps } from 'react';
import type { SimpleIcon } from 'simple-icons';
import {
  siAstro,
  siCss,
  siExpress,
  siGit,
  siGithub,
  siHtml5,
  siJavascript,
  siNeon,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siReact,
  siSass,
  siSocketdotio,
  siSupabase,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
  siVercel,
} from 'simple-icons';

type Skill = {
  name: string;
  icon?: SimpleIcon;
  fallback?: 'sql' | 'rest' | 'cookie' | 'form';
};

const GROUPS: { label: string; items: Skill[] }[] = [
  {
    label: 'Languages',
    items: [
      { name: 'TypeScript', icon: siTypescript },
      { name: 'JavaScript', icon: siJavascript },
      { name: 'HTML', icon: siHtml5 },
      { name: 'CSS', icon: siCss },
      { name: 'SCSS', icon: siSass },
      { name: 'SQL', fallback: 'sql' },
    ],
  },
  {
    label: 'Frontend',
    items: [
      { name: 'React', icon: siReact },
      { name: 'Next.js (App Router)', icon: siNextdotjs },
      { name: 'Astro', icon: siAstro },
      { name: 'Tailwind CSS', icon: siTailwindcss },
      { name: 'Three.js', icon: siThreedotjs },
    ],
  },
  {
    label: 'Backend',
    items: [
      { name: 'Node.js', icon: siNodedotjs },
      { name: 'Express', icon: siExpress },
      { name: 'Socket.IO', icon: siSocketdotio },
      { name: 'REST APIs', fallback: 'rest' },
      { name: 'cookie-based sessions', fallback: 'cookie' },
    ],
  },
  {
    label: 'Database',
    items: [
      { name: 'PostgreSQL (node-postgres)', icon: siPostgresql },
      { name: 'Neon', icon: siNeon },
      { name: 'Supabase', icon: siSupabase },
    ],
  },
  {
    label: 'Tools',
    items: [
      { name: 'Git', icon: siGit },
      { name: 'GitHub', icon: siGithub },
      { name: 'Vercel', icon: siVercel },
      { name: 'Web3Forms', fallback: 'form' },
    ],
  },
];

function IconFrame(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="skill-icon" {...props} />;
}

function BrandIcon({ icon }: { icon: SimpleIcon }) {
  return (
    <IconFrame>
      <path d={icon.path} fill="currentColor" />
    </IconFrame>
  );
}

function FallbackIcon({ kind }: { kind: NonNullable<Skill['fallback']> }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const marks: Record<NonNullable<Skill['fallback']>, ReactNode> = {
    sql: (
      <>
        <rect x="3.5" y="4" width="17" height="16" rx="2" {...common} />
        <path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5V20" {...common} />
      </>
    ),
    rest: (
      <>
        <circle cx="6" cy="12" r="2.2" {...common} />
        <circle cx="18" cy="7" r="2.2" {...common} />
        <circle cx="18" cy="17" r="2.2" {...common} />
        <path d="M8 11.2 15.8 8.1M8 12.8l7.8 3.1" {...common} />
      </>
    ),
    cookie: (
      <>
        <path
          d="M12 4.2a7.8 7.8 0 1 0 7.6 9.4 3.1 3.1 0 0 1-4.2-4.1A7.8 7.8 0 0 0 12 4.2Z"
          {...common}
        />
        <circle cx="10" cy="11" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="13.2" cy="14.2" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="9.2" cy="15.4" r="0.7" fill="currentColor" stroke="none" />
      </>
    ),
    form: (
      <>
        <rect x="4" y="3.5" width="16" height="17" rx="2" {...common} />
        <path d="M8 8.5h8M8 12h8M8 15.5h5" {...common} />
      </>
    ),
  };
  return <IconFrame>{marks[kind]}</IconFrame>;
}

export default function SkillsTags() {
  return (
    <div className="skill-groups">
      {GROUPS.map((group, i) => (
        <section
          key={group.label}
          className="skill-group"
          aria-labelledby={`skill-${i}`}
          data-reveal
          style={{ ['--reveal-delay' as string]: `${0.05 + i * 0.06}s` }}
        >
          <h3 id={`skill-${i}`} className="skill-group__label">
            {group.label}
          </h3>
          <ul className="skill-list" role="list">
            {group.items.map((skill, j) => (
              <li key={skill.name} className="skill-item" style={{ ['--i' as string]: j }}>
                {skill.icon ? <BrandIcon icon={skill.icon} /> : <FallbackIcon kind={skill.fallback!} />}
                <span className="skill-item__name">{skill.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
