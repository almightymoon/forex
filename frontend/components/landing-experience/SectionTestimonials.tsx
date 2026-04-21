'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLandingExperience } from './LandingExperienceContext';

type Testimonial = {
  quote: string;
  name: string;
  photoUrl: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      '__BRAND__ turned a noisy market into something I can actually trade with confidence. Their guidance and platform feel built for people who take this seriously.',
    name: 'Sarah Chen',
    photoUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
  },
  {
    quote:
      'I tried a lot of desks before landing here. __BRAND__ delivers the clarity and execution quality they promise — it is the first place I recommend to other traders.',
    name: 'Marcus Webb',
    photoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    quote:
      'What stands out is how professional __BRAND__ is end to end: clean tools, real infrastructure, and people who answer when you need them. That combination is rare.',
    name: 'Elena Rossi',
    photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    quote:
      '__BRAND__ reframed how I think about risk and sizing. Their playbooks and session structure alone have been worth every penny of the membership.',
    name: 'James Okonkwo',
    photoUrl: 'https://randomuser.me/api/portraits/men/75.jpg',
  },
  {
    quote:
      'I follow several services; __BRAND__ is the only one where the signals feel intentional and aligned with how I read price. They have earned my trust.',
    name: 'Priya Nair',
    photoUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    quote:
      'Going live with __BRAND__ after their demo was seamless. When volatility spikes, I still feel backed by a team that knows how to operate under pressure.',
    name: 'Tomás Silva',
    photoUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
  },
  {
    quote:
      'Best call I made this year was partnering with __BRAND__. The depth of coverage and the quality of their desk is exactly what they advertise — and more.',
    name: 'Anna Kowalski',
    photoUrl: 'https://randomuser.me/api/portraits/women/90.jpg',
  },
];

const SVG_W = 1200;
const SVG_H = 340;

function getWavePoints(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    const x = 70 + t * (SVG_W - 140);
    const y = SVG_H / 2 + Math.sin(t * Math.PI * 2.5 - 0.4) * 58;
    return { x, y, leftPct: (x / SVG_W) * 100, topPct: (y / SVG_H) * 100 };
  });
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return '';
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) * 0.42;
    d += ` C ${p0.x + dx} ${p0.y}, ${p1.x - dx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  return d;
}

export default function SectionTestimonials() {
  const { platformName } = useLandingExperience();
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(3);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [entryVisible, setEntryVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntryVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const points = useMemo(() => getWavePoints(TESTIMONIALS.length), []);
  const wavePath = useMemo(() => buildSmoothPath(points), [points]);

  const midDots = useMemo(() => {
    return points.slice(0, -1).map((p, i) => ({
      x: (p.x + points[i + 1].x) / 2,
      y: (p.y + points[i + 1].y) / 2,
    }));
  }, [points]);

  const goPrev = () => {
    setDirection(-1);
    setActive((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const goNext = () => {
    setDirection(1);
    setActive((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const fromX = direction === 1 ? '10px' : '-10px';

  return (
    <>
      <style>{`
        .fx-testimonials {
          position: relative;
          z-index: 50;
          width: 100vw;
          max-width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          background: #ffffff;
          padding: clamp(24px, 4vh, 48px) clamp(20px, 4vw, 40px) clamp(20px, 3.5vh, 40px);
          border-radius: 0;
          overflow-x: hidden;
          overflow-y: visible;
          box-sizing: border-box;
          min-height: min(100dvh, 100vh);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .fx-testimonials__inner {
          width: 100%;
          max-width: min(1400px, 100%);
          margin: 0 auto;
          flex: 0 1 auto;
          min-height: 0;
        }

        .fx-testimonials__inner > .fx-testimonials__header,
        .fx-testimonials__inner > .fx-testimonials__visual,
        .fx-testimonials__inner > .fx-testimonials__quoteRow {
          opacity: 0;
          transform: translate3d(0, 36px, 0);
          transition:
            opacity 0.75s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .fx-testimonials__inner > .fx-testimonials__visual {
          transition-delay: 0.09s;
        }

        .fx-testimonials__inner > .fx-testimonials__quoteRow {
          transition-delay: 0.18s;
        }

        .fx-testimonials--entered .fx-testimonials__inner > .fx-testimonials__header,
        .fx-testimonials--entered .fx-testimonials__inner > .fx-testimonials__visual,
        .fx-testimonials--entered .fx-testimonials__inner > .fx-testimonials__quoteRow {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }

        .fx-testimonials__header {
          text-align: center;
          margin-bottom: clamp(16px, 2.5vh, 28px);
        }

        .fx-testimonials__title {
          margin: 0;
          font-size: clamp(28px, 3.8vw, 52px);
          line-height: 1.06;
          letter-spacing: -0.035em;
          font-weight: 600;
          color: #0f0f0f;
        }

        .fx-testimonials__subtitle {
          max-width: min(720px, 92vw);
          margin: 14px auto 0;
          font-size: clamp(15px, 1.65vw, 20px);
          line-height: 1.45;
          color: #8b8b8b;
          font-weight: 400;
        }

        .fx-testimonials__cta {
          margin-top: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 48px;
          padding: 0 28px;
          border-radius: 999px;
          background: #0f0f0f;
          color: #ffffff;
          text-decoration: none;
          font-size: 16px;
          font-weight: 500;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .fx-testimonials__cta:hover {
          transform: translateY(-1px);
          opacity: 0.92;
        }

        .fx-testimonials__visual {
          position: relative;
          width: 100%;
          aspect-ratio: 1200 / 340;
          max-height: min(38vh, 320px);
          min-height: clamp(160px, 28vh, 280px);
          margin: clamp(12px, 2vh, 24px) auto clamp(12px, 2vh, 24px);
        }

        .fx-testimonials__svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .fx-testimonials__overlay {
          position: absolute;
          inset: 0;
        }

        .fx-testimonials__orbit {
          position: absolute;
          transform: translate(-50%, -50%);
          width: 104px;
          height: 104px;
          border-radius: 999px;
          border: 1.5px dashed #d9d9d9;
          box-sizing: border-box;
          pointer-events: none;
          transition: all 0.28s ease;
        }

        .fx-testimonials__orbit--active {
          width: 128px;
          height: 128px;
          border: 2px solid #ea5a5a;
        }

        .fx-testimonials__avatar {
          position: absolute;
          transform: translate(-50%, -50%);
          width: 78px;
          height: 78px;
          border: none;
          background: transparent;
          padding: 0;
          border-radius: 999px;
          cursor: pointer;
          transition: transform 0.22s ease;
          z-index: 2;
        }

        .fx-testimonials__avatar:hover {
          transform: translate(-50%, -50%) scale(1.05);
        }

        .fx-testimonials__avatar--active {
          width: 102px;
          height: 102px;
        }

        .fx-testimonials__avatar img {
          width: 100%;
          height: 100%;
          border-radius: 999px;
          display: block;
          object-fit: cover;
          border: 2px solid #ea5a5a;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
        }

        .fx-testimonials__quoteRow {
          display: grid;
          grid-template-columns: 52px minmax(0, 1fr) 52px;
          align-items: center;
          justify-content: center;
          gap: clamp(14px, 2.5vw, 28px);
          max-width: min(1100px, 100%);
          margin: 0 auto;
        }

        .fx-testimonials__arrow {
          width: 52px;
          height: 52px;
          border-radius: 999px;
          border: 1.5px solid #d9d9d9;
          background: transparent;
          color: #111;
          font-size: 30px;
          line-height: 1;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .fx-testimonials__arrow:hover {
          border-color: #111;
          transform: scale(1.03);
        }

        .fx-testimonials__quote {
          text-align: center;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          animation: fx-fade-in 0.28s ease;
        }

        .fx-testimonials__quoteText {
          margin: 0;
          font-size: clamp(17px, 1.85vw, 24px);
          line-height: 1.42;
          color: #7d7d7d;
          font-weight: 400;
        }

        .fx-testimonials__quoteName {
          margin: 12px 0 0;
          font-size: 15px;
          color: #151515;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        @keyframes fx-fade-in {
          from {
            opacity: 0;
            transform: translateX(${fromX});
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .fx-testimonials__inner > .fx-testimonials__header,
          .fx-testimonials__inner > .fx-testimonials__visual,
          .fx-testimonials__inner > .fx-testimonials__quoteRow {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }

        @media (max-width: 1024px) {
          .fx-testimonials {
            padding: clamp(20px, 3.5vh, 36px) clamp(16px, 4vw, 28px) clamp(16px, 3vh, 32px);
          }

          .fx-testimonials__visual {
            max-height: min(34vh, 280px);
            min-height: clamp(140px, 26vh, 240px);
          }

          .fx-testimonials__orbit {
            width: 90px;
            height: 90px;
          }

          .fx-testimonials__orbit--active {
            width: 110px;
            height: 110px;
          }

          .fx-testimonials__avatar {
            width: 68px;
            height: 68px;
          }

          .fx-testimonials__avatar--active {
            width: 88px;
            height: 88px;
          }

          .fx-testimonials__quoteRow {
            grid-template-columns: 46px minmax(0, 1fr) 46px;
            gap: 16px;
          }

          .fx-testimonials__arrow {
            width: 46px;
            height: 46px;
            font-size: 26px;
          }
        }

        @media (max-width: 720px) {
          .fx-testimonials {
            width: 100%;
            max-width: none;
            margin-left: 0;
            margin-right: 0;
            max-height: none;
            min-height: unset;
            overflow-x: hidden;
          }

          .fx-testimonials__visual {
            aspect-ratio: 1 / 0.95;
            max-height: min(36vh, 260px);
            min-height: 140px;
            margin-top: 8px;
          }

          .fx-testimonials__quoteRow {
            grid-template-columns: 42px minmax(0, 1fr) 42px;
            gap: 10px;
          }

          .fx-testimonials__quoteText {
            font-size: clamp(15px, 3.8vw, 18px);
          }

          .fx-testimonials__orbit {
            width: 76px;
            height: 76px;
          }

          .fx-testimonials__orbit--active {
            width: 94px;
            height: 94px;
          }

          .fx-testimonials__avatar {
            width: 56px;
            height: 56px;
          }

          .fx-testimonials__avatar--active {
            width: 72px;
            height: 72px;
          }

          .fx-testimonials__arrow {
            width: 42px;
            height: 42px;
            font-size: 24px;
          }
        }
      `}</style>

      <section
        ref={sectionRef}
        id="testimonials"
        className={`fx-testimonials${entryVisible ? ' fx-testimonials--entered' : ''}`}
        aria-labelledby="fx-testimonials-title"
      >
        <div className="fx-testimonials__inner">
          <header className="fx-testimonials__header">
            <h2 id="fx-testimonials-title" className="fx-testimonials__title">
              What Our Customers Say
            </h2>

            <p className="fx-testimonials__subtitle">
              Real stories from traders who work with {platformName} — how our desk, tools, and team have shaped the
              way they navigate the markets.
            </p>

            <Link href="/register" className="fx-testimonials__cta">
              Join now
            </Link>
          </header>

          <div className="fx-testimonials__visual">
            <svg className="fx-testimonials__svg" viewBox={`0 0 ${SVG_W} ${SVG_H}`} aria-hidden="true">
              <path
                d={wavePath}
                fill="none"
                stroke="#d8d8d8"
                strokeWidth="2"
                strokeDasharray="2 10"
                strokeLinecap="round"
              />

              {midDots.map((dot, index) => (
                <circle key={index} cx={dot.x} cy={dot.y} r="4" fill="#111111" />
              ))}
            </svg>

            <div className="fx-testimonials__overlay">
              {TESTIMONIALS.map((item, index) => {
                const point = points[index];
                const isActive = index === active;

                return (
                  <div key={item.name}>
                    <div
                      className={`fx-testimonials__orbit ${isActive ? 'fx-testimonials__orbit--active' : ''}`}
                      style={{
                        left: `${point.leftPct}%`,
                        top: `${point.topPct}%`,
                      }}
                    />

                    <button
                      type="button"
                      className={`fx-testimonials__avatar ${isActive ? 'fx-testimonials__avatar--active' : ''}`}
                      style={{
                        left: `${point.leftPct}%`,
                        top: `${point.topPct}%`,
                      }}
                      aria-label={`Show testimonial from ${item.name}`}
                      onClick={() => {
                        setDirection(index > active ? 1 : -1);
                        setActive(index);
                      }}
                    >
                      <img src={item.photoUrl} alt={item.name} loading="lazy" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="fx-testimonials__quoteRow">
            <button type="button" className="fx-testimonials__arrow" onClick={goPrev} aria-label="Previous testimonial">
              ‹
            </button>

            <div key={active} className="fx-testimonials__quote">
              <p className="fx-testimonials__quoteText">
                {TESTIMONIALS[active].quote.replace(/__BRAND__/g, platformName)}
              </p>
              <p className="fx-testimonials__quoteName">{TESTIMONIALS[active].name}</p>
            </div>

            <button type="button" className="fx-testimonials__arrow" onClick={goNext} aria-label="Next testimonial">
              ›
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
