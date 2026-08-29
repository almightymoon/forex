'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { LANDING_MOBILE_MQ } from './landingBreakpoints';
import { useScrollReveal } from './useScrollReveal';

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
const VANTA_BIRDS_CDN = 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.birds.min.js';

type VantaBirdsFn = (opts: Record<string, unknown>) => { destroy: () => void };

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const found = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (found) {
      if (found.dataset.loaded === '1') {
        resolve();
        return;
      }
      found.addEventListener('load', () => resolve(), { once: true });
      found.addEventListener('error', () => reject(new Error(src)), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.vantaLoader = '1';
    s.onload = () => {
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default function SectionLetsWork() {
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const revealProg = useRef(0);
  const vantaRef = useRef<HTMLDivElement>(null);
  const revealed = useScrollReveal(sectionRef, { mobileOnly: true, threshold: 0.15 });

  useEffect(() => {
    const el = vantaRef.current;
    if (!el) return;

    let cancelled = false;
    let effect: { destroy: () => void } | null = null;

    (async () => {
      try {
        await loadScriptOnce(THREE_CDN);
        await loadScriptOnce(VANTA_BIRDS_CDN);
        if (cancelled || !vantaRef.current) return;

        const W = window as unknown as {
          THREE: object;
          VANTA?: { BIRDS?: VantaBirdsFn };
        };
        const BIRDS = W.VANTA?.BIRDS;
        if (!W.THREE || !BIRDS) {
          return;
        }

        effect = BIRDS({
          el: vantaRef.current,
          THREE: W.THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          backgroundColor: 0xffffff,
          backgroundAlpha: 1.0,
          color1: 0xff1493,
          color2: 0xff8c42,
          colorMode: 'varianceGradient',
          quantity: 5,
          birdSize: 1.0,
          wingSpan: 30.0,
          speedLimit: 5.0,
          separation: 20.0,
          alignment: 20.0,
          cohesion: 20.0,
        });
      } catch {
        // optional background
      }
    })();

    return () => {
      cancelled = true;
      effect?.destroy();
      effect = null;
    };
  }, []);

  useEffect(() => {
    const mobileMq = window.matchMedia(LANDING_MOBILE_MQ);
    if (!mobileMq.matches || !innerRef.current) return;
    innerRef.current.style.opacity = '';
    innerRef.current.style.transform = '';
  }, []);

  useEffect(() => {
    const mobileMq = window.matchMedia(LANDING_MOBILE_MQ);
    if (mobileMq.matches) return;

    let rafId: number;
    const loop = () => {
      if (sectionRef.current && innerRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const maxScroll = Math.max(1, rect.height - vh);
        let tgt = 0;
        if (rect.top <= 0) {
          tgt = Math.max(0, Math.min(1, Math.abs(rect.top) / maxScroll));
        }

        const curr = revealProg.current;
        const next = curr + (tgt - curr) * 0.1;
        revealProg.current = Math.abs(tgt - next) < 0.0008 ? tgt : next;

        const r = easeOutCubic(revealProg.current);
        /* Subtle slide only — full-vh offset made the sticky block look “empty” at the top until heavy scrolling */
        const slidePx = Math.min(120, Math.max(40, vh * 0.07));
        innerRef.current.style.opacity = String(0.35 + r * 0.65);
        innerRef.current.style.transform = `translate3d(0, ${(1 - r) * slidePx}px, 0) scale(${0.94 + r * 0.06})`;

        if (vantaRef.current) {
          const lag = (1 - r) * 18;
          vantaRef.current.style.transform = `translate3d(0, ${lag}px, 0) scale(${1 + (1 - r) * 0.015})`;
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="lets-work"
      className={`lw${revealed ? ' lw--revealed' : ''}`}
      aria-labelledby="lw-heading"
      data-nav-surface="light"
    >
      <div className="lw__sticky">
        <div ref={vantaRef} className="lw__vanta" aria-hidden />

        <div
          ref={innerRef}
          className="lw__inner"
          style={{
            opacity: 0.35,
            transform: 'translate3d(0, 72px, 0) scale(0.94)',
          }}
        >
          <p className="lw__kicker">Ready to level up your edge?</p>

          <h2 id="lw-heading" className="lw__title">
            <span className="lw__title-line">
              <span className="lw__title-dark">Let&apos;s Trade</span>
              <span className="lw__title-accent">together!</span>
            </span>
          </h2>

          <p className="lw__lede">Tell us about your goals — we&apos;ll follow up with a clear next step.</p>

          <div className="lw__actions">
            <Link href="/contact" className="lw__cta">
              Get in touch
            </Link>
            <a className="lw__scroll" href="#footer">
              <span className="lw__scroll-ico" aria-hidden>
                ↓
              </span>
              Continue to footer
              <span className="lw__scroll-ico" aria-hidden>
                ↓
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
