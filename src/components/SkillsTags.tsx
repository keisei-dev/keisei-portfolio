const SKILLS = [
  'HTML',
  'CSS',
  'JavaScript',
  'TypeScript',
  'Astro',
  'React',
  'Node.js',
  'Express',
  'Three.js',
  'PostgreSQL',
  'Git',
  'GitHub',
] as const;

export default function SkillsTags() {
  return (
    <ul className="tags" role="list">
      {SKILLS.map((skill, i) => (
        <li
          key={skill}
          data-reveal
          style={{ ['--reveal-delay' as string]: `${0.08 + i * 0.04}s` }}
        >
          <span className="tag">{skill}</span>
        </li>
      ))}
    </ul>
  );
}
