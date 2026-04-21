'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createTextWatermark,
  type IChartApi,
  type Time,
} from 'lightweight-charts';

type Candle = { time: Time; open: number; high: number; low: number; close: number };

function generateCandles(seed: number, count: number): Candle[] {
  const start = Math.floor(Date.now() / 1000) - count * 60;
  let price = 1.084;

  const rnd = (i: number) => {
    const x = Math.sin((i + seed) * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  const out: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const t = (start + i * 60) as Time;
    const drift = (rnd(i) - 0.5) * 0.0012;
    const vol = 0.0006 + rnd(i + 100) * 0.0012;

    const open = price;
    const close = open + drift;
    const high = Math.max(open, close) + vol * (0.35 + rnd(i + 200) * 0.9);
    const low = Math.min(open, close) - vol * (0.35 + rnd(i + 300) * 0.9);
    price = close;

    out.push({
      time: t,
      open: Number(open.toFixed(5)),
      high: Number(high.toFixed(5)),
      low: Number(low.toFixed(5)),
      close: Number(close.toFixed(5)),
    });
  }
  return out;
}

type Props = {
  watermarkLabel?: string;
};

export default function MarketChart({ watermarkLabel = '' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [seed] = useState(() => Math.floor(Math.random() * 10_000) || 1337);
  const candles = useMemo(() => generateCandles(seed, 120), [seed]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255,255,255,0.45)',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        textColor: 'rgba(255,255,255,0.38)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: 'rgba(74,222,128,0.25)', labelBackgroundColor: 'rgba(74,222,128,0.85)' },
        horzLine: { color: 'rgba(255,255,255,0.12)', labelBackgroundColor: 'rgba(255,255,255,0.15)' },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: 'rgba(74,222,128,0.95)',
      downColor: 'rgba(248,113,113,0.9)',
      borderUpColor: 'rgba(74,222,128,0.95)',
      borderDownColor: 'rgba(248,113,113,0.9)',
      wickUpColor: 'rgba(167,243,208,0.9)',
      wickDownColor: 'rgba(254,202,202,0.8)',
    });

    series.setData(candles);

    chart.timeScale().fitContent();
    const pane = chart.panes()[0];
    if (pane && watermarkLabel) {
      createTextWatermark(pane, {
        horzAlign: 'center',
        vertAlign: 'center',
        lines: [
          {
            text: watermarkLabel.slice(0, 48).toUpperCase(),
            color: 'rgba(255,255,255,0.06)',
            fontSize: 18,
          },
        ],
      });
    }

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, watermarkLabel]);

  return <div className="marketChart" ref={wrapRef} aria-hidden />;
}
