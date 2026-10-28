/** Slide work cards in from the right once, when the section enters view. */
export function initWorkCards() {
  const section = document.getElementById('projects');
  if (!section) return;
  if (!document.documentElement.classList.contains('work-animate')) return;

  const cards = [
    ...section.querySelectorAll<HTMLElement>('.project-card, .project-note'),
  ];
  if (!cards.length) return;

  const settle = (card: HTMLElement) => {
    card.classList.add('is-settled');
  };

  const play = () => {
    cards.forEach((card) => {
      card.classList.add('is-in');
      card.addEventListener('animationend', () => settle(card), { once: true });
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      play();
      observer.disconnect();
    },
    { threshold: 0.18 },
  );

  observer.observe(section);
}
