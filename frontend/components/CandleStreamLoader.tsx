'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

export type CandleGeom = {
  h: string;
  y: string;
  wt: string;
  wb: string;
  dimmed: boolean;
};

type LiveCandle = CandleGeom & {
  id: string;
  /** When true, candle plays its draw-in animation */
  visible: boolean;
  /** Bumps to retrigger draw when a slot is refreshed in loop mode */
  generation: number;
};

/** Base swing pattern (desktop-scaled heights / offsets) */
const BASE_PATTERN: Omit<CandleGeom, 'dimmed'>[] = [
  { h: '48px', y: '64px', wt: '16px', wb: '18px' },
  { h: '40px', y: '48px', wt: '12px', wb: '14px' },
  { h: '64px', y: '24px', wt: '22px', wb: '22px' },
  { h: '56px', y: '8px', wt: '18px', wb: '12px' },
  { h: '80px', y: '-24px', wt: '28px', wb: '22px' },
  { h: '72px', y: '-48px', wt: '16px', wb: '36px' },
  { h: '96px', y: '-72px', wt: '26px', wb: '18px' },
  { h: '48px', y: '-40px', wt: '22px', wb: '12px' },
  { h: '40px', y: '-16px', wt: '18px', wb: '18px' },
  { h: '72px', y: '16px', wt: '12px', wb: '30px' },
  { h: '88px', y: '48px', wt: '36px', wb: '22px' },
  { h: '112px', y: '80px', wt: '22px', wb: '36px' },
  { h: '64px', y: '56px', wt: '16px', wb: '16px' },
  { h: '56px', y: '32px', wt: '18px', wb: '12px' },
  { h: '96px', y: '0px', wt: '28px', wb: '28px' },
  { h: '80px', y: '-32px', wt: '22px', wb: '22px' },
  { h: '120px', y: '-72px', wt: '36px', wb: '36px' },
  { h: '52px', y: '-40px', wt: '14px', wb: '20px' },
  { h: '68px', y: '-8px', wt: '20px', wb: '16px' },
  { h: '90px', y: '28px', wt: '24px', wb: '28px' },
  { h: '44px', y: '52px', wt: '12px', wb: '14px' },
  { h: '76px', y: '72px', wt: '18px', wb: '22px' },
];

export const STRUCTURAL_PATTERN = BASE_PATTERN;

const SPAWN_MS = 95;
const PIPELINE_START_MS = 280;

function buildInitialCandles(): LiveCandle[] {
  let dimSeed = 0.62;
  return STRUCTURAL_PATTERN.map((p, i) => {
    dimSeed = (dimSeed * 1.37 + 0.19) % 1;
    return {
      ...p,
      dimmed: dimSeed > 0.72,
      id: `slot-${i}`,
      visible: false,
      generation: 0,
    };
  });
}

type CandleStreamProps = {
  candles: LiveCandle[];
  className?: string;
};

/** Full-screen candle chart — all slots reserved; candles draw in place only. */
export function CandleStreamFrame({ candles, className = '' }: CandleStreamProps) {
  const centerIndex = Math.min(
    Math.floor((candles.length - 1) / 2) + 1,
    candles.length - 1,
  );

  return (
    <div className={`fx-navigator-loader ${className}`.trim()}>
      <div className="ambient-glow" aria-hidden />
      <div className="chart-canvas">
        <div className="candle-stream">
          {candles.map((c, i) => (
            <div
              key={c.id}
              className={`terminal-candle-slot${i === centerIndex ? ' terminal-candle-slot--center' : ''}`}
              style={{ '--y': c.y } as CSSProperties}
            >
              <div
                key={`${c.id}-${c.generation}`}
                className={`terminal-candle${c.dimmed ? ' dimmed' : ''}${c.visible ? ' is-drawn' : ''}${i === centerIndex ? ' terminal-candle--center' : ''}`}
                style={
                  {
                    '--h': c.h,
                    '--w-t': c.wt,
                    '--w-b': c.wb,
                    '--breathe-delay': `${0.65 + i * 0.07}s`,
                  } as CSSProperties
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type UseCandlePipelineOptions = {
  loop?: boolean;
  onPatternComplete?: () => void;
  enabled?: boolean;
};

/**
 * All candle slots exist from frame one (no layout slide).
 * Visibility / draw animation reveals them left→right in place, then holds.
 */
export function useCandlePipeline({
  loop: _loop = false,
  onPatternComplete,
  enabled = true,
}: UseCandlePipelineOptions = {}) {
  const [candles, setCandles] = useState<LiveCandle[]>(() => buildInitialCandles());
  const onCompleteRef = useRef(onPatternComplete);
  onCompleteRef.current = onPatternComplete;
  const patternCompleteRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setCandles((prev) => prev.map((c) => ({ ...c, visible: true })));
      onCompleteRef.current?.();
      patternCompleteRef.current = true;
      return;
    }

    const start = performance.now();
    let lastSpawn = start + PIPELINE_START_MS - SPAWN_MS;
    let nextIndex = 0;
    let dimSeed = 0.62;
    let raf = 0;

    const tick = (now: number) => {
      if (now < start + PIPELINE_START_MS) {
        raf = requestAnimationFrame(tick);
        return;
      }

      if (now - lastSpawn >= SPAWN_MS) {
        const cycleLen = STRUCTURAL_PATTERN.length;
        if (nextIndex >= cycleLen) {
          if (!patternCompleteRef.current) {
            patternCompleteRef.current = true;
            onCompleteRef.current?.();
          }
          return;
        }

        const slot = nextIndex;
        const target = STRUCTURAL_PATTERN[slot];
        dimSeed = (dimSeed * 1.37 + 0.19) % 1;
        const dimmed = dimSeed > 0.72;

        setCandles((prev) =>
          prev.map((c, i) =>
            i === slot ? { ...c, ...target, dimmed, visible: true } : c,
          ),
        );

        nextIndex += 1;
        lastSpawn = now;

        if (nextIndex >= cycleLen && !patternCompleteRef.current) {
          patternCompleteRef.current = true;
          onCompleteRef.current?.();
          return;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  return candles;
}
