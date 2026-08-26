'use client';

import { useEffect, useRef, useState, type AnimationEvent } from 'react';
import { CandleStreamFrame, useCandlePipeline } from '../CandleStreamLoader';

type Props = {
  onDone: () => void;
  /** When false, the exit animation waits (e.g. until settings/API data is ready). */
  ready?: boolean;
};

export default function LoadingScreen({ onDone, ready = true }: Props) {
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);
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

  const handleAnimEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (!exiting) return;
    if (e.animationName !== 'loader-exit' && e.animationName !== 'loader-exit-reduced') return;
    onDone();
  };

  return (
    <div
      className={`loading-screen${exiting ? ' loading-screen--exiting' : ''}`}
      onAnimationEnd={handleAnimEnd}
      aria-label="Loading"
      role="status"
    >
      <CandleStreamFrame candles={candles} />
    </div>
  );
}
