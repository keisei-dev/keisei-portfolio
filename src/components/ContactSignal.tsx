import { useState } from 'react';

export default function ContactSignal() {
  const [sending, setSending] = useState(false);

  return (
    <div
      className={`signal${sending ? ' is-sending' : ''}`}
      onMouseEnter={() => setSending(true)}
      onMouseLeave={() => setSending(false)}
      onFocusCapture={() => setSending(true)}
      onBlurCapture={() => setSending(false)}
    >
      <div className="signal__core">
        <span className="signal__ring" aria-hidden="true" />
        <span className="signal__ring signal__ring--two" aria-hidden="true" />
        <span className="signal__streak" aria-hidden="true" />
        <a className="cta signal__cta" href="mailto:keisei20001206@gmail.com">
          Email me
          <span className="cta-arrow" aria-hidden="true">
            {' '}
            →
          </span>
        </a>
      </div>
      <span className="signal__label" aria-hidden="true">
        Reach out
      </span>
    </div>
  );
}
