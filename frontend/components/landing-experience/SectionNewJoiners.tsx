'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveBackendAssetUrl } from '../../lib/resolveBackendAssetUrl';
import { useLandingExperience } from './LandingExperienceContext';

type JoinerPublic = {
  name: string;
  country: string;
  pkg: string;
  imageUrl: string;
  accentBg: string;
};

type NewJoinersPublicPayload =
  | { enabled: false }
  | { enabled: true; joiners: JoinerPublic[] };

/** Shown when the API is off, empty, or still loading — keeps the block visible without admin setup. */
const FALLBACK_JOINERS: JoinerPublic[] = [
  {
    name: 'Jordan Ellis',
    country: 'United Kingdom',
    pkg: 'Professional Package',
    imageUrl: 'https://randomuser.me/api/portraits/men/75.jpg',
    accentBg: '#c41e3a',
  },
  {
    name: 'Maya Thompson',
    country: 'United States',
    pkg: 'Elite Signals Package',
    imageUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
    accentBg: '#d4a012',
  },
  {
    name: 'David Okoye',
    country: 'Nigeria',
    pkg: 'Starter Package',
    imageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    accentBg: '#1e3a5f',
  },
  {
    name: 'Sofia Andersson',
    country: 'Sweden',
    pkg: 'Institutional Desk Package',
    imageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    accentBg: '#7c3aed',
  },
  {
    name: 'Ryan Park',
    country: 'South Korea',
    pkg: 'Professional Package',
    imageUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
    accentBg: '#0d9488',
  },
];

async function fetchPublicNewJoiners(): Promise<NewJoinersPublicPayload> {
  const res = await fetch('/api/new-joiners/public', { cache: 'no-store' });
  if (!res.ok) return { enabled: false };
  return res.json();
}

function ArrowOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 17L17 7M17 7H9M17 7V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SectionNewJoiners() {
  const { platformName } = useLandingExperience();
  const railRef = useRef<HTMLDivElement>(null);
  const [entryVisible, setEntryVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [payload, setPayload] = useState<NewJoinersPublicPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicNewJoiners().then((p) => {
      if (!cancelled) setPayload(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const apiJoiners =
    payload?.enabled && Array.isArray(payload.joiners) && payload.joiners.length > 0 ? payload.joiners : null;
  const joiners = apiJoiners ?? FALLBACK_JOINERS;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setEntryVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scrollByDir = useCallback((dir: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const first = rail.querySelector<HTMLElement>('[data-nj-card]');
    const gap = 22;
    const step = (first?.offsetWidth ?? 300) + gap;
    rail.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);

  return (
    <>
      <style>{`
        .nj {
          position: relative;
          z-index: 48;
          width: 100vw;
          max-width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          background: #ffffff;
          padding: clamp(28px, 5vh, 56px) clamp(20px, 4vw, 48px) clamp(32px, 5vh, 64px);
          box-sizing: border-box;
          overflow-x: hidden;
        }

        .nj__inner {
          width: 100%;
          max-width: min(1440px, 100%);
          margin: 0 auto;
        }

        .nj__top {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px 28px;
          margin-bottom: clamp(28px, 4vh, 44px);
        }

        .nj__intro {
          max-width: min(720px, 100%);
          opacity: 0;
          transform: translate3d(0, 28px, 0);
          transition:
            opacity 0.75s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .nj--entered .nj__intro {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }

        .nj__badge {
          display: inline-flex;
          align-items: center;
          padding: 8px 16px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: #ede9fe;
          color: #5b21b6;
          margin-bottom: 16px;
        }

        .nj__title {
          margin: 0;
          font-size: clamp(1.75rem, 3.8vw, 2.75rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.12;
          color: #0a0a0a;
        }

        .nj__sub {
          margin: 14px 0 0;
          font-size: clamp(15px, 1.5vw, 18px);
          line-height: 1.55;
          color: #737373;
          font-weight: 400;
          max-width: 52ch;
        }

        .nj__nav {
          display: flex;
          gap: 12px;
          flex-shrink: 0;
          opacity: 0;
          transform: translate3d(0, 28px, 0);
          transition:
            opacity 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.06s,
            transform 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.06s;
        }

        .nj--entered .nj__nav {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }

        .nj__arrow {
          width: 48px;
          height: 48px;
          border-radius: 999px;
          border: 1.5px solid #d4d4d4;
          background: #ffffff;
          color: #171717;
          display: grid;
          place-items: center;
          cursor: pointer;
          font-size: 22px;
          line-height: 1;
          transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }

        .nj__arrow:hover {
          border-color: #a3a3a3;
          transform: scale(1.04);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
        }

        .nj__rail-wrap {
          opacity: 0;
          transform: translate3d(0, 20px, 0);
          transition:
            opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s,
            transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s;
        }

        .nj--entered .nj__rail-wrap {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }

        .nj__rail {
          display: flex;
          gap: 22px;
          overflow-x: auto;
          overflow-y: visible;
          padding: 8px 4px 12px;
          margin: 0 -4px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .nj__rail::-webkit-scrollbar {
          display: none;
          height: 0;
          width: 0;
        }

        .nj-card {
          position: relative;
          flex: 0 0 min(300px, 82vw);
          scroll-snap-align: start;
          width: min(300px, 82vw);
          aspect-ratio: 3 / 4.1;
          border-radius: 28px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
        }

        .nj-card:hover {
          transform: scale(1.04);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.14);
        }

        .nj-card__bg {
          position: absolute;
          inset: 0;
          background: var(--nj-accent, #525252);
        }

        .nj-card__img-wrap {
          position: absolute;
          inset: 0;
        }

        .nj-card__img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nj-card__link {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 3;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: none;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #ffffff;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .nj-card__link:hover {
          background: rgba(255, 255, 255, 0.35);
          transform: scale(1.06);
        }

        .nj-card__glass {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          padding: 16px 18px 18px;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.82) 0%,
            rgba(0, 0, 0, 0.35) 55%,
            transparent 100%
          );
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .nj-card__name {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.02em;
          line-height: 1.25;
        }

        .nj-card__country {
          margin: 10px 0 0;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.94);
          line-height: 1.35;
        }

        .nj-card__pkg {
          margin: 6px 0 0;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.82);
          line-height: 1.4;
        }

        @media (prefers-reduced-motion: reduce) {
          .nj__intro,
          .nj__nav,
          .nj__rail-wrap {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .nj-card:hover {
            transform: none;
          }
        }

        @media (max-width: 720px) {
          .nj__top {
            flex-direction: column;
            align-items: stretch;
          }
          .nj__nav {
            display: none;
          }
          .nj__rail {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            overflow-x: visible;
            scroll-snap-type: none;
            padding-bottom: 8px;
          }
          .nj-card {
            width: 100%;
            max-width: 420px;
            margin: 0 auto;
            flex: none;
            scroll-snap-align: unset;
          }
        }
      `}</style>

      <section
        ref={sectionRef}
        id="new-joiners"
        className={`nj${entryVisible ? ' nj--entered' : ''}`}
        aria-labelledby="nj-title"
        data-nav-surface="light"
      >
        <div className="nj__inner">
          <div className="nj__top">
            <div className="nj__intro">
              <span className="nj__badge">New joiners</span>
              <h2 id="nj-title" className="nj__title">
                Welcome to the desk
              </h2>
              <p className="nj__sub">
                Recent members who started trading with {platformName} — each brings their own edge; together they
                shape how our community shows up in the market.
              </p>
            </div>
            <div className="nj__nav">
              <button type="button" className="nj__arrow" aria-label="Scroll joiners left" onClick={() => scrollByDir(-1)}>
                ‹
              </button>
              <button type="button" className="nj__arrow" aria-label="Scroll joiners right" onClick={() => scrollByDir(1)}>
                ›
              </button>
            </div>
          </div>

          <div className="nj__rail-wrap">
            <div ref={railRef} className="nj__rail" role="list">
              {joiners.map((j, idx) => (
                <article
                  key={`${j.name}-${idx}`}
                  className="nj-card"
                  data-nj-card
                  role="listitem"
                  style={{ '--nj-accent': j.accentBg } as CSSProperties}
                >
                  <div className="nj-card__bg" aria-hidden />
                  <div className="nj-card__img-wrap">
                    <img
                      className="nj-card__img"
                      src={j.imageUrl ? resolveBackendAssetUrl(j.imageUrl) : ''}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                  <button type="button" className="nj-card__link" aria-label={`Open profile for ${j.name}`}>
                    <ArrowOutIcon />
                  </button>
                  <div className="nj-card__glass">
                    <h3 className="nj-card__name">{j.name}</h3>
                    <p className="nj-card__country">{j.country}</p>
                    <p className="nj-card__pkg">{j.pkg}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
