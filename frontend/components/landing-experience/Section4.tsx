'use client';

import { Fraunces, Outfit } from 'next/font/google';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';

const display = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const sans = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

type LineTone = 'accent' | 'italic' | 'plain';

type Statement = {
  eyebrow: string;
  lines: Array<{ text: string; tone?: LineTone }>;
  aside: string;
};

const STATEMENTS: Statement[] = [
  {
    eyebrow: 'The craft of the chart',
    lines: [
      { text: "Don't chase", tone: 'plain' },
      { text: 'the noise.', tone: 'accent' },
      { text: 'Anticipate the move.', tone: 'italic' },
    ],
    aside: 'Structure · Timing · Risk — built for traders who wait for their edge.',
  },
  {
    eyebrow: 'Session discipline',
    lines: [
      { text: 'See the level.', tone: 'plain' },
      { text: 'Size the risk.', tone: 'accent' },
      { text: 'Execute clean.', tone: 'italic' },
    ],
    aside: 'Clarity over conviction. Process over prediction.',
  },
  {
    eyebrow: 'Market structure',
    lines: [
      { text: 'Patience is', tone: 'plain' },
      { text: 'a position,', tone: 'accent' },
      { text: 'not a pause.', tone: 'italic' },
    ],
    aside: 'Wait for the setup. Protect the account. Leave the noise behind.',
  },
  {
    eyebrow: 'Trading mindset',
    lines: [
      { text: 'Less reaction.', tone: 'plain' },
      { text: 'More intention.', tone: 'accent' },
      { text: 'Hold the plan.', tone: 'italic' },
    ],
    aside: 'Institutional thinking for everyday sessions — free of FOMO, full of plan.',
  },
  {
    eyebrow: 'TheFxNavigators',
    lines: [
      { text: 'Trade with', tone: 'plain' },
      { text: 'structure,', tone: 'accent' },
      { text: 'not hope.', tone: 'italic' },
    ],
    aside: 'Signals, education, and risk frameworks for serious FX traders.',
  },
];

const ROTATE_MS = 4800;

const CHART_BLUEPRINT = [
  { h: '15px', y: '120px', wt: '25px', wb: '5px' },
  { h: '25px', y: '110px', wt: '15px', wb: '10px' },
  { h: '30px', y: '125px', wt: '10px', wb: '15px' },
  { h: '40px', y: '100px', wt: '30px', wb: '5px' },
  { h: '75px', y: '45px', wt: '40px', wb: '10px' },
  { h: '45px', y: '-10px', wt: '25px', wb: '20px' },
  { h: '20px', y: '-25px', wt: '15px', wb: '15px' },
  { h: '35px', y: '-15px', wt: '35px', wb: '10px' },
  { h: '25px', y: '0px', wt: '20px', wb: '25px' },
  { h: '15px', y: '10px', wt: '12px', wb: '12px' },
  { h: '35px', y: '-10px', wt: '15px', wb: '10px' },
  { h: '30px', y: '-20px', wt: '25px', wb: '15px' },
  { h: '70px', y: '-60px', wt: '35px', wb: '15px' },
  { h: '35px', y: '-70px', wt: '20px', wb: '30px' },
  { h: '40px', y: '-80px', wt: '45px', wb: '5px' },
  { h: '20px', y: '-90px', wt: '25px', wb: '15px' },
  { h: '60px', y: '-75px', wt: '40px', wb: '20px' },
  { h: '70px', y: '-75px', wt: '30px', wb: '35px' },
  { h: '45px', y: '-40px', wt: '22px', wb: '18px' },
  { h: '28px', y: '-20px', wt: '14px', wb: '12px' },
  { h: '55px', y: '10px', wt: '28px', wb: '16px' },
  { h: '38px', y: '40px', wt: '18px', wb: '20px' },
];

type DenseCandle = {
  id: string;
  h: string;
  y: string;
  wt: string;
  wb: string;
  alt: boolean;
  /** Fixed world X — screen X = worldX - drift */
  worldX: number;
};

const CANDLE_SLOT_PX = 19; // 11px body + 8px gap
const CANDLE_SPAWN_MS = 130;
const CANDLE_DRIFT_PX_PER_SEC = CANDLE_SLOT_PX / (CANDLE_SPAWN_MS / 1000);
const RIGHT_INSET_PX = 36;

/** Right-column 3D sideways candle stream — loops forever */
function SidewaysCandleStage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<DenseCandle[]>([]);
  const driftRef = useRef(0);
  const [version, setVersion] = useState(0);

  const paint = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const drift = driftRef.current;
    const live = liveRef.current;
    const nodes = stream.children;
    for (let i = 0; i < live.length; i++) {
      const node = nodes[i] as HTMLElement | undefined;
      if (node) node.style.left = `${live[i].worldX - drift}px`;
    }
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const w = canvasRef.current?.offsetWidth ?? 360;
      liveRef.current = CHART_BLUEPRINT.map((d, i) => ({
        ...d,
        id: `dc-${i}`,
        alt: i % 3 === 0,
        worldX: w * 0.2 + i * CANDLE_SLOT_PX,
      }));
      setVersion((n) => n + 1);
      return;
    }

    let raf = 0;
    let cancelled = false;
    let lastFrame = performance.now();
    let lastSpawn = performance.now() + 260;
    let spawnIndex = 0;
    let seq = 0;

    const frame = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.048, (now - lastFrame) / 1000);
      lastFrame = now;

      driftRef.current += CANDLE_DRIFT_PX_PER_SEC * dt;
      const drift = driftRef.current;
      const canvasW = canvasRef.current?.offsetWidth ?? 400;
      let mutated = false;

      if (now - lastSpawn >= CANDLE_SPAWN_MS) {
        const i = spawnIndex % CHART_BLUEPRINT.length;
        const data = CHART_BLUEPRINT[i];
        liveRef.current = [
          ...liveRef.current,
          {
            ...data,
            id: `dc-${seq++}`,
            alt: i % 3 === 0,
            worldX: drift + canvasW - RIGHT_INSET_PX,
          },
        ];
        spawnIndex += 1;
        lastSpawn = now;
        mutated = true;
      }

      const cullX = drift - CANDLE_SLOT_PX * 2;
      if (liveRef.current.length && liveRef.current[0].worldX < cullX) {
        liveRef.current = liveRef.current.filter((c) => c.worldX >= cullX);
        mutated = true;
      }

      if (mutated) {
        setVersion((n) => n + 1);
      } else {
        paint();
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [paint]);

  useEffect(() => {
    paint();
  }, [version, paint]);

  const candles = liveRef.current;

  return (
    <div className="s4__visual" aria-hidden>
      <div className="s4__stage-3d">
        <div className="s4__chart-canvas" ref={canvasRef}>
          <div className="s4__candle-stream s4__candle-stream--absolute" ref={streamRef}>
            {candles.map((c) => (
              <div
                key={c.id}
                className={`s4__dense-candle${c.alt ? ' alt-tone' : ''}`}
                style={
                  {
                    '--h': c.h,
                    '--y': c.y,
                    '--w-t': c.wt,
                    '--w-b': c.wb,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>
      </div>
      <div className="s4__visual-meta">
        <span className="s4__visual-live">Live tape</span>
      </div>
    </div>
  );
}

function splitChars(text: string) {
  return Array.from(text);
}

type InteractiveLettersProps = {
  text: string;
  tone?: LineTone;
  lineIndex: number;
  statementKey: number;
};

function InteractiveLetters({ text, tone = 'plain', lineIndex, statementKey }: InteractiveLettersProps) {
  const chars = splitChars(text);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hoverIndex = useRef(-1);
  const popped = useRef<Set<number>>(new Set());
  const rafRef = useRef(0);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const paint = useCallback(() => {
    const active = hoverIndex.current;
    letterRefs.current.forEach((el, i) => {
      if (!el) return;
      if (reducedRef.current) {
        el.style.transform = '';
        el.style.setProperty('--glow', '0');
        return;
      }

      const isPop = popped.current.has(i);
      if (active < 0 && !isPop) {
        el.style.transform = 'translate3d(0,0,0) rotate(0deg) scale(1)';
        el.style.setProperty('--glow', '0');
        el.classList.remove('is-near', 'is-hot');
        return;
      }

      const dist = active < 0 ? 99 : Math.abs(i - active);
      const influence = Math.max(0, 1 - dist / 3.2);
      const dir = i === active ? 0 : i < active ? -1 : 1;

      const y = isPop ? -18 : -14 * influence - (dist === 0 ? 4 : 0);
      const x = isPop ? 0 : dir * 3.5 * influence;
      const rot = isPop ? (i % 2 === 0 ? -8 : 8) : dir * -7 * influence;
      const scale = isPop ? 1.28 : 1 + 0.22 * influence;

      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${scale})`;
      el.style.setProperty('--glow', String(influence));
      el.classList.toggle('is-hot', dist === 0 || isPop);
      el.classList.toggle('is-near', dist > 0 && dist < 3);
    });
  }, []);

  const schedulePaint = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(paint);
  }, [paint]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <span
      className={`s4__line s4__line--${tone}`}
      onMouseLeave={() => {
        hoverIndex.current = -1;
        schedulePaint();
      }}
      aria-label={text}
    >
      {chars.map((ch, i) => {
        const isSpace = ch === ' ';
        return (
          <span
            key={`${statementKey}-${lineIndex}-${i}-${ch}`}
            ref={(el) => {
              letterRefs.current[i] = el;
            }}
            className={`s4__char${isSpace ? ' s4__char--space' : ''}`}
            style={{ '--i': i, '--line': lineIndex } as CSSProperties}
            onMouseEnter={() => {
              hoverIndex.current = i;
              schedulePaint();
            }}
            onClick={() => {
              if (reducedRef.current) return;
              popped.current.add(i);
              schedulePaint();
              window.setTimeout(() => {
                popped.current.delete(i);
                schedulePaint();
              }, 420);
            }}
          >
            {isSpace ? '\u00A0' : ch}
          </span>
        );
      })}
    </span>
  );
}

export default function Section4() {
  const rootRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLHeadingElement>(null);
  const prog = useRef(0);
  const tgt = useRef(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

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

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let outTimer: number;
    const tick = window.setInterval(() => {
      setPhase('out');
      outTimer = window.setTimeout(() => {
        setIndex((i) => (i + 1) % STATEMENTS.length);
        setPhase('in');
      }, 420);
    }, ROTATE_MS);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(outTimer);
    };
  }, []);

  const onTypeMove = (e: ReactMouseEvent<HTMLHeadingElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty('--spot-x', `${x}%`);
    el.style.setProperty('--spot-y', `${y}%`);
  };

  const statement = STATEMENTS[index];

  return (
    <section ref={rootRef} id="manifesto" className={`s4 ${sans.className}`}>
      <div
        ref={wrapRef}
        className="s4__wrap"
        style={{ opacity: 0, transform: 'translateY(60px)' }}
      >
        <div className="s4__ambient" aria-hidden />

        <div className={`s4__copy s4__copy--${phase}`} aria-live="polite">
          <p className="s4__eyebrow">{statement.eyebrow}</p>

          <h2
            ref={typeRef}
            className={`s4__type ${display.className}`}
            onMouseMove={onTypeMove}
          >
            {statement.lines.map((line, lineIndex) => (
              <InteractiveLetters
                key={`${index}-${line.text}`}
                text={line.text}
                tone={line.tone}
                lineIndex={lineIndex}
                statementKey={index}
              />
            ))}
          </h2>

          <p className="s4__aside">
            <span className="s4__aside-hint">Hover letters · click to pop</span>
            {statement.aside}
          </p>
        </div>

        <SidewaysCandleStage />
      </div>
    </section>
  );
}
