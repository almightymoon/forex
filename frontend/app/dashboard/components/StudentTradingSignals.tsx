'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  LayoutGrid,
  List,
  MessageSquare,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  AdminBadge,
  AdminButton,
  AdminEmptyState,
  AdminPage,
  AdminPanel,
  AdminPanelHeader,
  AdminSearchField,
  AdminSelect,
  AdminStatCard,
  AdminStatGrid,
  AdminToolbar,
  AdminToolbarGroup,
} from '../../admin/components/AdminUI';
import './trading-signals.css';

export type StudentSignal = {
  _id: string;
  symbol?: string;
  instrumentType?: string;
  type?: string;
  currentBid?: number;
  currentAsk?: number;
  dailyHigh?: number;
  dailyLow?: number;
  priceChange?: number;
  priceChangePercent?: number;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  riskRewardRatio?: number;
  positionSize?: string | number;
  description?: string;
  timeframe?: string;
  confidence?: number;
  teacher?: {
    firstName?: string;
    lastName?: string;
  };
  createdAt?: string;
  comments?: unknown[];
  status?: string;
  riskLevel?: string;
};

type Props = {
  signals: StudentSignal[];
  onViewChart: (symbol: string) => void;
  labels?: {
    title?: string;
    emptyTitle?: string;
    emptyHint?: string;
  };
};

function decimalsFor(symbol?: string, instrument?: string): number {
  const s = (symbol || '').toUpperCase();
  const i = (instrument || '').toLowerCase();
  if (i === 'crypto' || s.includes('BTC') || s.includes('ETH')) return 2;
  if (i === 'commodities' || s.includes('XAU') || s.includes('XAG')) return 2;
  if (s.includes('JPY')) return 3;
  return 5;
}

function formatPrice(value: number | undefined | null, decimals = 5): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(2, decimals),
    maximumFractionDigits: decimals,
  });
}

function formatSigned(value: number | undefined | null, decimals = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${n >= 0 ? '+' : '−'}${abs}`;
}

function typeLabel(type?: string): string {
  if (type === 'strong_buy') return 'Strong Buy';
  if (type === 'strong_sell') return 'Strong Sell';
  if (!type) return 'Hold';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function isBuy(type?: string) {
  return type === 'buy' || type === 'strong_buy';
}

function isSell(type?: string) {
  return type === 'sell' || type === 'strong_sell';
}

function sideTone(type?: string): 'emerald' | 'rose' | 'amber' {
  if (isBuy(type)) return 'emerald';
  if (isSell(type)) return 'rose';
  return 'amber';
}

function teacherName(signal: StudentSignal) {
  const t = signal.teacher;
  if (!t) return 'Instructor';
  return `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Instructor';
}

function relativeDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function StudentTradingSignals({ signals, onViewChart, labels = {} }: Props) {
  const [view, setView] = useState<'card' | 'list'>('card');
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState('all');
  const [instrumentFilter, setInstrumentFilter] = useState('all');

  const list = useMemo(() => (signals || []).filter((s) => s && s._id), [signals]);

  const instruments = useMemo(() => {
    const set = new Set(list.map((s) => s.instrumentType).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [list]);

  const stats = useMemo(() => {
    let buy = 0;
    let sell = 0;
    let active = 0;
    for (const s of list) {
      if (isBuy(s.type)) buy += 1;
      if (isSell(s.type)) sell += 1;
      if (!s.status || s.status === 'active') active += 1;
    }
    return { total: list.length, buy, sell, active };
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((s) => {
      if (sideFilter === 'buy' && !isBuy(s.type)) return false;
      if (sideFilter === 'sell' && !isSell(s.type)) return false;
      if (instrumentFilter !== 'all' && s.instrumentType !== instrumentFilter) return false;
      if (!q) return true;
      const hay = `${s.symbol || ''} ${s.description || ''} ${s.instrumentType || ''} ${teacherName(s)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [list, search, sideFilter, instrumentFilter]);

  const openChart = (signal: StudentSignal) => {
    const raw = (signal.symbol || '').trim().toUpperCase();
    if (!raw) return;
    let tv = raw.includes(':') ? raw : `FX:${raw}`;
    if ((signal.instrumentType || '').toLowerCase() === 'crypto' && !raw.includes(':')) {
      tv = `BINANCE:${raw.replace('USD', 'USDT')}`;
    }
    if ((signal.instrumentType || '').toLowerCase() === 'commodities' && raw.includes('XAU') && !raw.includes(':')) {
      tv = `OANDA:${raw}`;
    }
    onViewChart(tv);
  };

  return (
    <AdminPage>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="trading-signals">
        <AdminStatGrid>
          <AdminStatCard label="All signals" value={stats.total} icon={Target} tone="indigo" />
          <AdminStatCard label="Buy ideas" value={stats.buy} icon={TrendingUp} tone="emerald" />
          <AdminStatCard label="Sell ideas" value={stats.sell} icon={TrendingDown} tone="amber" />
          <AdminStatCard label="Active" value={stats.active} icon={BarChart3} tone="sky" />
        </AdminStatGrid>

        <AdminPanel>
          <AdminPanelHeader
            title={labels.title || 'Trading signals'}
            description="Live market ideas from your instructors"
            actions={
              <div className="trading-signals__view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={view === 'card' ? 'is-active' : ''}
                  onClick={() => setView('card')}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Cards
                </button>
                <button
                  type="button"
                  className={view === 'list' ? 'is-active' : ''}
                  onClick={() => setView('list')}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
              </div>
            }
          />

          <AdminToolbar>
            <AdminSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search symbol, teacher, or notes..."
            />
            <AdminToolbarGroup>
              <AdminSelect value={sideFilter} onChange={setSideFilter} aria-label="Filter by side">
                <option value="all">All sides</option>
                <option value="buy">Buy only</option>
                <option value="sell">Sell only</option>
              </AdminSelect>
              <AdminSelect
                value={instrumentFilter}
                onChange={setInstrumentFilter}
                aria-label="Filter by instrument"
              >
                <option value="all">All markets</option>
                {instruments.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </AdminSelect>
            </AdminToolbarGroup>
          </AdminToolbar>

          {filtered.length === 0 ? (
            <AdminEmptyState
              icon={Target}
              title={labels.emptyTitle || 'No signals yet'}
              description={
                list.length === 0
                  ? labels.emptyHint || 'Check back soon — new ideas will appear here.'
                  : 'No signals match your filters.'
              }
            />
          ) : view === 'card' ? (
            <div className="trading-signals__cards">
              {filtered.map((signal) => {
                const dec = decimalsFor(signal.symbol, signal.instrumentType);
                const change = Number(signal.priceChange) || 0;
                const changePct = Number(signal.priceChangePercent) || 0;
                const up = change >= 0;
                return (
                  <article
                    key={signal._id}
                    className={`trading-signals__card trading-signals__card--${sideTone(signal.type)}`}
                  >
                    <header className="trading-signals__card-head">
                      <div className="min-w-0">
                        <div className="trading-signals__symbol-row">
                          <h3 className="trading-signals__symbol">{signal.symbol || '—'}</h3>
                          <AdminBadge tone={sideTone(signal.type)}>{typeLabel(signal.type)}</AdminBadge>
                          <AdminBadge tone="neutral">{signal.instrumentType || 'forex'}</AdminBadge>
                          {signal.timeframe ? <AdminBadge tone="indigo">{signal.timeframe}</AdminBadge> : null}
                        </div>
                        <p className="trading-signals__meta">
                          {teacherName(signal)} · {relativeDate(signal.createdAt)}
                        </p>
                      </div>
                      <div className={`trading-signals__change ${up ? 'is-up' : 'is-down'}`}>
                        {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        <span>
                          {formatSigned(change, Math.min(dec, 2))} ({formatSigned(changePct, 2)}%)
                        </span>
                      </div>
                    </header>

                    {signal.description ? (
                      <p className="trading-signals__desc">{signal.description}</p>
                    ) : null}

                    <div className="trading-signals__quotes">
                      <div>
                        <span>Bid</span>
                        <strong>{formatPrice(signal.currentBid, dec)}</strong>
                      </div>
                      <div>
                        <span>Ask</span>
                        <strong>{formatPrice(signal.currentAsk, dec)}</strong>
                      </div>
                      <div>
                        <span>Day high</span>
                        <strong>{formatPrice(signal.dailyHigh, dec)}</strong>
                      </div>
                      <div>
                        <span>Day low</span>
                        <strong>{formatPrice(signal.dailyLow, dec)}</strong>
                      </div>
                    </div>

                    <div className="trading-signals__levels">
                      <div>
                        <span>Entry</span>
                        <strong>{formatPrice(signal.entryPrice, dec)}</strong>
                      </div>
                      <div>
                        <span>Target</span>
                        <strong className="is-target">{formatPrice(signal.targetPrice, dec)}</strong>
                      </div>
                      <div>
                        <span>Stop</span>
                        <strong className="is-stop">{formatPrice(signal.stopLoss, dec)}</strong>
                      </div>
                      <div>
                        <span>Confidence</span>
                        <strong>{Number(signal.confidence) || 0}%</strong>
                      </div>
                      <div>
                        <span>R:R</span>
                        <strong>
                          {signal.riskRewardRatio != null && Number.isFinite(Number(signal.riskRewardRatio))
                            ? Number(signal.riskRewardRatio).toFixed(2)
                            : '—'}
                        </strong>
                      </div>
                      <div>
                        <span>Size</span>
                        <strong>{signal.positionSize ?? '—'}</strong>
                      </div>
                    </div>

                    <footer className="trading-signals__card-foot">
                      <span className="trading-signals__comments">
                        <MessageSquare className="h-4 w-4" />
                        {signal.comments?.length || 0} comments
                      </span>
                      <AdminButton variant="primary" icon={BarChart3} onClick={() => openChart(signal)}>
                        View chart
                      </AdminButton>
                    </footer>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="trading-signals__table-wrap">
              <table className="trading-signals__table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Entry</th>
                    <th>Target</th>
                    <th>Stop</th>
                    <th>Conf.</th>
                    <th>Posted</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((signal) => {
                    const dec = decimalsFor(signal.symbol, signal.instrumentType);
                    return (
                      <tr key={signal._id}>
                        <td>
                          <div className="trading-signals__table-symbol">
                            <strong>{signal.symbol || '—'}</strong>
                            <span>{signal.instrumentType || 'forex'}</span>
                          </div>
                        </td>
                        <td>
                          <AdminBadge tone={sideTone(signal.type)}>{typeLabel(signal.type)}</AdminBadge>
                        </td>
                        <td className="tabular-nums">{formatPrice(signal.entryPrice, dec)}</td>
                        <td className="tabular-nums">{formatPrice(signal.targetPrice, dec)}</td>
                        <td className="tabular-nums">{formatPrice(signal.stopLoss, dec)}</td>
                        <td className="tabular-nums">{Number(signal.confidence) || 0}%</td>
                        <td>{relativeDate(signal.createdAt)}</td>
                        <td className="text-right">
                          <AdminButton variant="ghost" icon={BarChart3} onClick={() => openChart(signal)}>
                            Chart
                          </AdminButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      </motion.div>
    </AdminPage>
  );
}
