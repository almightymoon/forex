'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type DepthScrollTunnelProps = {
  platformName: string;
};

export function DepthScrollTunnel({ platformName }: DepthScrollTunnelProps) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const cRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const a = aRef.current;
    const b = bRef.current;
    const c = cRef.current;
    if (!root || !stage || !a || !b || !c) return;

    gsap.set([a, b, c], {
      transformStyle: 'preserve-3d',
      backfaceVisibility: 'hidden',
    });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: '+=320%',
          scrub: 1.05,
          pin: true,
          anticipatePin: 1,
        },
      });

      tl.fromTo(
        a,
        { z: -2200, autoAlpha: 0, scale: 0.72, filter: 'blur(22px)' },
        { z: 40, autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 2.6 },
        0
      );
      tl.fromTo(
        b,
        { z: -1800, autoAlpha: 0, scale: 0.82, filter: 'blur(18px)' },
        { z: 90, autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 2.4 },
        0.35
      );
      tl.fromTo(
        c,
        { z: -1400, autoAlpha: 0, scale: 0.9, filter: 'blur(14px)' },
        { z: 140, autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 2.2 },
        0.7
      );

      tl.to(
        a,
        { z: 1100, autoAlpha: 0, scale: 1.12, filter: 'blur(16px)', duration: 1.8 },
        2.2
      );
      tl.to(
        b,
        { z: 980, autoAlpha: 0, scale: 1.1, filter: 'blur(14px)', duration: 1.7 },
        2.35
      );
      tl.to(
        c,
        { z: 860, autoAlpha: 0, scale: 1.08, filter: 'blur(12px)', duration: 1.6 },
        2.5
      );
    }, root);

    return () => ctx.revert();
  }, [platformName]);

  return (
    <section
      ref={rootRef}
      id="about"
      className="relative bg-slate-950 text-white"
      aria-label="Immersive product story"
    >
      <div
        ref={stageRef}
        className="relative flex h-[min(100svh,920px)] items-center justify-center overflow-hidden [transform-style:preserve-3d] perspective-[1400px]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(56,189,248,0.14),transparent_55%),radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.16),transparent_45%)]" />

        <div
          ref={aRef}
          className="absolute inset-0 flex items-center justify-center px-6"
        >
          <div className="max-w-4xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/80">
              Depth-first learning
            </p>
            <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Move through markets—not across tabs.
            </h2>
          </div>
        </div>

        <div
          ref={bRef}
          className="absolute inset-0 flex items-center justify-center px-6"
        >
          <div className="max-w-3xl text-center">
            <p className="mb-5 text-sm text-slate-300/90">
              {platformName} pairs structured curriculum with live execution context—so
              concepts land with spatial clarity instead of flat theory.
            </p>
            <div className="mx-auto grid max-w-xl grid-cols-3 gap-3 text-left text-xs text-slate-200/85 sm:text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <div className="mb-1 font-semibold text-white">Signals</div>
                Real-time framing you can rehearse.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <div className="mb-1 font-semibold text-white">Sessions</div>
                Instructor tempo matched to volatility.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <div className="mb-1 font-semibold text-white">Risk</div>
                Guardrails that feel premium, not punitive.
              </div>
            </div>
          </div>
        </div>

        <div
          ref={cRef}
          className="absolute inset-0 flex items-center justify-center px-6"
        >
          <div className="max-w-2xl text-center">
            <p className="text-balance text-2xl font-medium tracking-tight text-white sm:text-3xl">
              Scroll is the camera. Your edge is the focal plane.
            </p>
            <p className="mt-4 text-sm text-slate-300/85">
              Replace this tunnel with your own Spline scene scroll events when you are
              ready—this section is designed to feel expensive even without custom 3D
              authoring.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
