'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Gift,
  Lock,
  RefreshCw,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  AdminButton,
  AdminEmptyState,
  AdminPanel,
  AdminPanelHeader,
} from '../../admin/components/AdminUI';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import './student-rank-rewards.css';

type UnlockStatus = 'unlocked' | 'fulfilled' | 'cancelled';
type FilterTab = 'all' | 'unlocked' | 'locked';
type TierTheme = 'bronze' | 'silver' | 'gold' | 'default';

interface Rule {
  _id: string;
  name: string;
  thresholdBalance: number;
  rewardDescription: string;
  rewardValue?: string;
  imageUrl?: string;
  sortOrder?: number;
}

interface Unlock {
  rule: string;
  status: UnlockStatus;
  unlockedAt?: string;
  fulfilledAt?: string;
  thresholdBalance?: number;
  balanceAtUnlock?: number;
  fulfillmentNotes?: string;
}

interface ProgressResponse {
  directBusinessVolumeUsd: number;
  rules: Rule[];
  unlocks: Unlock[];
  currentRule: Rule | null;
  nextRule: Rule | null;
}

interface RuleState {
  isFulfilled: boolean;
  isUnlocked: boolean;
  locked: boolean;
  need: number;
  tierProgressPct: number;
}

function formatMoney(v: number) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function tierTheme(name: string, index: number): TierTheme {
  const lower = (name || '').toLowerCase();
  if (lower.includes('gold')) return 'gold';
  if (lower.includes('silver')) return 'silver';
  if (lower.includes('bronze')) return 'bronze';
  if (index === 0) return 'bronze';
  if (index === 1) return 'silver';
  if (index === 2) return 'gold';
  return 'default';
}

function getRuleState(
  rule: Rule,
  unlock: Unlock | undefined,
  directBusinessVolumeUsd: number,
  previousThreshold = 0
): RuleState {
  const thr = Number(rule.thresholdBalance || 0);
  const reached = directBusinessVolumeUsd >= thr;
  const isFulfilled = unlock?.status === 'fulfilled';
  const isUnlocked = unlock?.status === 'unlocked' || reached;
  const locked = !isUnlocked;
  const need = Math.max(0, thr - directBusinessVolumeUsd);
  const span = Math.max(0.000001, thr - previousThreshold);
  const tierProgressPct = Math.max(
    0,
    Math.min(100, ((directBusinessVolumeUsd - previousThreshold) / span) * 100)
  );

  return { isFulfilled, isUnlocked, locked, need, tierProgressPct };
}

export default function RankRewardsProgress({ hideRefresh = false }: { hideRefresh?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  const load = async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/rank-rewards/progress'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((json as { error?: string })?.error || 'Failed to load rank rewards', 'error');
        setData(null);
        return;
      }
      setData(json as ProgressResponse);
    } catch (e) {
      console.error(e);
      showToast('Failed to load rank rewards', 'error');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = useCallback(() => setSelectedRuleId(null), []);

  useEffect(() => {
    if (!selectedRuleId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedRuleId, closeModal]);

  const unlockByRuleId = useMemo(() => {
    const m = new Map<string, Unlock>();
    (data?.unlocks || []).forEach((u) => {
      if (u?.rule) m.set(String(u.rule), u);
    });
    return m;
  }, [data]);

  const directBusinessVolumeUsd = Number(data?.directBusinessVolumeUsd || 0);
  const rules = Array.isArray(data?.rules) ? data!.rules : [];

  const current = data?.currentRule || null;
  const next = data?.nextRule || null;
  const currentThreshold = Number(current?.thresholdBalance || 0);
  const nextThreshold = Number(next?.thresholdBalance || 0);
  const remaining = next ? Math.max(0, nextThreshold - directBusinessVolumeUsd) : 0;

  const progressPct = useMemo(() => {
    if (!next) return 100;
    const span = Math.max(0.000001, nextThreshold - currentThreshold);
    const raw = ((directBusinessVolumeUsd - currentThreshold) / span) * 100;
    return Math.max(0, Math.min(100, raw));
  }, [next, nextThreshold, currentThreshold, directBusinessVolumeUsd]);

  const stats = useMemo(() => {
    let unlocked = 0;
    let fulfilled = 0;
    for (const r of rules) {
      const unlock = unlockByRuleId.get(String(r._id));
      const { isFulfilled, isUnlocked } = getRuleState(r, unlock, directBusinessVolumeUsd);
      if (isFulfilled) fulfilled += 1;
      else if (isUnlocked) unlocked += 1;
    }
    return {
      total: rules.length,
      unlocked: unlocked + fulfilled,
      fulfilled,
      locked: Math.max(0, rules.length - unlocked - fulfilled),
    };
  }, [rules, unlockByRuleId, directBusinessVolumeUsd]);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const unlock = unlockByRuleId.get(String(r._id));
      const { locked, isUnlocked } = getRuleState(r, unlock, directBusinessVolumeUsd);
      if (filter === 'unlocked') return isUnlocked;
      if (filter === 'locked') return locked;
      return true;
    });
  }, [rules, unlockByRuleId, directBusinessVolumeUsd, filter]);

  const selectedRule = useMemo(
    () => (selectedRuleId ? rules.find((r) => String(r._id) === selectedRuleId) || null : null),
    [rules, selectedRuleId]
  );

  const selectedRuleIndex = useMemo(
    () => (selectedRule ? rules.findIndex((r) => String(r._id) === String(selectedRule._id)) : -1),
    [rules, selectedRule]
  );

  const selectedPreviousThreshold =
    selectedRuleIndex > 0 ? Number(rules[selectedRuleIndex - 1]?.thresholdBalance || 0) : 0;

  const selectedUnlock = selectedRule ? unlockByRuleId.get(String(selectedRule._id)) : undefined;
  const selectedState = selectedRule
    ? getRuleState(selectedRule, selectedUnlock, directBusinessVolumeUsd, selectedPreviousThreshold)
    : null;
  const selectedTheme =
    selectedRule && selectedRuleIndex >= 0 ? tierTheme(selectedRule.name, selectedRuleIndex) : 'default';

  const renderTierCard = (r: Rule, index: number) => {
    const unlock = unlockByRuleId.get(String(r._id));
    const previousThreshold = index > 0 ? Number(rules[index - 1]?.thresholdBalance || 0) : 0;
    const { isFulfilled, isUnlocked, locked, need } = getRuleState(
      r,
      unlock,
      directBusinessVolumeUsd,
      previousThreshold
    );
    const thr = Number(r.thresholdBalance || 0);
    const theme = tierTheme(r.name, index);
    const isCurrentTarget = next?._id === r._id;

    const tierClass = [
      'student-rank-rewards__tier',
      theme !== 'default' ? `student-rank-rewards__tier--${theme}` : '',
      isFulfilled ? 'student-rank-rewards__tier--fulfilled' : '',
      isUnlocked && !isFulfilled ? 'student-rank-rewards__tier--unlocked' : '',
      isCurrentTarget ? 'student-rank-rewards__tier--current' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const iconClass = [
      'student-rank-rewards__tier-icon',
      theme !== 'default' ? `student-rank-rewards__tier-icon--${theme}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        key={r._id}
        type="button"
        className={tierClass}
        onClick={() => setSelectedRuleId(String(r._id))}
        aria-label={`Open ${r.name} reward details`}
      >
        <div className={iconClass}>
          {r.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.imageUrl} alt="" />
          ) : (
            <Trophy className="h-6 w-6" />
          )}
        </div>

        <div className="student-rank-rewards__tier-body">
          <div className="student-rank-rewards__tier-title">
            <h3>{r.name}</h3>
            <span className="student-rank-rewards__threshold">${formatMoney(thr)} volume</span>
          </div>
          <p className="student-rank-rewards__tier-desc">{r.rewardDescription}</p>
          {r.rewardValue && (
            <p className="student-rank-rewards__tier-value">
              <strong>Reward:</strong> {r.rewardValue}
            </p>
          )}
        </div>

        <div className="student-rank-rewards__tier-meta">
          {isFulfilled ? (
            <span className="student-rank-rewards__status student-rank-rewards__status--fulfilled">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Fulfilled
            </span>
          ) : locked ? (
            <span className="student-rank-rewards__status student-rank-rewards__status--locked">
              <Lock className="h-3.5 w-3.5" />
              Locked
            </span>
          ) : (
            <span className="student-rank-rewards__status student-rank-rewards__status--unlocked">
              <Trophy className="h-3.5 w-3.5" />
              Unlocked
            </span>
          )}

          {locked ? (
            <p className="student-rank-rewards__need">
              Need <strong>${formatMoney(need)}</strong> more
            </p>
          ) : (
            <span className="student-rank-rewards__open-hint">
              View details
              <ChevronRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="student-rank-rewards">
        <div className="student-rank-rewards__skeleton">
          <div className="student-rank-rewards__skeleton-block">
            <div className="student-rank-rewards__skeleton-line" style={{ width: '40%', marginBottom: '0.75rem' }} />
            <div className="student-rank-rewards__skeleton-line" style={{ width: '65%', height: '1.5rem' }} />
          </div>
          <div className="student-rank-rewards__skeleton-block">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="student-rank-rewards__skeleton-line"
                style={{ width: '100%', height: '4rem', marginTop: i ? '0.75rem' : 0 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || rules.length === 0) {
    return (
      <AdminPanel>
        <AdminEmptyState
          icon={Trophy}
          title="No rank rewards configured yet"
          description="Milestone rewards will appear here once your platform admin sets them up."
        />
      </AdminPanel>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="student-rank-rewards">
        <section className="student-rank-rewards__hero">
          <div className="student-rank-rewards__hero-inner">
            <div>
              <h2>Referral rank ladder</h2>
              <p>
                Grow direct referral business volume to unlock exclusive rewards — from welcome kits to
                mentoring calls.
              </p>
            </div>
            <div className="student-rank-rewards__stats">
              <div className="student-rank-rewards__stat">
                <strong>${formatMoney(directBusinessVolumeUsd)}</strong>
                <span>Volume</span>
              </div>
              <div className="student-rank-rewards__stat">
                <strong>{current ? current.name : 'Starter'}</strong>
                <span>Current tier</span>
              </div>
              <div className="student-rank-rewards__stat">
                <strong>{stats.unlocked}</strong>
                <span>Unlocked</span>
              </div>
              <div className="student-rank-rewards__stat">
                <strong>{stats.total}</strong>
                <span>Milestones</span>
              </div>
            </div>
          </div>

          <div className="student-rank-rewards__progress-panel">
            <div className="student-rank-rewards__progress-head">
              <div>
                <strong>{next ? `Next: ${next.name}` : 'Top tier reached'}</strong>
                {next ? (
                  <span>
                    {' '}
                    · ${formatMoney(remaining)} more direct referral volume needed
                  </span>
                ) : (
                  <span> · You unlocked every milestone</span>
                )}
              </div>
            </div>
            <div className="student-rank-rewards__track" aria-hidden>
              <div className="student-rank-rewards__track-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="student-rank-rewards__track-labels">
              <span>${formatMoney(currentThreshold)}</span>
              <span>${formatMoney(next ? nextThreshold : currentThreshold)}</span>
            </div>

            {directBusinessVolumeUsd <= 0 && (
              <div className="student-rank-rewards__next-card">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-200" />
                <p>
                  Invite friends to unlock your first reward. Progress updates automatically when direct
                  referrals purchase packages.
                </p>
                <Link href="/referrals" className="student-rank-rewards__cta">
                  <Users className="h-3.5 w-3.5" />
                  Invite friends
                </Link>
              </div>
            )}
          </div>
        </section>

        {directBusinessVolumeUsd <= 0 && (
          <div className="student-rank-rewards__invite-banner">
            <Gift className="h-5 w-5" />
            <p>
              <strong>Start your climb</strong>
              Share your referral link to earn commissions and unlock tier rewards as your network grows.
            </p>
            <Link href="/referrals" className="student-rank-rewards__cta">
              Get referral link
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <AdminPanel>
          <AdminPanelHeader
            title="Reward milestones"
            description="Tap a milestone to see full details and your progress."
            actions={
              hideRefresh ? undefined : (
                <AdminButton
                  variant="secondary"
                  icon={RefreshCw}
                  loading={refreshing}
                  onClick={() => load(true)}
                >
                  Refresh
                </AdminButton>
              )
            }
          />

          <div className="student-rank-rewards__toolbar">
            <div className="student-rank-rewards__filters" role="tablist" aria-label="Filter rewards">
              {(
                [
                  ['all', `All (${stats.total})`],
                  ['unlocked', `Unlocked (${stats.unlocked})`],
                  ['locked', `Locked (${stats.locked})`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={filter === id}
                  className={`student-rank-rewards__filter${filter === id ? ' is-active' : ''}`}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredRules.length === 0 ? (
            <AdminEmptyState
              icon={Trophy}
              title="No rewards in this view"
              description="Try another filter to see your milestone progress."
            />
          ) : (
            <div className="student-rank-rewards__ladder">
              {filteredRules.map((r) => renderTierCard(r, rules.findIndex((x) => x._id === r._id)))}
            </div>
          )}
        </AdminPanel>
      </motion.div>

      {selectedRule &&
        selectedState &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="student-rank-rewards-modal"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div
              className={`student-rank-rewards-modal__panel${
                selectedTheme !== 'default' ? ` student-rank-rewards-modal__panel--${selectedTheme}` : ''
              }`}
              role="dialog"
              aria-modal="true"
            >
              <div
                className={`student-rank-rewards-modal__preview${
                  selectedTheme !== 'default' ? ` student-rank-rewards-modal__preview--${selectedTheme}` : ''
                }`}
              >
                <button
                  type="button"
                  className="student-rank-rewards-modal__close"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="student-rank-rewards-modal__preview-inner">
                  <div className="student-rank-rewards-modal__preview-media">
                    {selectedRule.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedRule.imageUrl} alt="" />
                    ) : (
                      <Trophy className="h-8 w-8" />
                    )}
                  </div>
                  <div className="student-rank-rewards-modal__preview-copy">
                    <h3>{selectedRule.name}</h3>
                    <p>${formatMoney(Number(selectedRule.thresholdBalance || 0))} direct referral volume</p>
                  </div>
                </div>
              </div>

              <div className="student-rank-rewards-modal__body">
                <div className="student-rank-rewards-modal__facts">
                  <div className="student-rank-rewards-modal__fact">
                    <span>Status</span>
                    <strong>
                      {selectedState.isFulfilled
                        ? 'Fulfilled'
                        : selectedState.locked
                          ? 'Locked'
                          : 'Unlocked'}
                    </strong>
                  </div>
                  <div className="student-rank-rewards-modal__fact">
                    <span>Your volume</span>
                    <strong>${formatMoney(directBusinessVolumeUsd)}</strong>
                  </div>
                  <div className="student-rank-rewards-modal__fact">
                    <span>Required</span>
                    <strong>${formatMoney(Number(selectedRule.thresholdBalance || 0))}</strong>
                  </div>
                  <div className="student-rank-rewards-modal__fact">
                    <span>{selectedState.locked ? 'Remaining' : 'Unlocked on'}</span>
                    <strong>
                      {selectedState.locked
                        ? `$${formatMoney(selectedState.need)}`
                        : formatDate(selectedUnlock?.unlockedAt)}
                    </strong>
                  </div>
                </div>

                {!selectedState.isFulfilled && (
                  <div className="student-rank-rewards-modal__progress">
                    <div className="student-rank-rewards-modal__progress-head">
                      <span>Progress toward this tier</span>
                      <strong>{Math.round(selectedState.tierProgressPct)}%</strong>
                    </div>
                    <div className="student-rank-rewards-modal__progress-track" aria-hidden>
                      <div
                        className="student-rank-rewards-modal__progress-fill"
                        style={{ width: `${selectedState.tierProgressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="student-rank-rewards-modal__desc">{selectedRule.rewardDescription}</p>

                {selectedRule.rewardValue ? (
                  <div className="student-rank-rewards-modal__reward-box">
                    <strong>What you get</strong>
                    <p>{selectedRule.rewardValue}</p>
                  </div>
                ) : null}

                {selectedState.isFulfilled && selectedUnlock?.fulfilledAt ? (
                  <div className="student-rank-rewards-modal__fact">
                    <span>Fulfilled on</span>
                    <strong>{formatDate(selectedUnlock.fulfilledAt)}</strong>
                  </div>
                ) : null}

                {selectedUnlock?.fulfillmentNotes ? (
                  <p className="student-rank-rewards-modal__desc">
                    <strong>Notes:</strong> {selectedUnlock.fulfillmentNotes}
                  </p>
                ) : null}

                <div className="student-rank-rewards-modal__actions">
                  {selectedState.locked ? (
                    <Link href="/referrals" className="student-rank-rewards-modal__btn student-rank-rewards-modal__btn--primary">
                      <Users className="h-3.5 w-3.5" />
                      Invite referrals
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="student-rank-rewards-modal__btn student-rank-rewards-modal__btn--ghost"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
