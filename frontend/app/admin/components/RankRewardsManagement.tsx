'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, Save, Trash2, CheckCircle, Loader2, Search } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

interface Rule {
  _id: string;
  name: string;
  thresholdBalance: number;
  rewardDescription: string;
  rewardValue?: string;
  isActive: boolean;
  sortOrder?: number;
}

interface UnlockRow {
  _id: string;
  status: 'unlocked' | 'fulfilled' | 'cancelled';
  unlockedAt: string;
  balanceAtUnlock: number;
  thresholdBalance?: number;
  user?: { _id: string; firstName?: string; lastName?: string; email?: string } | null;
  rule?: { _id: string; name?: string; thresholdBalance?: number; rewardDescription?: string; rewardValue?: string } | null;
  fulfilledAt?: string;
  fulfillmentNotes?: string;
}

export default function RankRewardsManagement() {
  const [view, setView] = useState<'rules' | 'unlocks'>('rules');
  const [loading, setLoading] = useState(false);

  const [rules, setRules] = useState<Rule[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [savingRule, setSavingRule] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  const [ruleForm, setRuleForm] = useState({
    name: '',
    thresholdBalance: 0,
    rewardDescription: '',
    rewardValue: '',
    isActive: true,
    sortOrder: 0
  });

  const [unlocks, setUnlocks] = useState<UnlockRow[]>([]);
  const [unlockStatus, setUnlockStatus] = useState<string>('unlocked');
  const [unlockSearch, setUnlockSearch] = useState('');
  const [unlockFulfillingId, setUnlockFulfillingId] = useState<string | null>(null);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/rank-rewards/rules'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => []);
      if (!res.ok || !Array.isArray(data)) throw new Error('Failed');
      setRules(data as Rule[]);
    } catch {
      showToast('Could not load rank reward rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnlocks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (unlockStatus) params.set('status', unlockStatus);
      if (unlockSearch.trim()) params.set('userEmail', unlockSearch.trim());
      const res = await fetch(buildApiUrl(`api/admin/rank-rewards/unlocks?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Failed');
      setUnlocks(Array.isArray(data?.rows) ? (data.rows as UnlockRow[]) : []);
    } catch {
      showToast('Could not load unlocked rewards', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'rules') fetchRules();
    else fetchUnlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const openCreateRule = () => {
    setEditingRule(null);
    setRuleForm({
      name: '',
      thresholdBalance: 0,
      rewardDescription: '',
      rewardValue: '',
      isActive: true,
      sortOrder: (rules[rules.length - 1]?.sortOrder ?? rules.length) + 1
    });
    setShowRuleModal(true);
  };

  const openEditRule = (r: Rule) => {
    setEditingRule(r);
    setRuleForm({
      name: r.name || '',
      thresholdBalance: Number(r.thresholdBalance ?? 0),
      rewardDescription: r.rewardDescription || '',
      rewardValue: r.rewardValue || '',
      isActive: !!r.isActive,
      sortOrder: Number(r.sortOrder ?? 0)
    });
    setShowRuleModal(true);
  };

  const saveRule = async () => {
    try {
      setSavingRule(true);
      const token = localStorage.getItem('token');
      const url = editingRule
        ? `api/admin/rank-rewards/rules/${editingRule._id}`
        : 'api/admin/rank-rewards/rules';
      const method = editingRule ? 'PUT' : 'POST';
      const res = await fetch(buildApiUrl(url), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: ruleForm.name.trim(),
          thresholdBalance: Number(ruleForm.thresholdBalance),
          rewardDescription: ruleForm.rewardDescription.trim(),
          rewardValue: ruleForm.rewardValue.trim(),
          isActive: !!ruleForm.isActive,
          sortOrder: Number(ruleForm.sortOrder)
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || 'Failed to save rule', 'error');
        return;
      }
      showToast(editingRule ? 'Rule updated' : 'Rule created', 'success');
      setShowRuleModal(false);
      setEditingRule(null);
      await fetchRules();
    } catch {
      showToast('Failed to save rule', 'error');
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      setDeletingRuleId(id);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/rank-rewards/rules/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || 'Failed to delete rule', 'error');
        return;
      }
      showToast('Rule deleted', 'success');
      await fetchRules();
    } catch {
      showToast('Failed to delete rule', 'error');
    } finally {
      setDeletingRuleId(null);
    }
  };

  const fulfillUnlock = async (id: string) => {
    try {
      setUnlockFulfillingId(id);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/rank-rewards/unlocks/${id}/fulfill`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: '' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || 'Failed to mark fulfilled', 'error');
        return;
      }
      showToast('Marked as fulfilled', 'success');
      await fetchUnlocks();
    } catch {
      showToast('Failed to mark fulfilled', 'error');
    } finally {
      setUnlockFulfillingId(null);
    }
  };

  const filteredUnlocks = useMemo(() => {
    const q = unlockSearch.trim().toLowerCase();
    if (!q) return unlocks;
    return unlocks.filter((u) => (u.user?.email || '').toLowerCase().includes(q));
  }, [unlocks, unlockSearch]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Rank Rewards</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configure balance thresholds that unlock rewards, and track fulfillment.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (view === 'rules' ? fetchRules() : fetchUnlocks())}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            {view === 'rules' && (
              <button
                type="button"
                onClick={openCreateRule}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Rule
              </button>
            )}
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setView('rules')}
            className={`px-5 py-2 rounded-md font-medium transition-all ${
              view === 'rules'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Rules
          </button>
          <button
            type="button"
            onClick={() => setView('unlocks')}
            className={`px-5 py-2 rounded-md font-medium transition-all ${
              view === 'unlocks'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Unlocked rewards
          </button>
        </div>

        {view === 'unlocks' && (
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={unlockSearch}
                onChange={(e) => setUnlockSearch(e.target.value)}
                placeholder="Search by user email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={unlockStatus}
              onChange={(e) => setUnlockStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[160px]"
            >
              <option value="unlocked">Unlocked</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
              <option value="">All</option>
            </select>
            <button
              type="button"
              onClick={fetchUnlocks}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              Apply
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex items-center justify-center text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : view === 'rules' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Threshold</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Active</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Reward</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr
                    key={r._id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{r.name}</td>
                    <td className="py-4 px-4 text-gray-700 dark:text-gray-300">${Number(r.thresholdBalance).toFixed(2)}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          r.isActive
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {r.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                      <div className="max-w-xl">
                        <div className="font-medium text-gray-900 dark:text-gray-200">{r.rewardDescription}</div>
                        {r.rewardValue ? <div className="text-xs text-gray-500 mt-0.5">{r.rewardValue}</div> : null}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditRule(r)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRule(r._id)}
                          disabled={deletingRuleId === r._id}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletingRuleId === r._id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-gray-400">
                      No rank reward rules yet. Click “New Rule” to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Rule</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Lifetime earned</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnlocks.map((u) => (
                  <tr
                    key={u._id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {new Date(u.unlockedAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {u.user
                            ? `${u.user.firstName || ''} ${u.user.lastName || ''}`.trim() || '—'
                            : '—'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{u.user?.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                      <div className="font-medium">{u.rule?.name || '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Threshold ${Number(u.rule?.thresholdBalance ?? u.thresholdBalance ?? 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                      ${Number(u.balanceAtUnlock || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          u.status === 'fulfilled'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : u.status === 'cancelled'
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {u.status === 'unlocked' ? (
                        <button
                          type="button"
                          onClick={() => fulfillUnlock(u._id)}
                          disabled={unlockFulfillingId === u._id}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {unlockFulfillingId === u._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Fulfilled
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUnlocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400">
                      No unlocked rewards found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingRule ? 'Edit Rank Reward Rule' : 'Create Rank Reward Rule'}
              </h3>
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                <input
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lifetime earned threshold</label>
                <input
                  type="number"
                  value={ruleForm.thresholdBalance}
                  onChange={(e) => setRuleForm((p) => ({ ...p, thresholdBalance: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort order</label>
                <input
                  type="number"
                  value={ruleForm.sortOrder}
                  onChange={(e) => setRuleForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reward description (what admin will send)
                </label>
                <textarea
                  value={ruleForm.rewardDescription}
                  onChange={(e) => setRuleForm((p) => ({ ...p, rewardDescription: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reward value (optional)</label>
                <input
                  value={ruleForm.rewardValue}
                  onChange={(e) => setRuleForm((p) => ({ ...p, rewardValue: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none">
                  <input
                    type="checkbox"
                    checked={ruleForm.isActive}
                    onChange={(e) => setRuleForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRule}
                disabled={savingRule || !ruleForm.name.trim() || !ruleForm.rewardDescription.trim()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center gap-2"
              >
                {savingRule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingRule ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

