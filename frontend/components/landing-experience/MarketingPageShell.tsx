'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSettings } from '../../context/SettingsContext';
import AppCampaignGate from '../campaign/AppCampaignGate';
import CoolLoader from '../CoolLoader';
import Footer from './Footer';
import LandingExperienceRoot from './LandingExperienceRoot';
import { useDismissOnOutsideClick } from './useDismissOnOutsideClick';

const NAV_LOGO_MARK = 'THEFXNAVIGATORS';

type MarketingPageShellProps = {
  children: ReactNode;
  activePath?: string;
};

export default function MarketingPageShell({ children, activePath }: MarketingPageShellProps) {
  const { settings, loading } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuDrawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useDismissOnOutsideClick(menuOpen, closeMenu, menuDrawerRef, menuButtonRef);

  useEffect(() => {
    document.documentElement.classList.add('nav-on-light');

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
      document.documentElement.classList.remove('nav-on-light');
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  if (loading) {
    return <CoolLoader message={`Loading ${settings.platformName}...`} size="md" variant="default" />;
  }

  const isActive = (path: string) => activePath === path;

  return (
    <LandingExperienceRoot platformName={settings.platformName}>
      <AppCampaignGate />
      <div className="marketing-page marketing-page--light-nav" id="top">
        <header className="scroll-scene__nav marketing-page__nav">
          <Link className="nav-logo nav-logo--text" href="/" title={settings.platformName}>
            {NAV_LOGO_MARK}
          </Link>
          <div className="nav-right">
            <Link href="/login" className="nav-pill nav-pill--dark nav-signin">
              Sign in
              <span className="pill-dot" aria-hidden>
                ·
              </span>
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              className="nav-pill nav-pill--outline"
              onClick={() => setMenuOpen((open) => !open)}
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

        {menuOpen && (
          <div
            ref={menuDrawerRef}
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
              <Link
                href="/"
                className={`menu-drawer-link${isActive('/') ? ' menu-drawer-link--active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/about"
                className={`menu-drawer-link${isActive('/about') ? ' menu-drawer-link--active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/faq"
                className={`menu-drawer-link${isActive('/faq') ? ' menu-drawer-link--active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                FAQ
              </Link>
              <Link
                href="/shop"
                className={`menu-drawer-link${isActive('/shop') ? ' menu-drawer-link--active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Shop
              </Link>
              <Link
                href="/contact"
                className={`menu-drawer-link${isActive('/contact') ? ' menu-drawer-link--active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
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

        <main className="marketing-page__main">{children}</main>
        <Footer />
      </div>
    </LandingExperienceRoot>
  );
}
