'use client';

import { DM_Sans } from 'next/font/google';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
} from 'recharts';
import { resolveBackendAssetUrl } from '../../lib/resolveBackendAssetUrl';

/** Same geometric sans as the landing hero / nav—explicit here so weights match references */
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export type MonthlyProgressPublicPayload =
  | { enabled: false }
  | {
      enabled: true;
      title: string;
      subtitle?: string;
      periodLabel?: string;
      displayMode: 'structured' | 'split_images' | 'full_image';
      columnLabels: string[];
      rows: { name: string; values: number[] }[];
      leftImageUrl?: string;
      rightImageUrl?: string;
      fullImageUrl?: string;
    };

/** Reference-style palette: teal, orange, blue — then muted extensions */
const SERIES_COLORS = ['#0d9488', '#ea580c', '#2563eb', '#0891b2', '#d97706', '#1d4ed8', '#64748b', '#0f766e'];

async function fetchPublicMonthlyProgress(): Promise<MonthlyProgressPublicPayload> {
  const res = await fetch('/api/monthly-progress/public', { cache: 'no-store' });
  if (!res.ok) return { enabled: false };
  return res.json();
}

function formatCell(n: number) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Count-like vs money labels — used to pick a sensible default column for the pie */
function yAxisIdForColumn(label: string): 'money' | 'sets' {
  const l = label.toLowerCase();
  if (/\bsets?\b/.test(l)) return 'sets';
  return 'money';
}

/** Prefer “profit”; otherwise first non-sets column; finally first column */
function pickPieColumnIndex(columnLabels: string[]): number {
  const profitIdx = columnLabels.findIndex((lab) => /\bprofit\b/i.test(lab));
  if (profitIdx >= 0) return profitIdx;
  const moneyIdx = columnLabels.findIndex((lab) => yAxisIdForColumn(lab) === 'money');
  if (moneyIdx >= 0) return moneyIdx;
  return 0;
}

/** Pie slices need non-negative magnitudes; loss columns use absolute share */
function pieSliceValue(raw: number, columnLabel: string): number {
  const l = columnLabel.toLowerCase();
  if (/\blose\b|\bloss\b/i.test(l)) return Math.abs(Number(raw)) || 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

/** Slightly enlarged slice on hover — Recharts passes computed sector props */
function MonthlyProgressActiveSlice(props: Record<string, unknown>) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const startAngle = Number(props.startAngle ?? 0);
  const endAngle = Number(props.endAngle ?? 0);
  const fill = String(props.fill ?? '#94a3b8');
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 14}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="#ffffff"
      strokeWidth={2}
      style={{ filter: 'brightness(1.08)', cursor: 'pointer' }}
    />
  );
}

const COMPACT_MAX_WIDTH = 959;

export default function SectionMonthlyProgress() {
  const [payload, setPayload] = useState<MonthlyProgressPublicPayload | null>(null);
  const [chartPlotPx, setChartPlotPx] = useState(360);
  const [pieHoverIndex, setPieHoverIndex] = useState<number | null>(null);
  const [compactLayout, setCompactLayout] = useState(false);
  const chartMeasureRef = useRef<HTMLDivElement | null>(null);
  const splitDashRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COMPACT_MAX_WIDTH}px)`);
    const sync = () => setCompactLayout(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchPublicMonthlyProgress();
      if (!cancelled) setPayload(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** One donut: each slice = row (period); size = chosen metric (profit preferred) */
  const pieChartBundle = useMemo(() => {
    if (!payload || !payload.enabled || payload.displayMode !== 'structured') {
      return { slices: [] as { name: string; value: number }[], metricLabel: '' };
    }
    const { columnLabels, rows } = payload;
    if (!columnLabels.length || !rows.length) {
      return { slices: [], metricLabel: '' };
    }
    const colIdx = pickPieColumnIndex(columnLabels);
    const metricLabel = columnLabels[colIdx] ?? '';
    const slices = rows.map((row) => ({
      name: row.name,
      value: pieSliceValue(row.values[colIdx] ?? 0, metricLabel),
    }));
    return { slices, metricLabel };
  }, [payload]);

  const metricCount =
    payload?.enabled && payload.displayMode === 'structured' ? payload.columnLabels.length : 0;
  const periodCount =
    payload?.enabled && payload.displayMode === 'structured' ? payload.rows.length : 0;

  const pieTotal = useMemo(
    () => pieChartBundle.slices.reduce((s, x) => s + x.value, 0),
    [pieChartBundle.slices],
  );

  const fillsViewport = Boolean(
    payload?.enabled &&
      payload.displayMode === 'structured' &&
      payload.columnLabels.length > 0 &&
      payload.rows.length > 0,
  );

  /** Shorter fixed heights on narrow screens so the donut + legend fit without clipping */
  const pieContainerHeight = useMemo(() => {
    if (!fillsViewport) return compactLayout ? 300 : 380;
    const floor = compactLayout ? 260 : 380;
    const cap = compactLayout ? 340 : 620;
    return Math.min(cap, Math.max(chartPlotPx, floor));
  }, [fillsViewport, chartPlotPx, compactLayout]);

  useLayoutEffect(() => {
    if (!fillsViewport) return;
    const measureEl = chartMeasureRef.current;
    const splitEl = splitDashRef.current;
    const update = () => {
      const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
      const narrow =
        typeof window !== 'undefined' && window.innerWidth <= COMPACT_MAX_WIDTH;
      /* Prefer space from the split row to the bottom of the viewport so the chart fills the screen */
      let fromViewportBottom = 0;
      if (splitEl) {
        const sr = splitEl.getBoundingClientRect();
        const sectionBottomPad = narrow ? 48 : 72;
        fromViewportBottom = Math.max(
          0,
          Math.min(Math.floor(vh * (narrow ? 0.65 : 0.82)), Math.floor(vh - sr.top - sectionBottomPad)),
        );
      }
      let vhFloor = Math.max(280, Math.floor(vh * (narrow ? 0.42 : 0.58)), fromViewportBottom);
      if (narrow) {
        vhFloor = Math.min(vhFloor, Math.floor(vh * 0.45));
        vhFloor = Math.max(220, vhFloor);
      }
      let h = 0;
      if (measureEl) {
        const r = measureEl.getBoundingClientRect();
        if (r.height >= 1) h = Math.floor(r.height);
      }
      if (h < 220 && splitEl) {
        const sr = splitEl.getBoundingClientRect();
        const reserve = narrow ? 72 : 100;
        h = Math.max(h, Math.floor(sr.height - reserve));
      }
      let next = Math.max(240, h || 0, vhFloor);
      if (narrow) next = Math.min(next, 380);
      setChartPlotPx(next);
    };
    update();
    const roTargets = [measureEl, splitEl].filter(Boolean) as HTMLElement[];
    const ro = new ResizeObserver(update);
    roTargets.forEach((node) => ro.observe(node));
    window.addEventListener('resize', update, { passive: true });
    const t = window.setTimeout(update, 0);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [fillsViewport, metricCount, periodCount]);

  if (!payload || !payload.enabled) return null;

  const title = payload.title?.trim() || 'Monthly trading progress';

  return (
    <section
      className={`fx-mp ${dmSans.className}${fillsViewport ? ' fx-mp--fill' : ''}`}
      id="monthly-progress"
      aria-labelledby="fx-mp-title"
      data-nav-surface="light"
    >
      <style jsx global>{`
        .fx-mp {
          position: relative;
          /* Clear fixed landing nav (~72–84px) + comfortable inset */
          padding-top: clamp(96px, 11vh, 140px);
          padding-left: clamp(24px, 5vw, 56px);
          padding-right: clamp(24px, 5vw, 56px);
          padding-bottom: clamp(48px, 8vh, 96px);
          color: #171717;
          background: #ffffff;
          box-sizing: border-box;
        }
        @media (max-width: 959px) {
          .fx-mp {
            padding-top: clamp(72px, 14vw, 96px);
            padding-left: clamp(14px, 4vw, 20px);
            padding-right: clamp(14px, 4vw, 20px);
            padding-bottom: clamp(28px, 6vh, 48px);
            overflow-x: hidden;
          }
          .fx-mp.fx-mp--fill {
            padding-top: clamp(72px, 12vw, 100px);
            padding-bottom: clamp(24px, 5vh, 40px);
          }
          .fx-mp--fill .fx-mp__split.fx-mp__split--dash {
            gap: clamp(24px, 6vw, 36px);
          }
          .fx-mp--fill .fx-mp__split--dash > .fx-mp__block:last-child .fx-mp__chart-shell {
            width: 100%;
            max-width: 100%;
          }
          .fx-mp__table-scroll {
            max-width: 100%;
          }
          .fx-mp__table {
            min-width: 0;
            width: 100%;
            font-size: clamp(13px, 3.5vw, 15px);
          }
          .fx-mp__table thead th {
            padding: 10px 8px 12px 0;
            font-size: 11px;
            white-space: normal;
            line-height: 1.25;
            vertical-align: bottom;
          }
          .fx-mp__table tbody td {
            padding: 12px 8px 12px 0;
          }
          .fx-mp__pie-source {
            font-size: 12px;
            line-height: 1.4;
          }
          .fx-mp__chart-inner--pie {
            min-height: 240px;
          }
          .fx-mp--fill {
            grid-template-rows: auto auto;
            min-height: 0;
          }
        }
        .fx-mp.fx-mp--fill {
          padding-top: clamp(96px, 10vh, 132px);
          padding-bottom: clamp(32px, 5vh, 72px);
        }
        /*
          Fill viewport: column flex + min-height alone often leaves flex-grow with 0 free space
          (indefinite flex container height). Single grid row 1fr + min-height yields a definite track.
        */
        .fx-mp--fill {
          box-sizing: border-box;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
        }
        @media (min-width: 960px) {
          .fx-mp--fill {
            min-height: 100vh;
            min-height: 100svh;
            min-height: 100dvh;
            grid-template-rows: minmax(0, 1fr);
          }
          section#monthly-progress.fx-mp--fill {
            min-height: 100vh;
            min-height: 100svh;
            min-height: 100dvh;
          }
        }
        /* styled-jsx leaves a <style> sibling — display:contents avoids stealing grid rows */
        .fx-mp:not(.fx-mp--fill) .fx-mp__viewport {
          display: contents;
        }
        .fx-mp--fill .fx-mp__viewport {
          grid-column: 1;
          grid-row: 1;
          min-height: 0;
          align-self: stretch;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          grid-template-rows: minmax(0, 1fr);
          width: 100%;
        }
        .fx-mp--fill .fx-mp__viewport > .fx-mp__inner {
          grid-row: 1;
          min-height: 0;
          align-self: stretch;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          grid-template-rows: auto minmax(0, 1fr);
          width: 100%;
        }
        @media (max-width: 959px) {
          .fx-mp--fill .fx-mp__viewport {
            grid-template-rows: auto auto;
            height: auto;
          }
          .fx-mp--fill .fx-mp__viewport > .fx-mp__inner {
            grid-template-rows: auto auto;
            height: auto;
          }
        }
        /*
          Fill mode: flex (not grid). Base .fx-mp__split uses align-items: start which keeps grid
          rows from stretching children — percentage heights on the chart never resolve.
        */
        .fx-mp--fill .fx-mp__split.fx-mp__split--dash {
          grid-row: 2;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          align-content: stretch;
          min-height: 0;
          width: 100%;
          gap: clamp(32px, 5vw, 48px);
        }
        @media (min-width: 960px) {
          .fx-mp--fill .fx-mp__split.fx-mp__split--dash {
            flex-direction: row;
            gap: clamp(36px, 5vw, 56px);
          }
        }
        .fx-mp--fill .fx-mp__split--dash > .fx-mp__block:first-child {
          flex: 0 0 auto;
          min-height: 0;
        }
        @media (min-width: 960px) {
          .fx-mp--fill .fx-mp__split--dash > .fx-mp__block:first-child {
            flex: 1.22 1 0;
            min-width: 0;
          }
        }
        .fx-mp--fill .fx-mp__split--dash > .fx-mp__block:last-child {
          flex: 1 1 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          min-width: 0;
        }
        .fx-mp--fill .fx-mp__split--dash > .fx-mp__block:last-child .fx-mp__kicker {
          flex-shrink: 0;
        }
        .fx-mp--fill .fx-mp__split--dash > .fx-mp__block:last-child .fx-mp__chart-shell {
          flex: 1 1 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: #fafafa;
          border-radius: 8px;
        }
        .fx-mp__inner {
          max-width: min(1320px, 100%);
          margin: 0 auto;
          width: 100%;
        }

        /* Centered headline — DM Sans weights 700–800 */
        .fx-mp__head {
          text-align: center;
          margin: 0 auto clamp(40px, 5.5vw, 56px);
          max-width: 920px;
          flex-shrink: 0;
        }
        .fx-mp--fill .fx-mp__head {
          grid-row: 1;
          margin-bottom: clamp(28px, 4vw, 44px);
        }
        .fx-mp__date {
          margin: 0 0 12px;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.45;
          color: #737373;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .fx-mp__title {
          margin: 0;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.12;
          font-size: clamp(1.875rem, 4vw, 2.75rem);
          color: #0a0a0a;
          text-wrap: balance;
        }
        .fx-mp__sub {
          margin: 18px auto 0;
          font-size: 15px;
          line-height: 1.6;
          color: #737373;
          font-weight: 400;
          max-width: 36rem;
        }

        /* Two columns — flush on section gray (no white cards) */
        .fx-mp__split {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(32px, 5vw, 48px);
          align-items: start;
        }
        @media (min-width: 960px) {
          .fx-mp__split--dash {
            /* Slightly wider summary / table column than the trend chart */
            grid-template-columns: minmax(0, 1.22fr) minmax(0, 1fr);
            gap: clamp(36px, 5vw, 56px);
          }
        }

        .fx-mp__block {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .fx-mp__kicker {
          margin: 0 0 14px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #525252;
          text-align: left;
        }
        .fx-mp__pie-source {
          margin: -6px 0 14px;
          font-size: 13px;
          line-height: 1.45;
          color: #737373;
          font-weight: 500;
        }
        .fx-mp__pie-source span {
          color: #404040;
          font-weight: 600;
        }
        .fx-mp__chart-inner--pie {
          min-height: 300px;
          overflow: visible;
        }
        @media (min-width: 960px) {
          .fx-mp__chart-inner--pie {
            min-height: min(420px, 46vw);
          }
        }
        .fx-mp__chart-shell--pie {
          overflow: visible;
        }
        .fx-mp--fill .fx-mp__split--dash > .fx-mp__block:last-child .fx-mp__chart-shell--pie {
          overflow: visible;
        }
        .fx-mp--fill .fx-mp__chart-measure--pie {
          overflow: visible;
        }
        /* Clicking a slice focuses the SVG path — remove default focus ring */
        .fx-mp__chart-inner--pie svg path:focus,
        .fx-mp__chart-inner--pie svg path:focus-visible {
          outline: none !important;
        }
        .fx-mp__chart-inner--pie .recharts-pie-sector:focus {
          outline: none !important;
        }
        .fx-mp__chart-inner--pie .recharts-wrapper {
          -webkit-tap-highlight-color: transparent;
        }
        .fx-mp__pie-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 240px;
          padding: 2rem 1rem;
          text-align: center;
          font-size: 14px;
          color: #737373;
        }

        /* Minimal table — horizontal rules only */
        .fx-mp__table-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .fx-mp__table {
          width: 100%;
          min-width: 420px;
          border-collapse: collapse;
          font-size: clamp(15px, 1.05vw, 17px);
        }
        .fx-mp__table tbody tr {
          transition: background-color 0.2s ease;
        }
        .fx-mp__table tbody tr:hover {
          background-color: rgba(13, 148, 136, 0.075);
        }
        .fx-mp__table tbody tr:hover td:first-child {
          color: #0f766e;
        }
        .fx-mp__table tbody tr:hover td.fx-mp__num--neg {
          color: #b91c1c;
        }
        @media (prefers-reduced-motion: reduce) {
          .fx-mp__table tbody tr {
            transition: none;
          }
        }
        .fx-mp__table thead th {
          padding: 14px 18px 16px 0;
          text-align: right;
          font-weight: 700;
          font-size: clamp(13px, 0.95vw, 15px);
          color: #171717;
          border-bottom: 1px solid #d4d4d4;
          white-space: nowrap;
        }
        .fx-mp__table thead th:first-child {
          text-align: left;
          padding-left: 0;
        }
        .fx-mp__table tbody td {
          padding: 18px 18px 18px 0;
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-feature-settings: 'tnum' 1;
          color: #262626;
          font-weight: 400;
          border-bottom: 1px solid #e5e5e5;
        }
        .fx-mp__table tbody td:first-child {
          text-align: left;
          font-weight: 600;
          color: #0a0a0a;
          padding-right: 16px;
        }
        .fx-mp__table tbody tr:last-child td {
          border-bottom: none;
        }
        .fx-mp__num--neg {
          color: #b91c1c;
          font-weight: 500;
        }

        /* Chart — vertical bands only; no framed “card” */
        .fx-mp__chart-shell {
          position: relative;
          width: 100%;
          border: none;
          border-radius: 0;
          background: transparent;
          overflow: visible;
          min-height: 280px;
        }
        .fx-mp__chart-stripes {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 1;
          background: repeating-linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.03) 0,
            rgba(0, 0, 0, 0.03) calc(100% / var(--fx-stripes, 4)),
            transparent calc(100% / var(--fx-stripes, 4)),
            transparent calc(200% / var(--fx-stripes, 4))
          );
        }
        .fx-mp__chart-inner {
          position: relative;
          z-index: 1;
          padding: 8px 4px 4px;
          min-height: 280px;
          height: min(360px, 52vw);
        }
        .fx-mp__chart-measure {
          position: relative;
          z-index: 1;
          width: 100%;
        }
        @media (min-width: 960px) {
          .fx-mp__chart-inner {
            height: min(380px, 48vw);
          }
        }
        /* Recharts measures parent — percentage height often stays 0; measure div + px height fixes it */
        .fx-mp--fill .fx-mp__chart-inner {
          flex: 1 1 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          height: auto !important;
          padding: 8px 4px 4px;
        }
        .fx-mp--fill .fx-mp__chart-measure {
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
        }

        /* Media modes */
        .fx-mp__sheet {
          background: #ffffff;
          border: 1px solid #e7e7e7;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.06);
        }
        .fx-mp__sheet-head {
          padding: clamp(28px, 4vw, 36px) clamp(22px, 4vw, 40px) clamp(22px, 3vw, 28px);
          border-bottom: 1px solid #ebebeb;
          text-align: center;
          background: #ffffff;
        }
        .fx-mp__sheet-head .fx-mp__date {
          margin-bottom: 12px;
        }
        .fx-mp__sheet-head .fx-mp__title {
          font-size: clamp(1.75rem, 3.5vw, 2.35rem);
        }
        .fx-mp__sheet-head .fx-mp__sub {
          margin-top: 16px;
        }
        .fx-mp__media {
          margin: 0;
          border-top: 1px solid #e5e5e5;
          background: #0a0a0a;
        }
        .fx-mp__img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: contain;
        }
        .fx-mp__split-img {
          display: grid;
          grid-template-columns: 1fr;
          border-top: 1px solid #e5e5e5;
        }
        @media (min-width: 960px) {
          .fx-mp__split-img {
            grid-template-columns: 1fr 1fr;
          }
        }
        .fx-mp__split-img > div {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fafafa;
          min-height: 200px;
        }
        @media (min-width: 960px) {
          .fx-mp__split-img > div:first-child {
            border-right: 1px solid #e5e5e5;
          }
        }
        .fx-mp__empty-hint {
          text-align: center;
          color: #737373;
          font-size: 14px;
          padding: 2.5rem 1rem;
        }
      `}</style>

      <div className="fx-mp__viewport">
      <div className="fx-mp__inner">
        {payload.displayMode === 'structured' &&
        payload.columnLabels.length > 0 &&
        payload.rows.length > 0 ? (
          <>
            <header className="fx-mp__head">
              {payload.periodLabel ? <p className="fx-mp__date">{payload.periodLabel}</p> : null}
              <h2 id="fx-mp-title" className="fx-mp__title">
                {title}
              </h2>
              {payload.subtitle ? <p className="fx-mp__sub">{payload.subtitle}</p> : null}
            </header>

            <div ref={splitDashRef} className="fx-mp__split fx-mp__split--dash">
              <div className="fx-mp__block">
                <p className="fx-mp__kicker">Summary</p>
                <div className="fx-mp__table-scroll">
                <table className="fx-mp__table">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      {payload.columnLabels.map((c) => (
                        <th key={c} scope="col">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payload.rows.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        {payload.columnLabels.map((_, i) => {
                          const v = row.values[i];
                          const neg = Number.isFinite(v) && v < 0;
                          return (
                            <td key={i} className={neg ? 'fx-mp__num--neg' : undefined}>
                              {formatCell(v)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="fx-mp__block">
                <p className="fx-mp__kicker">Breakdown</p>
                {pieChartBundle.metricLabel ? (
                  <p className="fx-mp__pie-source">
                    Share by period · <span>{pieChartBundle.metricLabel}</span>
                  </p>
                ) : null}
              <div className="fx-mp__chart-shell fx-mp__chart-shell--pie">
                <div className="fx-mp__chart-inner fx-mp__chart-inner--pie">
                  <div className="fx-mp__chart-measure fx-mp__chart-measure--pie" ref={chartMeasureRef}>
                    {pieTotal > 0 ? (
                    <ResponsiveContainer width="100%" height={pieContainerHeight}>
                      <PieChart
                        margin={
                          compactLayout
                            ? { top: 8, right: 4, left: 4, bottom: 46 }
                            : { top: 10, right: 6, left: 6, bottom: 54 }
                        }
                      >
                        <Pie
                          data={pieChartBundle.slices}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy={compactLayout ? '45%' : '44%'}
                          innerRadius={compactLayout ? '42%' : '40%'}
                          outerRadius={compactLayout ? '68%' : '71%'}
                          paddingAngle={2}
                          stroke="#ffffff"
                          strokeWidth={2}
                          cursor="pointer"
                          activeShape={MonthlyProgressActiveSlice}
                          rootTabIndex={-1}
                          isAnimationActive
                          animationDuration={380}
                          onMouseEnter={(_, i) => setPieHoverIndex(i)}
                          onMouseLeave={() => setPieHoverIndex(null)}
                        >
                          {pieChartBundle.slices.map((slice, i) => (
                            <Cell
                              key={slice.name}
                              fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                              opacity={
                                pieHoverIndex === null || pieHoverIndex === i ? 1 : 0.38
                              }
                              style={{
                                cursor: 'pointer',
                                transition: 'opacity 0.18s ease',
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          animationDuration={150}
                          formatter={(value: number | string, name: string) => {
                            const v = Number(value);
                            const pct = pieTotal > 0 ? ((v / pieTotal) * 100).toFixed(1) : '0';
                            return [`${formatCell(v)} (${pct}%)`, name];
                          }}
                          labelStyle={{ color: '#171717', fontWeight: 600, fontSize: 13 }}
                          contentStyle={{
                            borderRadius: 8,
                            border: '1px solid #e5e5e5',
                            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.1)',
                            padding: '10px 14px',
                            background: '#ffffff',
                          }}
                          itemStyle={{ color: '#404040', fontWeight: 500, fontSize: 13 }}
                          cursor={{ fill: 'transparent' }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={56}
                          iconType="circle"
                          formatter={(value) => (
                            <span style={{ color: '#404040', fontSize: 12, fontWeight: 500 }}>
                              {value}
                            </span>
                          )}
                          wrapperStyle={{ paddingTop: 4 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    ) : (
                      <div className="fx-mp__pie-empty">
                        Nothing to plot for this metric (all values are zero).
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>
          </>
        ) : null}

        {payload.displayMode === 'structured' &&
        (payload.columnLabels.length === 0 || payload.rows.length === 0) ? (
          <>
            <header className="fx-mp__head">
              {payload.periodLabel ? <p className="fx-mp__date">{payload.periodLabel}</p> : null}
              <h2 id="fx-mp-title" className="fx-mp__title">
                {title}
              </h2>
              {payload.subtitle ? <p className="fx-mp__sub">{payload.subtitle}</p> : null}
            </header>
            <p className="fx-mp__empty-hint">Monthly progress data will appear here once configured.</p>
          </>
        ) : null}

        {payload.displayMode === 'full_image' && payload.fullImageUrl ? (
          <div className="fx-mp__sheet">
            <header className="fx-mp__sheet-head">
              {payload.periodLabel ? <p className="fx-mp__date">{payload.periodLabel}</p> : null}
              <h2 id="fx-mp-title" className="fx-mp__title">
                {title}
              </h2>
              {payload.subtitle ? <p className="fx-mp__sub">{payload.subtitle}</p> : null}
            </header>
            <figure className="fx-mp__media">
              <img className="fx-mp__img" src={resolveBackendAssetUrl(payload.fullImageUrl)} alt="" loading="lazy" />
            </figure>
          </div>
        ) : null}

        {payload.displayMode === 'split_images' ? (
          <div className="fx-mp__sheet">
            <header className="fx-mp__sheet-head">
              {payload.periodLabel ? <p className="fx-mp__date">{payload.periodLabel}</p> : null}
              <h2 id="fx-mp-title" className="fx-mp__title">
                {title}
              </h2>
              {payload.subtitle ? <p className="fx-mp__sub">{payload.subtitle}</p> : null}
            </header>
            <div className="fx-mp__split-img">
              <div>
                {payload.leftImageUrl ? (
                  <img className="fx-mp__img" src={resolveBackendAssetUrl(payload.leftImageUrl)} alt="" loading="lazy" />
                ) : (
                  <span className="fx-mp__empty-hint">No left image</span>
                )}
              </div>
              <div>
                {payload.rightImageUrl ? (
                  <img className="fx-mp__img" src={resolveBackendAssetUrl(payload.rightImageUrl)} alt="" loading="lazy" />
                ) : (
                  <span className="fx-mp__empty-hint">No right image</span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      </div>
    </section>
  );
}
