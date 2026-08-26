'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CandleStreamFrame, useCandlePipeline } from '../CandleStreamLoader';

type Props = {
  onDone: () => void;
  /** When false, the exit animation waits (e.g. until settings/API data is ready). */
  ready?: boolean;
};

export default function LoadingScreen({ onDone, ready = true }: Props) {
  const [exiting, setExiting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const finishedRef = useRef(false);
  const rafRef = useRef(0);
  const readyRef = useRef(ready);
  const patternDoneRef = useRef(false);
  readyRef.current = ready;

  const candles = useCandlePipeline({
    loop: false,
    onPatternComplete: () => {
      patternDoneRef.current = true;
    },
  });

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDone();
  };

  useEffect(() => {
    // Keep the page chrome dark under the loader so any opacity fade never
    // flashes the default white body behind a dark hero.
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    html.style.backgroundColor = '#060709';
    body.style.backgroundColor = '#060709';

    const complete = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      window.setTimeout(() => setExiting(true), 180);
    };

    let pageLoaded = document.readyState === 'complete';
    const onLoad = () => {
      pageLoaded = true;
    };
    window.addEventListener('load', onLoad);

    const minMs = 1800;
    const maxMs = 4500;
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      const canComplete =
        pageLoaded && elapsed >= minMs && readyRef.current && patternDoneRef.current;

      if (canComplete || elapsed >= maxMs) {
        complete();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('load', onLoad);
      cancelAnimationFrame(rafRef.current);
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
    };
  }, []);

  // Portal: rectangular candle window (box-shadow veil) scales up so the hero
  // is only visible inside the candle — stays a rect, never morphs into a diamond.
  useLayoutEffect(() => {
    if (!exiting) return;

    const root = rootRef.current;
    const portal = portalRef.current;
    if (!root || !portal) {
      finish();
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      finish();
      return;
    }

    const candle = root.querySelector('.terminal-candle--center') as HTMLElement | null;
    const rootBox = root.getBoundingClientRect();
    const candleBox = candle?.getBoundingClientRect();

    const fallbackW = Math.min(14, rootBox.width * 0.011);
    const fallbackH = 96;
    const cLeft = candleBox?.left ?? rootBox.left + rootBox.width / 2 - fallbackW / 2;
    const cTop = candleBox?.top ?? rootBox.top + rootBox.height / 2 - fallbackH / 2;
    const cWidth = Math.max(candleBox?.width ?? fallbackW, 1);
    const cHeight = Math.max(candleBox?.height ?? fallbackH, 1);

    portal.style.left = `${cLeft - rootBox.left}px`;
    portal.style.top = `${cTop - rootBox.top}px`;
    portal.style.width = `${cWidth}px`;
    portal.style.height = `${cHeight}px`;

    // Scale until the rect covers the viewport (plus a little slack).
    const scaleX = (rootBox.width / cWidth) * 1.2;
    const scaleY = (rootBox.height / cHeight) * 1.2;

    const duration = 1350;
    const easing = 'cubic-bezier(0.7, 0.05, 0.85, 0.15)';

    const anim = portal.animate(
      [
        {
          transform: 'scale(1, 1)',
          outlineColor: 'rgba(139, 147, 163, 0.95)',
        },
        {
          transform: 'scale(1.15, 1.12)',
          outlineColor: 'rgba(139, 147, 163, 0.8)',
          offset: 0.12,
        },
        {
          transform: `scale(${scaleX}, ${scaleY})`,
          outlineColor: 'rgba(139, 147, 163, 0)',
        },
      ],
      { duration, easing, fill: 'forwards' },
    );

    const onFinish = () => finish();
    anim.addEventListener('finish', onFinish);

    return () => {
      anim.removeEventListener('finish', onFinish);
      anim.cancel();
    };
  }, [exiting]);

  return (
    <div
      ref={rootRef}
      className={`loading-screen${exiting ? ' loading-screen--exiting' : ''}`}
      aria-label="Loading"
      role="status"
    >
      {exiting ? (
        <div ref={portalRef} className="loading-screen__portal" aria-hidden />
      ) : null}
      <CandleStreamFrame candles={candles} />
    </div>
  );
}
