'use client';

import dynamic from 'next/dynamic';
import { type CSSProperties, useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

/** Phones only — tablets use the full Spline / desktop hero treatment. */
const NARROW_MQ = '(max-width: 767px)';

const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => <SplineLoadingFallback />,
});

const DEFAULT_SCENE =
  'https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode';

function SplineLoadingFallback() {
  return (
    <div
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(56,189,248,0.35),transparent_55%),radial-gradient(ellipse_at_70%_80%,rgba(168,85,247,0.35),transparent_50%)]"
      aria-hidden
    />
  );
}

type PremiumSplineBackdropProps = {
  className?: string;
  style?: CSSProperties;
  /** Optional override; defaults to NEXT_PUBLIC_SPLINE_SCENE_URL or bundled demo scene */
  sceneUrl?: string;
};

export function PremiumSplineBackdrop({
  className = '',
  style,
  sceneUrl,
}: PremiumSplineBackdropProps) {
  const [mounted, setMounted] = useState(false);
  const [useSpline, setUseSpline] = useState(true);

  useEffect(() => {
    setMounted(true);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = window.matchMedia(NARROW_MQ);
    const sync = () => {
      setUseSpline(!reduceMotion.matches && !narrow.matches);
    };
    sync();
    reduceMotion.addEventListener('change', sync);
    narrow.addEventListener('change', sync);
    return () => {
      reduceMotion.removeEventListener('change', sync);
      narrow.removeEventListener('change', sync);
    };
  }, []);

  const url =
    sceneUrl ||
    process.env.NEXT_PUBLIC_SPLINE_SCENE_URL ||
    DEFAULT_SCENE;

  if (!mounted || !useSpline) {
    return (
      <div
        className={`absolute inset-0 overflow-hidden ${className}`}
        style={style}
        aria-hidden
      >
        <div className="absolute inset-0 bg-slate-950" />
        <motion.div
          className="absolute -left-1/4 top-1/4 h-[520px] w-[520px] rounded-full bg-cyan-500/25 blur-[120px]"
          animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-1/4 bottom-0 h-[560px] w-[560px] rounded-full bg-violet-600/30 blur-[130px]"
          animate={{ x: [0, -36, 0], y: [0, -24, 0], scale: [1.05, 1, 1.05] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(15,23,42,0.2),rgba(2,6,23,0.92))]" />
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={style}
      aria-hidden
    >
      <Spline scene={url} className="!absolute !inset-0 !h-full !w-full" />
    </div>
  );
}

/** Subtle pointer parallax for desktop hero chrome (does not move the Spline canvas aggressively). */
export function useHeroPointerParallax() {
  const x = useSpring(0, { stiffness: 28, damping: 18, mass: 0.8 });
  const y = useSpring(0, { stiffness: 28, damping: 18, mass: 0.8 });

  useEffect(() => {
    const narrow = window.matchMedia(NARROW_MQ);
    if (narrow.matches) return;

    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      x.set(nx * 10);
      y.set(ny * 8);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [x, y]);

  return { x, y };
}
