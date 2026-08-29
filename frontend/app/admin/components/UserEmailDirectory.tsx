'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Contact, Download, Loader2, Mail, RefreshCw } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { useToast } from '../../../components/Toast';
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
} from './AdminUI';

type EmailUser = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  userId: string;
  isActive: boolean;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function roleTone(role: string): 'rose' | 'indigo' | 'emerald' | 'neutral' {
  if (role === 'admin') return 'rose';
  if (role === 'teacher' || role === 'instructor') return 'indigo';
  if (role === 'student') return 'emerald';
  return 'neutral';
}

export default function UserEmailDirectory() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<EmailUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/users/emails'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((json as { error?: string }).error || 'Failed to load emails', 'error');
        setUsers([]);
        return;
      }
      setUsers(Array.isArray(json.users) ? json.users : []);
    } catch (error) {
      console.error('Load user emails error:', error);
      showToast('Failed to load user emails', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (!q) return true;
      const hay = `${u.firstName} ${u.lastName} ${u.email} ${u.userId} ${u.role}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, search, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    const roles = new Set<string>();
    for (const u of users) {
      roles.add(u.role || 'student');
      if (u.isActive) active += 1;
      else inactive += 1;
    }
    return { total: users.length, active, inactive, roles: roles.size };
  }, [users]);

  const roles = useMemo(() => {
    const set = new Set(users.map((u) => u.role || 'student'));
    return Array.from(set).sort();
  }, [users]);

  const exportCsv = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/users/emails/export'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast((json as { error?: string }).error || 'Failed to export CSV', 'error');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-emails-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Email list exported successfully', 'success');
    } catch (error) {
      console.error('Export user emails error:', error);
      showToast('Failed to export CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminPage>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <AdminStatGrid>
          <AdminStatCard label="Total emails" value={stats.total} icon={Mail} tone="indigo" />
          <AdminStatCard label="Active accounts" value={stats.active} icon={Contact} tone="emerald" />
          <AdminStatCard label="Inactive accounts" value={stats.inactive} icon={Contact} tone="amber" />
          <AdminStatCard label="Roles" value={stats.roles} icon={Contact} tone="sky" />
        </AdminStatGrid>

        <AdminPanel>
          <AdminPanelHeader
            title="Email directory"
            description="Browse every registered email address and export the full list as CSV."
            actions={
              <div className="flex flex-wrap gap-2">
                <AdminButton variant="secondary" icon={RefreshCw} loading={loading} onClick={load}>
                  Refresh
                </AdminButton>
                <AdminButton variant="primary" icon={Download} loading={exporting} onClick={exportCsv}>
                  Download CSV
                </AdminButton>
              </div>
            }
          />

          <AdminToolbar>
            <AdminSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search name, email, or user ID..."
            />
            <AdminToolbarGroup>
              <AdminSelect value={roleFilter} onChange={setRoleFilter} aria-label="Filter by role">
                <option value="all">All roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect value={statusFilter} onChange={setStatusFilter} aria-label="Filter by status">
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </AdminSelect>
            </AdminToolbarGroup>
          </AdminToolbar>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[var(--admin-muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading emails...
            </div>
          ) : filtered.length === 0 ? (
            <AdminEmptyState
              icon={Mail}
              title={users.length === 0 ? 'No users found' : 'No matches'}
              description={
                users.length === 0
                  ? 'Registered user emails will appear here.'
                  : 'Try adjusting your search or filters.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-users-table w-full min-w-[720px]">
                <thead>
                  <tr>
                    <th className="text-left">Name</th>
                    <th className="text-left">Email</th>
                    <th className="text-left">Role</th>
                    <th className="text-left">User ID</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user._id}>
                      <td className="font-medium">
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td>
                        <a href={`mailto:${user.email}`} className="text-[var(--admin-accent)] hover:underline">
                          {user.email}
                        </a>
                      </td>
                      <td>
                        <AdminBadge tone={roleTone(user.role)}>
                          {user.role || 'student'}
                        </AdminBadge>
                      </td>
                      <td className="font-mono text-xs">{user.userId || '—'}</td>
                      <td>
                        <AdminBadge tone={user.isActive ? 'emerald' : 'neutral'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </AdminBadge>
                      </td>
                      <td className="text-[var(--admin-muted)]">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length > 0 ? (
            <div className="border-t border-[var(--admin-border)] px-4 py-3 text-sm text-[var(--admin-muted)]">
              Showing {filtered.length} of {users.length} emails
            </div>
          ) : null}
        </AdminPanel>
      </motion.div>
    </AdminPage>
  );
}
