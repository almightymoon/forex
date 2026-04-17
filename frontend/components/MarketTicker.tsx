'use client';

import React, { useState, useEffect, useRef } from 'react';

const SYMBOLS = [
  { symbol: 'btcusdt', label: 'BTC/USD' },
  { symbol: 'ethusdt', label: 'ETH/USD' },
  { symbol: 'bnbusdt', label: 'BNB/USD' },
  { symbol: 'xrpusdt', label: 'XRP/USD' },
  { symbol: 'eurusdt', label: 'EUR/USD' },
  { symbol: 'adausdt', label: 'ADA/USD' },
  { symbol: 'solusdt', label: 'SOL/USD' },
  { symbol: 'dogeusdt', label: 'DOGE/USD' },
];

export interface TickerItem {
  label: string;
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatChange(n: number): string {
  return n >= 1 || n <= -1 ? n.toFixed(2) : n.toFixed(4);
}

const initialItems: TickerItem[] = SYMBOLS.map((s) => ({
  label: s.label,
  symbol: s.symbol,
  price: '—',
  change: '—',
  changePercent: '(—)',
  isPositive: true,
}));

const BINANCE_WS_URL = `wss://stream.binance.com:9443/stream?streams=${SYMBOLS.map((s) => `${s.symbol}@ticker`).join('/')}`;

export default function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>(initialItems);
  const [connected, setConnected] = useState(false);
  const itemsRef = useRef(initialItems);
  itemsRef.current = items;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        ws = new WebSocket(BINANCE_WS_URL);
      } catch (e) {
        reconnectTimeout = setTimeout(connect, 3000);
        return;
      }

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const data = msg?.data ?? msg;
          const symbol = (data.s || '').toLowerCase();
          if (!symbol) return;
          const lastPrice = parseFloat(data.c || 0);
          const change = parseFloat(data.p || 0);
          const changePercent = parseFloat(data.P || 0);
          const isPositive = change >= 0;
          const next = itemsRef.current.map((item) =>
            item.symbol === symbol
              ? {
                  ...item,
                  price: formatPrice(lastPrice),
                  change: (isPositive ? '+' : '') + formatChange(change),
                  changePercent: `(${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)`,
                  isPositive,
                }
              : item
          );
          setItems(next);
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws?.readyState === WebSocket.OPEN) ws.close();
    };
  }, []);

  const row = (
    <div className="flex items-center gap-8 sm:gap-12 shrink-0">
      {items.map((item) => (
        <div
          key={item.symbol}
          className="flex items-center gap-2 sm:gap-3 whitespace-nowrap"
        >
          <span className="font-bold text-gray-100 text-sm sm:text-base">
            {item.label}
          </span>
          <span className="text-gray-200 text-sm sm:text-base tabular-nums">
            {item.price}
          </span>
          <span
            className={`text-sm sm:text-base tabular-nums ${
              item.isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {item.change} {item.changePercent}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] w-full bg-gray-800 dark:bg-gray-800 border-b border-gray-700 overflow-hidden">
      <div className="h-10 flex items-center">
        {!connected && (
          <div className="absolute left-2 flex items-center gap-1.5 text-xs text-gray-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
            Connecting…
          </div>
        )}
        {connected && (
          <div className="absolute left-2 flex items-center gap-1.5 text-xs text-emerald-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </div>
        )}
        <div className="animate-ticker-marquee flex items-center gap-8 sm:gap-12 shrink-0 pl-20">
          {row}
          {row}
        </div>
      </div>
    </div>
  );
}
