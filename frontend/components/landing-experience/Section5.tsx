'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { fetchMergedPublicPackages, getDefaultPackages, type UiPackage } from '../../lib/publicPackages';
import { LANDING_MOBILE_MQ } from './landingBreakpoints';
import { useScrollReveal } from './useScrollReveal';

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
  const revealed = useScrollReveal(rootRef, { mobileOnly: true, threshold: 0.08 });
  const entryProg = useRef(0);
  const entryTgt = useRef(0);
  const spreadProg = useRef(0);
  const flipProg = useRef(0);
  const [activeStackIndex, setActiveStackIndex] = useState(0);

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

  const many = plans.length > 4;

  const getCardTransformVars = (idx: number, total: number) => {
    if (total <= 1) {
      return { ox: '0%', oy: '10px', or: '0deg', z: 1 };
    }

    const mid = (total - 1) / 2;
    const d = mid - idx; // +right, -left
    const abs = Math.abs(d);

    const ox = `${d * 120}%`;
    const oy = `${10 + abs * 34}px`;
    const or = `${-d * 10}deg`;
    const z = Math.round(10 - abs);

    return { ox, oy, or, z };
  };

  useEffect(() => {
    const mobileMq = window.matchMedia(LANDING_MOBILE_MQ);
    if (!mobileMq.matches || !entryRef.current) return;
    entryRef.current.style.opacity = '';
    entryRef.current.style.transform = '';
    entryRef.current.style.filter = '';
  }, []);

  useEffect(() => {
    const mobileMq = window.matchMedia(LANDING_MOBILE_MQ);
    if (!mobileMq.matches || many) return;

    const root = rootRef.current;
    if (!root) return;

    const slots = root.querySelectorAll<HTMLElement>('.s5-card-stack-slot');
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
  }, [many, plans.length]);

  useEffect(() => {
    const mobileMq = window.matchMedia(LANDING_MOBILE_MQ);
    if (mobileMq.matches) return;

    let rafId: number;
    let flipHoldUntil = 0;
    let unflipStartedAt = 0;

    /** Spread → flip → long hold for viewing; cover happens late in the runway. */
    const SPREAD_END = 0.28;
    const FLIP_START = 0.3;
    const FLIP_END = 0.46;
    const FLIP_HOLD_MS = 2600;
    const UNFLIP_MS = 900;

    const phaseProgress = (t: number, start: number, end: number) =>
      Math.max(0, Math.min(1, (t - start) / (end - start)));

    const loop = () => {
      if (rootRef.current && entryRef.current) {
        const vh = window.innerHeight;
        const section = rootRef.current;
        const rect = section.getBoundingClientRect();

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

        // Progress only while the section is sticky (same approach as Section 3).
        let pinned = 0;
        if (rect.top <= 0) {
          const maxScroll = rect.height - vh;
          if (maxScroll > 0) {
            pinned = Math.max(0, Math.min(1, Math.abs(rect.top) / maxScroll));
          } else if (rect.bottom <= vh) {
            pinned = 1;
          }
        } else if (rect.bottom <= 0) {
          pinned = 1;
        }

        const spreadTgt = phaseProgress(pinned, 0, SPREAD_END);
        const scrollFlipTgt = phaseProgress(pinned, FLIP_START, FLIP_END);

        let flipTgt = scrollFlipTgt;

        if (
          flipHoldUntil === 0 &&
          (flipProg.current >= 0.72 || scrollFlipTgt >= 0.92)
        ) {
          flipHoldUntil = performance.now() + FLIP_HOLD_MS;
        }

        if (flipHoldUntil > 0 && performance.now() < flipHoldUntil) {
          flipTgt = Math.max(flipTgt, flipProg.current, 0.72);
        } else if (flipHoldUntil > 0 && flipProg.current > 0.08) {
          if (unflipStartedAt === 0) unflipStartedAt = performance.now();
          const unflipT = Math.min(1, (performance.now() - unflipStartedAt) / UNFLIP_MS);
          flipTgt = Math.min(flipTgt, 1 - unflipT);
        }

        if (flipProg.current < 0.05 && scrollFlipTgt < 0.1) {
          flipHoldUntil = 0;
          unflipStartedAt = 0;
        }

        const enterOp = Math.min(1, e * 1.25);
        // Packages stay locked in place while pinned — next section covers them.
        // Do not translate/fade them away (that reads as the section “scrolling”).
        entryRef.current.style.opacity = String(enterOp);
        entryRef.current.style.transform = `translateY(${(1 - e) * 70}px)`;
        entryRef.current.style.filter = 'none';
        entryRef.current.style.pointerEvents = '';

        const sCurr = spreadProg.current;
        const sNext = sCurr + (spreadTgt - sCurr) * 0.06;
        spreadProg.current = Math.abs(spreadTgt - sNext) < 0.0006 ? spreadTgt : sNext;

        const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
        rootRef.current.style.setProperty('--spread', String(easeOutQuint(spreadProg.current)));

        const fCurr = flipProg.current;
        const flipLerp = flipTgt < fCurr ? 0.045 : 0.085;
        const fNext = fCurr + (flipTgt - fCurr) * flipLerp;
        flipProg.current = Math.abs(flipTgt - fNext) < 0.0006 ? flipTgt : fNext;
        rootRef.current.style.setProperty('--flip', String(easeOutQuint(flipProg.current)));
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const renderPlanCard = (p: PackagePlan, i: number) => {
    const v = getCardTransformVars(i, plans.length);
    return (
      <article
        className={`s5-card${p.badge ? ' s5-card--featured' : ''}`}
        style={
          {
            '--fd': `${i * 0.055}`,
            '--ox': v.ox,
            '--oy': v.oy,
            '--or': v.or,
            '--reveal-i': i,
            '--stack-i': i,
            zIndex: v.z,
          } as React.CSSProperties
        }
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
    );
  };

  return (
    <section
      ref={rootRef}
      id="packages"
      className={`s5${many ? ' s5--many' : ' s5--stack'}${revealed ? ' s5--revealed' : ''}`}
      style={{ '--stack-count': plans.length } as React.CSSProperties}
    >
      <div className="s5__sticky">
        <div ref={entryRef} className="s5__entry" style={{ opacity: 0, transform: 'translateY(70px)' }}>
          <div className="s5__inner">
            <div className="s5__head">
              <p className="s5__kicker">Packages</p>
              <h2 className="s5__title">Choose your plan</h2>
              <p className="s5__sub">
              </p>
              {!many && plans.length > 1 && (
                <div className="s5-stack-rail" aria-hidden>
                  {plans.map((p, i) => (
                    <span
                      key={p.id}
                      className={`s5-stack-rail__pip${
                        activeStackIndex === i ? ' is-active' : ''
                      }${activeStackIndex > i ? ' is-passed' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className={`s5__cards${!many ? ' s5__cards--stack' : ''}`}>
              {plans.map((p, i) =>
                many ? (
                  renderPlanCard(p, i)
                ) : (
                  <div
                    key={p.id}
                    className="s5-card-stack-slot"
                    data-stack-index={i}
                    style={{ '--stack-i': i } as React.CSSProperties}
                  >
                    {renderPlanCard(p, i)}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
