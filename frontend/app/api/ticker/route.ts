import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BINANCE_TICKER_URL = 'https://api.binance.com/api/v3/ticker/24hr';

const SYMBOLS: { symbol: string; label: string }[] = [
  { symbol: 'BTCUSDT', label: 'BTC/USD' },
  { symbol: 'ETHUSDT', label: 'ETH/USD' },
  { symbol: 'BNBUSDT', label: 'BNB/USD' },
  { symbol: 'XRPUSDT', label: 'XRP/USD' },
  { symbol: 'EURUSDT', label: 'EUR/USD' },
  { symbol: 'ADAUSDT', label: 'ADA/USD' },
  { symbol: 'SOLUSDT', label: 'SOL/USD' },
  { symbol: 'DOGEUSDT', label: 'DOGE/USD' },
];

export interface TickerItem {
  label: string;
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
}

export async function GET() {
  try {
    const res = await fetch(BINANCE_TICKER_URL, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ items: getFallbackItems() }, { status: 200 });
    }
    const data = await res.json();
    const symbolSet = new Set(SYMBOLS.map((s) => s.symbol));
    const bySymbol = (Array.isArray(data) ? data : [])
      .filter((row: any) => symbolSet.has(row.symbol))
      .reduce((acc: Record<string, any>, row: any) => {
        acc[row.symbol] = row;
        return acc;
      }, {});
    const items: TickerItem[] = SYMBOLS.map((meta) => {
      const row = bySymbol[meta.symbol];
      if (!row) {
        return {
          label: meta.label,
          symbol: meta.symbol,
          price: '—',
          change: '—',
          changePercent: '(—)',
          isPositive: true,
        };
      }
      const lastPrice = parseFloat(row.lastPrice || 0);
      const change = parseFloat(row.priceChange || 0);
      const changePercent = parseFloat(row.priceChangePercent || 0);
      const isPositive = change >= 0;
      const formatPrice = (n: number) => {
        if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        if (n >= 1) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
      };
      const formatChange = (n: number) => (n >= 1 || n <= -1 ? n.toFixed(2) : n.toFixed(4));
      return {
        label: meta.label,
        symbol: meta.symbol,
        price: formatPrice(lastPrice),
        change: (isPositive ? '+' : '') + formatChange(change),
        changePercent: `(${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)`,
        isPositive,
      };
    });
    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch {
    return NextResponse.json({ items: getFallbackItems() }, { status: 200 });
  }
}

function getFallbackItems(): TickerItem[] {
  return SYMBOLS.map((s) => ({
    label: s.label,
    symbol: s.symbol,
    price: '—',
    change: '—',
    changePercent: '(—)',
    isPositive: true,
  }));
}
