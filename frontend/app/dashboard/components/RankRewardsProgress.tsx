'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowRight, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

type UnlockStatus = 'unlocked' | 'fulfilled' | 'cancelled';

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
}

interface ProgressResponse {
  level1ReferralCount: number;
  rules: Rule[];
  unlocks: Unlock[];
  currentRule: Rule | null;
  nextRule: Rule | null;
}

function formatCount(v: number) {
  const n = Math.max(0, Math.floor(Number(v) || 0));
  return n.toLocaleString();
}

export default function RankRewardsProgress() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProgressResponse | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/rank-rewards/progress'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((json as any)?.error || 'Failed to load rank rewards', 'error');
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
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlockByRuleId = useMemo(() => {
    const m = new Map<string, Unlock>();
    (data?.unlocks || []).forEach((u) => {
      if (u?.rule) m.set(String(u.rule), u);
    });
    return m;
  }, [data]);

  const level1ReferralCount = Number(data?.level1ReferralCount || 0);
  const rules = Array.isArray(data?.rules) ? data!.rules : [];

  const current = data?.currentRule || null;
  const next = data?.nextRule || null;
  const currentThreshold = Number(current?.thresholdBalance || 0);
  const nextThreshold = Number(next?.thresholdBalance || 0);
  const remaining = next ? Math.max(0, nextThreshold - level1ReferralCount) : 0;

  const progressPct = useMemo(() => {
    if (!next) return 100;
    const span = Math.max(0.000001, nextThreshold - currentThreshold);
    const raw = ((level1ReferralCount - currentThreshold) / span) * 100;
    return Math.max(0, Math.min(100, raw));
  }, [next, nextThreshold, currentThreshold, level1ReferralCount]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="mt-4 h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="mt-6 h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="mt-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || rules.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 border border-gray-200 dark:border-gray-700 shadow-lg text-center">
        <Trophy className="w-10 h-10 mx-auto text-gray-400" />
        <h4 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">No rank rewards configured yet.</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Please check back later.
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Direct referrals (Level 1)</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCount(level1ReferralCount)}</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Current tier:{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {current ? current.name : 'Not started'}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/20 p-4 min-w-[260px]">
            <p className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">
              Next reward
            </p>
            {next ? (
              <>
                <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{next.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get <span className="font-semibold text-gray-900 dark:text-white">{formatCount(remaining)}</span> more direct referral(s)
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">All rewards unlocked</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Great work — you reached the top tier.</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>{formatCount(currentThreshold)}</span>
            <span>{formatCount(next ? nextThreshold : currentThreshold)}</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {level1ReferralCount <= 0 && (
          <div className="mt-5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Invite friends to unlock your first reward.
                </p>
                <p className="text-sm text-blue-800/80 dark:text-blue-200/80">
                  Your progress updates automatically as you add direct referrals (Level 1).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Rewards</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track what’s unlocked and what’s next.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {rules.map((r) => {
            const unlock = unlockByRuleId.get(String(r._id));
            const thr = Number(r.thresholdBalance || 0);
            const reached = level1ReferralCount >= thr;
            const isFulfilled = unlock?.status === 'fulfilled';
            const isUnlocked = unlock?.status === 'unlocked' || reached;
            const locked = !isUnlocked;
            const need = Math.max(0, thr - level1ReferralCount);

            return (
              <div
                key={r._id}
                className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                  isFulfilled
                    ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                    : isUnlocked
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  {r.imageUrl ? (
                    <div className="h-14 w-14 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.imageUrl} alt={r.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700">
                      <Trophy className="w-6 h-6 text-gray-500 dark:text-gray-300" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{r.name}</p>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        {formatCount(thr)} directs
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {r.rewardDescription}
                    </p>
                    {r.rewardValue && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        <span className="font-medium">Value:</span> {r.rewardValue}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3">
                  {isFulfilled ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-600 text-white text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Fulfilled
                    </span>
                  ) : locked ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium">
                      <Lock className="w-4 h-4" />
                      Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-sm font-medium">
                      <Trophy className="w-4 h-4" />
                      Unlocked
                    </span>
                  )}

                  {locked && (
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>Need</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCount(need)}</span>
                      <span>more direct(s)</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

