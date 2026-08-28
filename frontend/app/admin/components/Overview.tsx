'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  Users,
  DollarSign,
  CreditCard,
  Target,
  TrendingUp,
  ArrowUpRight,
  UserCheck,
  AlertCircle,
  Clock,
  Tag,
  ChevronRight,
  Activity,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Analytics, Payment, RecentActivityItem, User } from './types';
import type { AdminTabId } from '../config/nav';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

/* ─── helpers ─── */

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDelta(value: number): { label: string; tone: 'up' | 'down' | 'flat' } {
  if (!value) return { label: 'Flat vs last month', tone: 'flat' };
  return { label: `${value > 0 ? '+' : ''}${value}% vs last month`, tone: value > 0 ? 'up' : 'down' };
}

function computeRevenueGrowth(months: Array<{ revenue: number }>): number {
  if (!months?.length) return 0;
  const cur = months[months.length - 1]?.revenue ?? 0;
  const prev = months[months.length - 2]?.revenue ?? 0;
  if (prev <= 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

function initials(name?: string): string {
  const p = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[1][0]}`.toUpperCase();
  return (p[0]?.[0] || '?').toUpperCase();
}

function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function chartColors(dark: boolean) {
  return {
    grid: dark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.25)',
    tick: dark ? '#94a3b8' : '#64748b',
    tooltipBg: dark ? '#0f172a' : '#fff',
    tooltipBorder: dark ? '#334155' : '#e2e8f0',
    tooltipText: dark ? '#f1f5f9' : '#0f172a',
    revenueLine: '#818cf8',
    revenueFill: dark ? 'rgba(129,140,248,0.18)' : 'rgba(99,102,241,0.12)',
    usersBar: dark ? 'rgba(52,211,153,0.75)' : 'rgba(16,185,129,0.7)',
  };
}

/* ─── sub-components ─── */

function DeltaBadge({ delta }: { delta: ReturnType<typeof formatDelta> }) {
  const cls =
    delta.tone === 'up'
      ? 'overview-delta overview-delta--up'
      : delta.tone === 'down'
        ? 'overview-delta overview-delta--down'
        : 'overview-delta overview-delta--flat';
  return <span className={cls}>{delta.label}</span>;
}

type MetricProps = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delta: ReturnType<typeof formatDelta>;
  accent: 'indigo' | 'emerald' | 'violet' | 'sky';
  icon: React.ReactNode;
  delay?: number;
};

function MetricTile({ label, value, prefix = '', suffix = '', decimals = 0, delta, accent, icon, delay = 0 }: MetricProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`overview-metric overview-metric--${accent}`}
    >
      <div className="overview-metric__glow" aria-hidden />
      <div className="overview-metric__top">
        <div className="overview-metric__icon">{icon}</div>
        <DeltaBadge delta={delta} />
      </div>
      <p className="overview-metric__label">{label}</p>
      <p className="overview-metric__value">
        {prefix}
        <CountUp end={value} duration={1.4} decimals={decimals} separator="," />
        {suffix}
      </p>
    </motion.article>
  );
}

type ActionTileProps = {
  title: string;
  subtitle: string;
  accent: string;
  icon: React.ReactNode;
  onClick: () => void;
};

function ActionTile({ title, subtitle, accent, icon, onClick }: ActionTileProps) {
  return (
    <button type="button" onClick={onClick} className={`overview-action-tile ${accent}`}>
      <div className="overview-action-tile__icon">{icon}</div>
      <div className="overview-action-tile__body">
        <span className="overview-action-tile__title">{title}</span>
        <span className="overview-action-tile__sub">{subtitle}</span>
      </div>
      <ArrowUpRight className="overview-action-tile__arrow" />
    </button>
  );
}

type ActivityFilter = 'all' | 'signups' | 'payments';

function ActivityItem({ item }: { item: RecentActivityItem }) {
  const signup = item.type === 'user_registration';
  return (
    <div className="overview-feed-item">
      <div className={`overview-feed-item__avatar ${signup ? 'is-user' : 'is-payment'}`}>
        {signup ? initials(item.userName) : <DollarSign className="h-4 w-4" />}
      </div>
      <div className="overview-feed-item__main">
        <div className="overview-feed-item__row">
          <span className="overview-feed-item__title">{signup ? item.userName : `${item.packageName || 'Payment'}`}</span>
          {signup && item.role ? <span className={`overview-role-pill is-${item.role}`}>{item.role}</span> : null}
          {!signup ? (
            <span className="overview-feed-item__amount">${Number(item.amount || 0).toLocaleString()}</span>
          ) : null}
        </div>
        <p className="overview-feed-item__meta">
          {signup ? (item.email || 'New registration') : `Completed · ${item.userName || 'Unknown'}`}
        </p>
      </div>
      <time className="overview-feed-item__time">{formatRelativeTime(item.createdAt)}</time>
    </div>
  );
}

/* ─── main ─── */

interface OverviewProps {
  analytics: Analytics;
  onTabChange: (tab: AdminTabId) => void;
  userCount?: number;
  payments?: Payment[];
  users?: User[];
  platformName?: string;
  adminName?: string;
}

export default function Overview({
  analytics,
  onTabChange,
  userCount,
  payments = [],
  users = [],
  platformName = 'Forex Navigators',
  adminName = 'Admin',
}: OverviewProps) {
  const isDark = useIsDark();
  const colors = chartColors(isDark);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

  const data = analytics || {
    totalUsers: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    totalPayments: 0,
    paymentsThisMonth: 0,
    activeUsers: 0,
    activePromoCodes: 0,
    monthlyRevenue: [],
    monthlyUserGrowth: [],
    paymentMethodStats: [],
    recentActivity: [],
  };

  const totalUsers = userCount ?? data.totalUsers;
  const revenueGrowth = computeRevenueGrowth(data.monthlyRevenue || []);
  const recentActivity = data.recentActivity || [];

  const attention = useMemo(() => {
    const pendingPayments = payments.filter((p) => p.status === 'pending' || p.status === 'processing');
    const pendingStudents = users.filter((u) => u.role === 'student' && !u.isVerified);
    const lockedUsers = users.filter((u) => u.security?.isLocked);
    return { pendingPayments, pendingStudents, lockedUsers };
  }, [payments, users]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === 'signups') return recentActivity.filter((a) => a.type === 'user_registration');
    if (activityFilter === 'payments') return recentActivity.filter((a) => a.type === 'payment_received');
    return recentActivity;
  }, [recentActivity, activityFilter]);

  const monthLabels = (data.monthlyRevenue || []).map((m) => m.month);
  const revenueValues = (data.monthlyRevenue || []).map((m) => m.revenue);
  const userValues = (data.monthlyUserGrowth || []).map((m) => m.users);

  const revenueChart = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Revenue',
        data: revenueValues,
        borderColor: colors.revenueLine,
        backgroundColor: colors.revenueFill,
        borderWidth: 2.5,
        fill: true,
        tension: 0.42,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: colors.revenueLine,
      },
    ],
  };

  const usersChart = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Signups',
        data: userValues,
        backgroundColor: colors.usersBar,
        borderRadius: 6,
        borderSkipped: false as const,
      },
    ],
  };

  const baseChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.tooltipBg,
        titleColor: colors.tooltipText,
        bodyColor: colors.tooltipText,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: colors.tick, font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: colors.grid },
        ticks: { color: colors.tick, font: { size: 11 }, maxTicksLimit: 5 },
        border: { display: false },
      },
    },
  };

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="overview-command">
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overview-hero"
      >
        <div className="overview-hero__mesh" aria-hidden />
        <div className="overview-hero__content">
          <div>
            <p className="overview-hero__eyebrow">{platformName}</p>
            <h2 className="overview-hero__title">
              {greeting()}, {adminName}
            </h2>
            <p className="overview-hero__date">{todayStr}</p>
          </div>
          <div className="overview-hero__pills">
            <div className="overview-hero__pill">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span>
                <strong>{data.paymentsThisMonth}</strong> payments this month
              </span>
            </div>
            <div className="overview-hero__pill">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <span>
                <strong>{data.activeUsers}</strong> active users
              </span>
            </div>
            <div className="overview-hero__pill">
              <Tag className="h-4 w-4 text-violet-400" />
              <span>
                <strong>{data.activePromoCodes}</strong> live promos
              </span>
            </div>
          </div>
          <div className="overview-hero__actions">
            <button type="button" className="overview-hero__primary-action" onClick={() => onTabChange('payments')}>
              Review payments <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" className="overview-hero__secondary-action" onClick={() => onTabChange('analytics')}>
              <CheckCircle2 className="h-4 w-4" /> Platform health
            </button>
          </div>
        </div>
      </motion.header>

      {/* Metrics */}
      <div className="overview-metrics-grid">
        <MetricTile
          label="Total users"
          value={totalUsers}
          delta={formatDelta(data.monthlyGrowth)}
          accent="indigo"
          icon={<Users className="h-5 w-5" />}
          delay={0}
        />
        <MetricTile
          label="Total revenue"
          value={data.totalRevenue}
          prefix="$"
          delta={formatDelta(revenueGrowth)}
          accent="emerald"
          icon={<DollarSign className="h-5 w-5" />}
          delay={0.06}
        />
        <MetricTile
          label="Total payments"
          value={data.totalPayments}
          delta={{
            label: `${data.paymentsThisMonth} recorded this month`,
            tone: data.paymentsThisMonth ? 'up' : 'flat',
          }}
          accent="violet"
          icon={<CreditCard className="h-5 w-5" />}
          delay={0.12}
        />
        <MetricTile
          label="Active users"
          value={data.activeUsers}
          delta={{
            label: 'Logged in within 30 days',
            tone: 'flat',
          }}
          accent="sky"
          icon={<Zap className="h-5 w-5" />}
          delay={0.18}
        />
      </div>

      {/* Charts + attention bento */}
      <div className="overview-bento">
        <section className="overview-panel overview-panel--chart">
          <div className="overview-panel__head">
            <div>
              <h3 className="overview-panel__title">Revenue trend</h3>
              <p className="overview-panel__sub">Last 6 months · completed payments</p>
            </div>
            <button type="button" className="overview-link-btn" onClick={() => onTabChange('analytics')}>
              Full analytics <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="overview-chart overview-chart--lg">
            <Line data={revenueChart} options={baseChartOpts} />
          </div>
        </section>

        <section className="overview-panel overview-panel--attention">
          <div className="overview-panel__head">
            <div>
              <h3 className="overview-panel__title">Needs attention</h3>
              <p className="overview-panel__sub">Items that may need your review</p>
            </div>
          </div>
          <div className="overview-attention-list">
            <button type="button" className="overview-attention-item" onClick={() => onTabChange('payments')}>
              <div className="overview-attention-item__icon is-amber">
                <Clock className="h-4 w-4" />
              </div>
              <div className="overview-attention-item__text">
                <span>Pending payments</span>
                <small>Awaiting confirmation or proof</small>
              </div>
              <span className="overview-attention-item__count">{attention.pendingPayments.length}</span>
            </button>
            <button type="button" className="overview-attention-item" onClick={() => onTabChange('users')}>
              <div className="overview-attention-item__icon is-indigo">
                <Users className="h-4 w-4" />
              </div>
              <div className="overview-attention-item__text">
                <span>Unverified students</span>
                <small>No approved package yet</small>
              </div>
              <span className="overview-attention-item__count">{attention.pendingStudents.length}</span>
            </button>
            <button type="button" className="overview-attention-item" onClick={() => onTabChange('users')}>
              <div className="overview-attention-item__icon is-rose">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="overview-attention-item__text">
                <span>Locked accounts</span>
                <small>Failed login lockouts</small>
              </div>
              <span className="overview-attention-item__count">{attention.lockedUsers.length}</span>
            </button>
          </div>
        </section>

        <section className="overview-panel overview-panel--chart-sm">
          <div className="overview-panel__head">
            <div>
              <h3 className="overview-panel__title">New signups</h3>
              <p className="overview-panel__sub">Monthly registrations</p>
            </div>
          </div>
          <div className="overview-chart overview-chart--sm">
            <Bar
              data={usersChart}
              options={{
                ...baseChartOpts,
                scales: {
                  ...baseChartOpts.scales,
                  y: { ...baseChartOpts.scales.y, beginAtZero: true },
                },
              }}
            />
          </div>
        </section>

        {/* Quick actions bento */}
        <section className="overview-panel overview-panel--actions">
          <div className="overview-panel__head">
            <div>
              <h3 className="overview-panel__title">Quick actions</h3>
              <p className="overview-panel__sub">Frequent admin workflows</p>
            </div>
          </div>
          <div className="overview-actions-grid">
            <ActionTile
              title="Users"
              subtitle="Manage accounts"
              accent="overview-action-tile--indigo"
              icon={<Users className="h-5 w-5" />}
              onClick={() => onTabChange('users')}
            />
            <ActionTile
              title="Payments"
              subtitle="Review transactions"
              accent="overview-action-tile--emerald"
              icon={<DollarSign className="h-5 w-5" />}
              onClick={() => onTabChange('payments')}
            />
            <ActionTile
              title="Promos"
              subtitle="Discount codes"
              accent="overview-action-tile--violet"
              icon={<Target className="h-5 w-5" />}
              onClick={() => onTabChange('promocodes')}
            />
            <ActionTile
              title="Analytics"
              subtitle="Deep reports"
              accent="overview-action-tile--amber"
              icon={<TrendingUp className="h-5 w-5" />}
              onClick={() => onTabChange('analytics')}
            />
          </div>
        </section>

        {/* Activity feed */}
        <section className="overview-panel overview-panel--feed">
          <div className="overview-panel__head overview-panel__head--stack">
            <div>
              <h3 className="overview-panel__title">Live feed</h3>
              <p className="overview-panel__sub">Registrations and completed payments</p>
            </div>
            <div className="overview-segmented" role="tablist" aria-label="Activity filter">
              {(['all', 'signups', 'payments'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activityFilter === key}
                  className={activityFilter === key ? 'is-active' : ''}
                  onClick={() => setActivityFilter(key)}
                >
                  {key === 'all' ? 'All' : key === 'signups' ? 'Signups' : 'Payments'}
                </button>
              ))}
            </div>
          </div>
          <div className="overview-feed">
            {filteredActivity.length === 0 ? (
              <div className="overview-feed-empty">
                <Activity className="mb-3 h-9 w-9 opacity-30" />
                <p>No activity in this view</p>
              </div>
            ) : (
              filteredActivity.slice(0, 8).map((item) => <ActivityItem key={`${item.type}-${item._id}`} item={item} />)
            )}
          </div>
          <button type="button" className="overview-feed-more" onClick={() => onTabChange('logs')}>
            Open activity logs <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      </div>
    </div>
  );
}
