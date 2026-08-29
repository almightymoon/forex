'use client';

import { useEffect, useState, type RefObject } from 'react';
import { LANDING_MOBILE_MQ } from './landingBreakpoints';

type ScrollRevealOptions = {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  /** When true, desktop skips reveal (sections use their own scroll engine). */
  mobileOnly?: boolean;
};

export function useScrollReveal<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: ScrollRevealOptions = {},
) {
  const {
    threshold = 0.12,
    rootMargin = '0px 0px -8% 0px',
    once = true,
    mobileOnly = false,
  } = options;

  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setRevealed(true);
      return;
    }

    const mobileMq = window.matchMedia(LANDING_MOBILE_MQ);
    if (mobileOnly && !mobileMq.matches) {
      setRevealed(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          if (once) io.disconnect();
        } else if (!once) {
          setRevealed(false);
        }
      },
      { threshold, rootMargin },
    );

    io.observe(el);

    const onMqChange = (e: MediaQueryListEvent) => {
      if (mobileOnly && !e.matches) setRevealed(true);
    };
    mobileMq.addEventListener('change', onMqChange);

    return () => {
      io.disconnect();
      mobileMq.removeEventListener('change', onMqChange);
    };
  }, [ref, threshold, rootMargin, once, mobileOnly]);

  return revealed;
}

/**
 * Gentle scroll-linked fade/slide for mobile sections (no sticky pin required).
 */
export function useMobileScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
  targetRef: RefObject<HTMLElement | null>,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const mobileMq = window.matchMedia(LANDING_MOBILE_MQ);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!mobileMq.matches || reduced) return;

    let raf = 0;

    const tick = () => {
      const section = ref.current;
      const target = targetRef.current;
      if (section && target) {
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.top < vh * 0.92 && rect.bottom > vh * 0.08) {
          const progress = Math.max(0, Math.min(1, 1 - rect.top / (vh * 0.78)));
          target.style.opacity = String(0.45 + progress * 0.55);
          target.style.transform = `translate3d(0, ${(1 - progress) * 28}px, 0)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, targetRef, enabled]);
}
