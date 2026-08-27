'use client';

import { useEffect, useRef, useState } from 'react';
import { useScrollReveal } from './useScrollReveal';

const CARDS = [
  {
    title: 'EXECUTION',
    items: ['Ultra-fast routing', 'Clean fills', 'Stable pricing', 'Major FX pairs', 'Zero spread accounts'],
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    title: 'SIGNALS',
    items: [
      'Multi-factor confirmation',
      'Market structure',
      'Momentum indicators',
      'Key levels',
      'Actionable alerts',
    ],
    icon: 'M3 3v18h18M18 9l-5 5-4-4-6 6',
  },
  {
    title: 'RISK',
    items: [
      'Defined invalidation',
      'Position sizing',
      'Consistent playbooks',
      'Discipline tracking',
      'Capital protection',
    ],
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  },
  {
    title: 'ANALYTICS',
    items: [
      'Live market bias',
      'Volatility metrics',
      'Session context',
      'Performance tracking',
      'Trade journaling',
    ],
    icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
  },
];

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

export default function Section3() {
  const rootRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const revealed = useScrollReveal(rootRef, { mobileOnly: true, threshold: 0.1 });
  const [activeStackIndex, setActiveStackIndex] = useState(0);

  const entryProg = useRef(0);
  const entryTgt = useRef(0);
  const spreadProg = useRef(0);

  useEffect(() => {
    const mobileMq = window.matchMedia('(max-width: 1024px)');
    if (!mobileMq.matches || !stickyRef.current) return;
    stickyRef.current.style.opacity = '';
    stickyRef.current.style.transform = '';
  }, []);

  useEffect(() => {
    const mobileMq = window.matchMedia('(max-width: 1024px)');
    if (!mobileMq.matches) return;

    const root = rootRef.current;
    if (!root) return;

    const slots = root.querySelectorAll<HTMLElement>('.s3-card-stack-slot');
    if (!slots.length) return;

    const syncSlotStates = () => {
      let bestIdx = 0;
      let bestRatio = -1;

      slots.forEach((slot) => {
        const idx = Number(slot.dataset.stackIndex);
        const rect = slot.getBoundingClientRect();
        const vh = window.innerHeight;
        const visible = Math.min(rect.bottom, vh * 0.72) - Math.max(rect.top, vh * 0.22);
        const ratio = visible / Math.max(1, rect.height);

        slot.classList.toggle('is-passed', rect.bottom < vh * 0.28);
        slot.classList.toggle('is-active', ratio > 0.42 && rect.top < vh * 0.55);

        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestIdx = idx;
        }
      });

      setActiveStackIndex(bestIdx);
    };

    syncSlotStates();
    window.addEventListener('scroll', syncSlotStates, { passive: true });
    window.addEventListener('resize', syncSlotStates);

    return () => {
      window.removeEventListener('scroll', syncSlotStates);
      window.removeEventListener('resize', syncSlotStates);
    };
  }, []);

  useEffect(() => {
    const mobileMq = window.matchMedia('(max-width: 1024px)');
    if (mobileMq.matches) return;

    let rafId: number;

    const loop = () => {
      if (rootRef.current && stickyRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        const vh = window.innerHeight;

        if (rect.top >= 0) {
          entryTgt.current = Math.max(0, Math.min(1, 1 - rect.top / vh));
        } else {
          entryTgt.current = 1;
        }

        const eCurr = entryProg.current;
        const eTgt = entryTgt.current;
        const eNext = eCurr + (eTgt - eCurr) * 0.09;
        entryProg.current = Math.abs(eTgt - eNext) < 0.0006 ? eTgt : eNext;

        const eE = easeInOutQuart(entryProg.current);

        stickyRef.current.style.opacity = String(eE);
        stickyRef.current.style.transform = `translateY(${(1 - eE) * 80}px)`;

        let spreadTgt = 0;
        if (rect.top <= 0) {
          const maxScroll = rect.height - vh;
          if (maxScroll > 0) {
            spreadTgt = Math.max(0, Math.min(1, Math.abs(rect.top) / maxScroll));
          }
        }

        const sCurr = spreadProg.current;
        const sNext = sCurr + (spreadTgt - sCurr) * 0.06;
        spreadProg.current = Math.abs(spreadTgt - sNext) < 0.0006 ? spreadTgt : sNext;

        const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
        rootRef.current.style.setProperty('--spread', String(easeOutQuint(spreadProg.current)));
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const renderExpertCard = (c: (typeof CARDS)[number], i: number) => (
    <article
      className="s3-card"
      style={{ '--reveal-i': i, '--stack-i': i } as React.CSSProperties}
    >
      <div className="s3-card__header">
        <h3 className="s3-card__title">{c.title}</h3>
        <div className="s3-card__icon" aria-hidden>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={c.icon} />
          </svg>
        </div>
      </div>

      <ul className="s3-card__list">
        {c.items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <div className="s3-card__footer" aria-hidden>
        <div className="s3-card__icon s3-card__icon--bottom">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={c.icon} />
          </svg>
        </div>
        <h3 className="s3-card__title s3-card__title--bottom">{c.title}</h3>
      </div>
    </article>
  );

  return (
    <section
      ref={rootRef}
      id="expertise"
      className={`s3 s3--stack${revealed ? ' s3--revealed' : ''}`}
      style={{ '--stack-count': CARDS.length } as React.CSSProperties}
    >
      <div className="s3__sticky">
        <div ref={stickyRef} className="s3__entry" style={{ opacity: 0, transform: 'translateY(80px)' }}>
          <div className="s3__inner">
            <div className="s3__head">
              <h2 className="s3__title">EXPERTISE</h2>
              <div className="s3-stack-rail" aria-hidden>
                {CARDS.map((c, i) => (
                  <span
                    key={c.title}
                    className={`s3-stack-rail__pip${
                      activeStackIndex === i ? ' is-active' : ''
                    }${activeStackIndex > i ? ' is-passed' : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className="s3__cards s3__cards--stack">
              {CARDS.map((c, i) => (
                <div
                  key={c.title}
                  className="s3-card-stack-slot"
                  data-stack-index={i}
                  style={{ '--stack-i': i } as React.CSSProperties}
                >
                  {renderExpertCard(c, i)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
