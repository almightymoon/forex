'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useLandingExperience } from './LandingExperienceContext';
import MarketChart from './MarketChart';

const Globe = dynamic(() => import('./Globe'), { ssr: false });

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const FEATURES_LEFT = [
  { title: 'Institutional Grade Liquidity', icon: 'M2 20h20M4 20V8l8-6 8 6v12M9 20v-6h6v6' },
  { title: 'Zero Spreads on Major Pairs', icon: 'M3 3h18M3 9h18M3 15h12M3 21h8' },
  { title: '28-Market Asset Coverage', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4v8l4 2' },
];

const FEATURES_RIGHT = [
  { title: 'Advanced Analytics Engine', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  { title: 'AI-Driven Trade Signals', icon: 'M13 2L3 14h8l-1 8 10-12h-8l1-8z' },
  { title: 'Secure Asset Custody', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
];

/** Fixed wordmark in the fixed header (separate from admin-configured platform name). */
const NAV_LOGO_MARK = 'THEFXNAVIGATOR';

export default function ScrollScene() {
  const { platformName } = useLandingExperience();
  const [menuOpen, setMenuOpen] = useState(false);

  const heroLayerRef = useRef<HTMLDivElement>(null);
  const s2LayerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const EPS = 0.0006;

    const tick = () => {
      rafRef.current = 0;

      const curr = progressRef.current;
      const tgt = targetRef.current;
      const next = curr + (tgt - curr) * 0.09;
      progressRef.current = Math.abs(tgt - next) < EPS ? tgt : next;

      const p = progressRef.current;
      const e = easeInOutQuart(p);
      const y = window.scrollY;
      const vh = window.innerHeight;
      const sceneDone = y >= vh * 2.05;
      document.documentElement.classList.toggle('scene-done', sceneDone);
      const scrollOutY = Math.max(0, y - vh);

      const heroOp = Math.max(0, 1 - e * 1.54);
      const heroTY = -e * 88;

      const s2Op = Math.max(0, Math.min(1, (e - 0.35) * 1.54));
      const s2TY = Math.max(0, (1 - e) * 80);

      const heroEl = heroLayerRef.current;
      const s2El = s2LayerRef.current;

      if (heroEl) {
        heroEl.style.opacity = String(heroOp);
        heroEl.style.transform = `translateY(${heroTY}px)`;
      }
      if (s2El) {
        const s2OpOut = s2Op;
        const s2TYOut = s2TY - scrollOutY;

        s2El.style.opacity = String(s2OpOut);
        s2El.style.transform = `translateY(${s2TYOut}px)`;
        s2El.style.pointerEvents = p < 0.54 ? 'none' : 'auto';
        if (s2Op >= 0.22) s2El.classList.add('s2-ready');
        if (s2Op < 0.05) s2El.classList.remove('s2-ready');
        s2El.style.display = scrollOutY >= vh ? 'none' : 'flex';
      }

      const animating = Math.abs(progressRef.current - tgt) > EPS;
      if (animating) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const scheduleTick = () => {
      targetRef.current = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    scheduleTick();
    window.addEventListener('scroll', scheduleTick, { passive: true });

    return () => {
      window.removeEventListener('scroll', scheduleTick);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, []);

  useEffect(() => {
    const bandBottom = 96;
    let navRaf = 0;

    const updateNavOnLight = () => {
      const nodes = document.querySelectorAll<HTMLElement>('[data-nav-surface="light"]');
      let onLight = false;
      nodes.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < bandBottom && r.bottom > 0) {
          onLight = true;
        }
      });
      document.documentElement.classList.toggle('nav-on-light', onLight);
    };

    const scheduleNav = () => {
      if (navRaf) return;
      navRaf = requestAnimationFrame(() => {
        navRaf = 0;
        updateNavOnLight();
      });
    };

    updateNavOnLight();
    window.addEventListener('scroll', scheduleNav, { passive: true });
    window.addEventListener('resize', scheduleNav);
    return () => {
      window.removeEventListener('scroll', scheduleNav);
      window.removeEventListener('resize', scheduleNav);
      cancelAnimationFrame(navRaf);
    };
  }, []);

  return (
    <div className="scroll-scene" id="top">
      <div className="scroll-scene__driver" aria-hidden />

      <header className="scroll-scene__nav">
        <a
          className="nav-logo nav-logo--text"
          href="#top"
          title={platformName}
          aria-label={`${platformName} — home`}
        >
          {NAV_LOGO_MARK}
        </a>
        <div className="nav-right">
          <Link href="/login" className="nav-pill nav-pill--dark nav-signin">
            Sign in
            <span className="pill-dot" aria-hidden>
              ·
            </span>
          </Link>
          <button
            type="button"
            className="nav-pill nav-pill--outline"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
          >
            Menu
            <span className="pill-dots" aria-hidden>
              ··
            </span>
          </button>
        </div>
      </header>

      <div ref={heroLayerRef} className="scroll-scene__layer scroll-scene__layer--hero">
        <div className="scene-globe-bg">
          <Globe />
        </div>

        <div className="hero-headline-center">
          <h1 className="hero-heading-center">
            <span className="hero-heading-row">Master the Art</span>
            <span className="hero-heading-row">of Forex Trading</span>
          </h1>
          <p className="hero-subheading">
          Master elite-tier institutional strategies
<br />
Professional edge, decoded for the retail trader.
          </p>
        </div>

        <div className="hero-features-row">
          <ul className="feat-col feat-col--left">
            {FEATURES_LEFT.map((f, idx) => (
              <li key={f.title} className={`feat-item feat-item--left feat-item--left-${idx + 1}`}>
                <span className="feat-icon">
                  <Icon d={f.icon} />
                </span>
                <span className="feat-label">{f.title}</span>
                <span className="feat-arr" aria-hidden>
                  →
                </span>
              </li>
            ))}
          </ul>
          <ul className="feat-col feat-col--right">
            {FEATURES_RIGHT.map((f, idx) => (
              <li key={f.title} className={`feat-item feat-item--right feat-item--right-${idx + 1}`}>
                <span className="feat-icon">
                  <Icon d={f.icon} />
                </span>
                <span className="feat-label">{f.title}</span>
                <span className="feat-arr" aria-hidden>
                  ←
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div ref={s2LayerRef} className="scroll-scene__layer scroll-scene__layer--s2">
        <div className="scene-s2">
          <div className="scene-s2__left s2-item s2-item--left" style={{ '--i': 0 } as React.CSSProperties}>
            <div className="scene-laptop">
              <div className="scene-laptop__screen">
                <div className="scene-laptop__topbar">
                  <div className="scene-chart-pair">
                    <span className="scene-chart-symbol">EUR / USD</span>
                    <span className="scene-chart-pill">Live</span>
                  </div>
                  <div className="scene-chart-stats">
                    <div className="scene-stat">
                      <span className="scene-stat__label">Bias</span>
                      <span className="scene-stat__value">Bullish</span>
                    </div>
                    <div className="scene-stat">
                      <span className="scene-stat__label">Vol</span>
                      <span className="scene-stat__value">Med</span>
                    </div>
                  </div>
                </div>
                <div className="scene-laptop__chart">
                  <MarketChart watermarkLabel={platformName} />
                </div>
              </div>

              <Image
                src="/landing/laptop.png"
                width={705}
                height={412}
                className="scene-laptop__frame"
                alt=""
                aria-hidden
                draggable={false}
                sizes="(max-width: 1024px) 90vw, 560px"
                priority={false}
              />
            </div>
          </div>

          <div className="scene-s2__right">
            <p className="scene-kicker s2-item" style={{ '--i': 1 } as React.CSSProperties}>
              Signals · Risk · Execution
            </p>

            <h2 className="scene-title s2-item" style={{ '--i': 2 } as React.CSSProperties}>
              <span className="scene-title__line scene-title__line--top">
                See the <span className="scene-title__ul">market</span>
              </span>
              <span className="scene-title__line scene-title__line--bottom">before it moves</span>
            </h2>

            <p className="scene-lead s2-item" style={{ '--i': 3 } as React.CSSProperties}>
              Real-time bias, confluence scoring, and clean entries — presented like a desk tool, not a noisy
              indicator pack.
            </p>

            <div className="scene-stats s2-item" style={{ '--i': 4 } as React.CSSProperties}>
              {[
                { num: '2000+', lbl: 'Active Traders' },
                { num: '90%', lbl: 'Signal Accuracy' },
                { num: '28', lbl: 'Markets Covered' },
                { num: '24/7', lbl: 'Live Analysis' },
              ].map((s) => (
                <div key={s.lbl} className="scene-stat-card">
                  <span className="scene-stat-card__num">{s.num}</span>
                  <span className="scene-stat-card__lbl">{s.lbl}</span>
                </div>
              ))}
            </div>

            <div className="scene-cta-row s2-item" style={{ '--i': 5 } as React.CSSProperties}>
              <a className="scene-cta scene-cta--primary" href="#packages">
                View packages <span className="scene-cta__arrow" aria-hidden>→</span>
              </a>
              <a className="scene-cta scene-cta--ghost" href="#expertise">
                How it works
              </a>
            </div>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div
          className="menu-drawer-cluster scroll-scene__menu-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div className="menu-drawer-bar">
            <Link href="/register" className="menu-drawer-cta" onClick={() => setMenuOpen(false)}>
              Get started
              <span className="menu-drawer-cta-dot" aria-hidden>
                ·
              </span>
            </Link>
            <button
              type="button"
              className="menu-drawer-close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              Close
              <span className="menu-drawer-close-dot" aria-hidden>
                ·
              </span>
            </button>
          </div>

          <nav className="menu-drawer-panel menu-drawer-panel--nav" aria-label="Main">
            <a href="#top" className="menu-drawer-link" onClick={() => setMenuOpen(false)}>
              Home
            </a>
            <a href="#expertise" className="menu-drawer-link menu-drawer-link--active" onClick={() => setMenuOpen(false)}>
              Expertise
              <span className="menu-drawer-link-dot" aria-hidden />
            </a>
            <a href="#packages" className="menu-drawer-link" onClick={() => setMenuOpen(false)}>
              Packages
            </a>
            <Link href="/contact" className="menu-drawer-link" onClick={() => setMenuOpen(false)}>
              Contact
            </Link>
            <Link href="/login" className="menu-drawer-link" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
          </nav>

          <div className="menu-drawer-panel menu-drawer-panel--subscribe" aria-label="Newsletter">
            <p className="menu-drawer-newsletter-title">Subscribe to our newsletter</p>
            <form className="menu-drawer-newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" name="email" placeholder="Your email" autoComplete="email" />
              <button type="submit" className="menu-drawer-newsletter-submit" aria-label="Subscribe">
                →
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
