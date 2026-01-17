/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useRef } from 'react';

type TradingViewInterval =
  | '1'
  | '3'
  | '5'
  | '15'
  | '30'
  | '45'
  | '60'
  | '120'
  | '180'
  | '240'
  | 'D'
  | 'W'
  | 'M';

export interface TradingViewWidgetProps {
  /** TradingView symbol, e.g. "FX:EURUSD", "OANDA:EURUSD", "BINANCE:BTCUSDT" */
  symbol: string;
  /** TradingView interval. "60" = 1H, "D" = 1D */
  interval?: TradingViewInterval;
  theme?: 'light' | 'dark';
  locale?: string;
  height?: number | string;
  autosize?: boolean;
  hideSideToolbar?: boolean;
}

export default function TradingViewWidget({
  symbol,
  interval = '60',
  theme = 'dark',
  locale = 'en',
  height = 600,
  autosize = true,
  hideSideToolbar = false
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerHeight = useMemo(() => {
    if (typeof height === 'number') return `${height}px`;
    return height;
  }, [height]);

  const config = useMemo(
    () => ({
      autosize,
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme,
      style: '1',
      locale,
      enable_publishing: false,
      hide_side_toolbar: hideSideToolbar,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com'
    }),
    [autosize, symbol, interval, theme, locale, hideSideToolbar]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget (important when symbol/interval changes)
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.innerHTML = JSON.stringify(config);

    containerRef.current.appendChild(script);
  }, [config]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="tradingview-widget-container w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        // TradingView "autosize" requires the container to have an explicit height.
        style={{ height: containerHeight }}
      />
    </div>
  );
}

