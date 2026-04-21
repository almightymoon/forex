'use client';

import { useEffect, useRef, useState } from 'react';

export default function Section4() {
  const rootRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const prog = useRef(0);
  const tgt = useRef(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let rafId: number;
    const loop = () => {
      if (rootRef.current && wrapRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        const vh = window.innerHeight;
        tgt.current = Math.max(0, Math.min(1, 1 - rect.top / vh));
        const next = prog.current + (tgt.current - prog.current) * 0.09;
        prog.current = Math.abs(tgt.current - next) < 0.0006 ? tgt.current : next;
        const p = prog.current;
        const e = p < 0.5 ? 8 * p ** 4 : 1 - Math.pow(-2 * p + 2, 4) / 2;

        wrapRef.current.style.opacity = String(Math.min(1, e * 1.3));
        wrapRef.current.style.transform = `translateY(${(1 - e) * 60}px)`;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <section ref={rootRef} id="newsletter" className="s4">
      <div ref={wrapRef} className="s4__wrap" style={{ opacity: 0, transform: 'translateY(60px)' }}>
        <div className="s4__content">
          <h2 className="s4__heading">
            Subscribe to our newsletter to
            <br />
            receive your daily edge
          </h2>
          <p className="s4__body">
            Get institutional-grade trade setups, real-time bias shifts, and session recaps delivered straight to
            your inbox — free, every morning.
          </p>

          {submitted ? (
            <p className="s4__success">You&apos;re in — check your inbox ✓</p>
          ) : (
            <form
              className="s4__form"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              <div className="s4__input-wrap">
                <div className="s4__input-group">
                  <svg
                    className="s4__input-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input type="email" placeholder="Enter your email" required autoComplete="email" />
                </div>
                <button type="submit" className="s4__btn">
                  Subscribe
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="s4__laptop-wrap" aria-hidden>
          <img src="/landing/laptop-trading.png" className="s4__laptop-img" alt="" draggable={false} />
        </div>
      </div>
    </section>
  );
}
