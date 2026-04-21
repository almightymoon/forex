'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { fetchMergedPublicPackages, getDefaultPackages, type UiPackage } from '../../lib/publicPackages';

const ACCESS_BACK_ART = [
  '/landing/access-card.png',
  '/landing/access-card-red.png',
  '/landing/access-card-yellow.png',
] as const;

type PackagePlan = {
  id: string;
  name: string;
  price: string;
  cadence?: string;
  blurb: string;
  highlights: string[];
  badge?: string;
};

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function iconForPlan(id: string): string {
  const key = id.toLowerCase();
  if (key.includes('pro')) return 'M3 3v18h18M18 9l-5 5-4-4-6 6';
  if (key.includes('elite')) return 'M22 12h-4l-3 9L9 3l-3 9H2';
  if (key.includes('desk')) return 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z';
  return 'M13 10V3L4 14h7v7l9-11h-7z';
}

function uiPackagesToPlans(pkgs: UiPackage[]): PackagePlan[] {
  return pkgs.map((p, idx) => ({
    id: String(p._id ?? p.name ?? idx),
    name: p.name,
    price: `$${Number(p.price || 0).toFixed(0)}`,
    cadence: undefined,
    blurb: p.subtitle?.trim() || 'Structured access to signals, mentorship, and tools.',
    highlights: p.features?.length ? p.features : ['Premium platform access'],
    badge: p.badge ?? (p.highlight ? 'Most popular' : undefined),
  }));
}

export default function Section5() {
  const rootRef = useRef<HTMLElement>(null);
  const entryRef = useRef<HTMLDivElement>(null);
  const entryProg = useRef(0);
  const entryTgt = useRef(0);
  const spreadProg = useRef(0);
  const flipProg = useRef(0);
  const exitDepthProg = useRef(0);

  const [plans, setPlans] = useState<PackagePlan[]>(() => uiPackagesToPlans(getDefaultPackages()));

  useEffect(() => {
    let alive = true;
    (async () => {
      const merged = await fetchMergedPublicPackages();
      if (alive) setPlans(uiPackagesToPlans(merged));
    })();
    return () => {
      alive = false;
    };
  }, []);

  const many = plans.length > 3;

  useEffect(() => {
    let rafId: number;

    const loop = () => {
      if (rootRef.current && entryRef.current) {
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

        const e = easeInOutQuart(entryProg.current);

        let spreadTgt = 0;
        let maxScroll = 0;
        if (rect.top <= 0) {
          maxScroll = rect.height - vh;
          if (maxScroll > 0) {
            spreadTgt = Math.max(0, Math.min(1, Math.abs(rect.top) / maxScroll));
          }
        }

        let exitTgt = 0;
        if (rect.top <= 0 && maxScroll > 1) {
          const raw = Math.abs(rect.top) / maxScroll;
          exitTgt = raw < 0.38 ? 0 : Math.min(1, (raw - 0.38) / 0.62);
        }
        const edCurr = exitDepthProg.current;
        const edNext = edCurr + (exitTgt - edCurr) * 0.065;
        exitDepthProg.current = Math.abs(exitTgt - edNext) < 0.0008 ? exitTgt : edNext;
        const exit = easeInOutQuart(exitDepthProg.current);

        const ty = (1 - e) * 70;
        const tz = -exit * 260;
        const sc = 1 - exit * 0.12;
        entryRef.current.style.opacity = String(Math.min(1, e * 1.25) * (1 - exit * 0.38));
        entryRef.current.style.transform = `translateY(${ty}px) translateZ(${tz}px) scale(${sc})`;
        const sCurr = spreadProg.current;
        const sNext = sCurr + (spreadTgt - sCurr) * 0.06;
        spreadProg.current = Math.abs(spreadTgt - sNext) < 0.0006 ? spreadTgt : sNext;

        const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
        rootRef.current.style.setProperty('--spread', String(easeOutQuint(spreadProg.current)));

        const flipTgt = Math.max(0, Math.min(1, (spreadTgt - 0.35) / 0.65));
        const fCurr = flipProg.current;
        const fNext = fCurr + (flipTgt - fCurr) * 0.08;
        flipProg.current = Math.abs(flipTgt - fNext) < 0.0006 ? flipTgt : fNext;
        rootRef.current.style.setProperty('--flip', String(easeOutQuint(flipProg.current)));
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <section ref={rootRef} id="packages" className={`s5${many ? ' s5--many' : ''}`}>
      <div className="s5__sticky">
        <div ref={entryRef} className="s5__entry" style={{ opacity: 0, transform: 'translateY(70px)' }}>
          <div className="s5__inner">
            <div className="s5__head">
              <p className="s5__kicker">Packages</p>
              <h2 className="s5__title">Choose your plan</h2>
              <p className="s5__sub">
                Tiers mirror what you configure in admin — pricing, perks, and highlights stay in sync with checkout.
              </p>
            </div>

            <div className="s5__cards">
              {plans.map((p, i) => (
                <article
                  key={p.id}
                  className={`s5-card${p.badge ? ' s5-card--featured' : ''}`}
                  style={{ '--fd': `${i * 0.1}` } as React.CSSProperties}
                >
                  {p.badge && <div className="s5-card__badge">{p.badge}</div>}

                  <div className="s5-card__inner">
                    <div className="s5-card__face s5-card__face--back" aria-hidden>
                      <img
                        className="s5-card__back-art"
                        src={ACCESS_BACK_ART[i % ACCESS_BACK_ART.length] ?? '/landing/access-card.png'}
                        alt=""
                        draggable={false}
                      />
                    </div>

                    <div className="s5-card__face s5-card__face--front">
                      <div className="s5-card__header">
                        <div className="s5-card__header-left">
                          <h3 className="s5-card__title">{p.name}</h3>
                          <p className="s5-card__meta">
                            <span className="s5-card__meta-price">{p.price}</span>
                            {p.cadence && <span className="s5-card__meta-cad">{p.cadence}</span>}
                          </p>
                          {p.blurb && <p className="s5-card__blurb">{p.blurb}</p>}
                        </div>
                        <div className="s5-card__icon" aria-hidden>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d={iconForPlan(p.id)} />
                          </svg>
                        </div>
                      </div>

                      <ul className="s5-card__list">
                        {p.highlights.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>

                      <Link href="/register" className="s5-card__cta">
                        Get started
                      </Link>

                      <div className="s5-card__footer" aria-hidden>
                        <div className="s5-card__icon s5-card__icon--bottom">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d={iconForPlan(p.id)} />
                          </svg>
                        </div>
                        <h3 className="s5-card__title s5-card__title--bottom">{p.name}</h3>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
