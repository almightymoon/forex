'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Plus, Edit, Trash2, Eye,
  CheckCircle, X, AlertTriangle, Loader2, Lock, Unlock, Receipt,
  UserCheck, UserX, Clock, MoreHorizontal
} from 'lucide-react';
import { User, UserForm } from './types';
import UserDetailsModal from './UserDetailsModal';
import BulkImposeMonthlyFeeModal from './BulkImposeMonthlyFeeModal';
import AdminRowActionsMenu from './AdminRowActionsMenu';
import { useToast } from '../../../components/Toast';
import {
  AdminBadge,
  AdminButton,
  AdminCheckboxPill,
  AdminEmptyState,
  AdminModalOverlay,
  AdminModalSurface,
  AdminPage,
  AdminPanel,
  AdminPanelFooter,
  AdminPanelHeader,
  AdminSearchField,
  AdminSelect,
  AdminStatCard,
  AdminStatGrid,
  AdminToolbar,
  AdminToolbarGroup,
} from './AdminUI';

function isUserLocked(user: User): boolean {
  if (user.security?.isLocked) return true;
  const until = user.security?.lockedUntil;
  if (until && new Date(until) > new Date()) return true;
  return false;
}

function getEffectiveStatus(user: User): 'active' | 'pending' | 'inactive' {
  const status = user.accessStatus || (user.isActive ? 'active' : 'inactive');
  if (status === 'active' || status === 'pending') return status;
  return 'inactive';
}

function roleBadgeTone(role?: string): 'rose' | 'indigo' | 'violet' | 'emerald' {
  switch (role) {
    case 'admin':
      return 'rose';
    case 'teacher':
    case 'instructor':
      return 'indigo';
    case 'developer':
      return 'violet';
    default:
      return 'emerald';
  }
}

function statusBadgeTone(status: 'active' | 'pending' | 'inactive'): 'emerald' | 'amber' | 'neutral' {
  if (status === 'active') return 'emerald';
  if (status === 'pending') return 'amber';
  return 'neutral';
}

function avatarGradient(seed: string): string {
  const palettes = [
    'from-indigo-500 to-violet-600',
    'from-sky-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-fuchsia-500 to-purple-600',
    'from-amber-500 to-orange-600',
  ];
  const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % palettes.length;
  return palettes[index];
}

interface UserManagementProps {
  users: User[];
  onUserCreate: (userData: UserForm) => void;
  onUserUpdate: (userId: string, userData: Partial<UserForm>) => void;
  onUserDelete: (userId: string, options?: { rollbackCommissions?: boolean }) => Promise<void>;
  onUserToggleStatus: (user: User) => void;
  onUserUnblock?: (user: User) => Promise<void>;
}

export default function UserManagement({ 
  users, 
  onUserCreate, 
  onUserUpdate, 
  onUserDelete, 
  onUserToggleStatus,
  onUserUnblock 
}: UserManagementProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterNoPackageNoReferral, setFilterNoPackageNoReferral] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [showBulkImposeFeeModal, setShowBulkImposeFeeModal] = useState(false);
  const { showToast } = useToast();
  
  const [userForm, setUserForm] = useState<UserForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    country: '',
    role: 'student',
    isActive: true,
    isVerified: false
  });

  const resetUserForm = () => {
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      country: '',
      role: 'student',
      isActive: true,
      isVerified: false
    });
  };

  const openAddUserModal = () => {
    resetUserForm();
    setSelectedUser(null);
    setShowCreateModal(true);
  };

  const openEditUserModal = (user: User) => {
    setUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '', // Don't populate password for security
      phone: user.phone || '',
      country: user.country || '',
      role: user.role,
      isActive: user.isActive || false,
      isVerified: user.isVerified || false
    });
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      onUserUpdate(selectedUser._id, userForm);
    } else {
      onUserCreate(userForm);
    }
    setShowEditModal(false);
    resetUserForm();
    setSelectedUser(null);
  };

  const openDeleteConfirm = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async (rollbackCommissions: boolean) => {
    if (selectedUser) {
      setDeletingUserId(selectedUser._id);
      setShowDeleteModal(false);
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedUser._id);
        return newSet;
      });
      try {
        await onUserDelete(selectedUser._id, { rollbackCommissions });
      } catch (error) {
        // Error handling is done in parent component
      } finally {
        setDeletingUserId(null);
        setSelectedUser(null);
      }
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;
    
    setIsDeletingBulk(true);
    setShowBulkDeleteModal(false);
    
    try {
      // Delete users one by one
      const userIds = Array.from(selectedUsers);
      const deletedIds = new Set<string>();
      
      for (const userId of userIds) {
        try {
          await onUserDelete(userId);
          deletedIds.add(userId);
        } catch (error) {
          console.error(`Failed to delete user ${userId}:`, error);
        }
      }
      
      // Clear selection after deletion
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        deletedIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Filter users based on search term, role, and status
  const filteredUsers = (users || []).filter(user => {
    // Safely handle undefined/null values
    const firstName = (user.firstName || '').toLowerCase();
    const lastName = (user.lastName || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = 
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      email.includes(searchLower);
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const effectiveStatus =
      user.accessStatus ||
      // fallback for older backend responses
      (user.isActive ? 'active' : 'inactive');

    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && effectiveStatus === 'active') ||
      (filterStatus === 'pending' && effectiveStatus === 'pending') ||
      (filterStatus === 'inactive' && effectiveStatus === 'inactive') ||
      (filterStatus === 'locked' && isUserLocked(user));

    if (!filterNoPackageNoReferral) {
      return matchesSearch && matchesRole && matchesStatus;
    }

    const hasPackage = !!(user as any).hasPackage;
    const hasReferral =
      typeof (user as any).hasReferral === 'boolean'
        ? !!(user as any).hasReferral
        : !!((user as any).parentReferralCode && String((user as any).parentReferralCode).trim().length > 0);

    return matchesSearch && matchesRole && matchesStatus && !hasPackage && !hasReferral;
  });

  const stats = useMemo(() => {
    const list = users || [];
    let active = 0;
    let pending = 0;
    let inactive = 0;
    for (const user of list) {
      const status = getEffectiveStatus(user);
      if (status === 'active') active += 1;
      else if (status === 'pending') pending += 1;
      else inactive += 1;
    }
    return { total: list.length, active, pending, inactive };
  }, [users]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    filterRole !== 'all' ||
    filterStatus !== 'all' ||
    filterNoPackageNoReferral;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRole('all');
    setFilterStatus('all');
    setFilterNoPackageNoReferral(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AdminPage>
        <AdminStatGrid>
          <AdminStatCard label="Total users" value={stats.total} icon={Users} tone="indigo" />
          <AdminStatCard label="Active" value={stats.active} icon={UserCheck} tone="emerald" />
          <AdminStatCard label="Pending" value={stats.pending} icon={Clock} tone="amber" />
          <AdminStatCard label="Inactive" value={stats.inactive} icon={UserX} tone="slate" />
        </AdminStatGrid>

        <AdminPanel>
          <AdminPanelHeader
            title="All users"
            description="Search, filter, and manage platform accounts"
            actions={
              <>
                {selectedUsers.size > 0 ? (
                  <>
                    <AdminButton variant="secondary" icon={X} onClick={() => setSelectedUsers(new Set())} disabled={isDeletingBulk}>
                      Clear ({selectedUsers.size})
                    </AdminButton>
                    <AdminButton variant="warning" icon={Receipt} onClick={() => setShowBulkImposeFeeModal(true)} disabled={isDeletingBulk}>
                      Impose fee
                    </AdminButton>
                    <AdminButton variant="danger" icon={isDeletingBulk ? Loader2 : Trash2} onClick={() => setShowBulkDeleteModal(true)} disabled={isDeletingBulk}>
                      Delete selected
                    </AdminButton>
                  </>
                ) : null}
                <AdminButton variant="primary" icon={Plus} onClick={openAddUserModal}>
                  Add user
                </AdminButton>
              </>
            }
          />

          <AdminToolbar>
            <AdminSearchField value={searchTerm} onChange={setSearchTerm} placeholder="Search by name or email..." />
            <AdminToolbarGroup>
              <AdminCheckboxPill
                checked={filterNoPackageNoReferral}
                onChange={setFilterNoPackageNoReferral}
                label="No package + referral"
              />
              <AdminSelect value={filterRole} onChange={setFilterRole} aria-label="Filter by role">
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="instructor">Instructor</option>
                <option value="student">Student</option>
              </AdminSelect>
              <AdminSelect value={filterStatus} onChange={setFilterStatus} aria-label="Filter by status">
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="pending">Pending (package)</option>
                <option value="inactive">Inactive</option>
                <option value="locked">Locked (login)</option>
              </AdminSelect>
              {hasActiveFilters ? (
                <AdminButton variant="ghost" onClick={clearFilters}>
                  Reset filters
                </AdminButton>
              ) : null}
            </AdminToolbarGroup>
          </AdminToolbar>

        <div className="overflow-x-auto">
          <table className="admin-users-table w-full min-w-[880px]">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/40 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/20 dark:text-slate-400">
                <th className="w-12 px-5 py-3.5 sm:px-6">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                  />
                </th>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Joined</th>
                <th className="px-5 py-3.5 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <AdminEmptyState
                      icon={Users}
                      title="No users found"
                      description={hasActiveFilters ? 'Try adjusting your search or filters.' : 'Add your first user to get started.'}
                      action={
                        hasActiveFilters ? (
                          <AdminButton variant="ghost" onClick={clearFilters}>
                            Clear filters
                          </AdminButton>
                        ) : (
                          <AdminButton variant="primary" icon={Plus} onClick={openAddUserModal}>
                            Add user
                          </AdminButton>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const status = getEffectiveStatus(user);
                  const displayName =
                    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                    (user.email ? user.email.split('@')[0] : 'Unknown user');
                  const avatarSeed = user.email || user._id;

                  return (
                    <tr
                      key={user._id}
                      className={`group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                        deletingUserId === user._id || (selectedUsers.has(user._id) && isDeletingBulk) ? 'opacity-50' : ''
                      } ${selectedUsers.has(user._id) ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user._id)}
                          onChange={() => handleSelectUser(user._id)}
                          disabled={deletingUserId === user._id || isDeletingBulk}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetailsModal(true);
                          }}
                          className="flex min-w-0 items-center gap-3 text-left"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br shadow-sm ${avatarGradient(avatarSeed)}`}
                          >
                            {user.profileImage ? (
                              <img src={user.profileImage} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-semibold text-white">
                                {(user.firstName || user.email || 'U').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                              {displayName}
                            </p>
                            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email || 'No email'}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone={roleBadgeTone(user.role)}>
                          {(user.role || 'student').replace('_', ' ')}
                        </AdminBadge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <AdminBadge tone={statusBadgeTone(status)}>{status}</AdminBadge>
                          {isUserLocked(user) ? (
                            <AdminBadge tone="amber">
                              <Lock className="mr-1 inline h-3 w-3" />
                              Locked
                            </AdminBadge>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm tabular-nums text-slate-500 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center justify-end">
                          {deletingUserId === user._id ? (
                            <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Deleting...
                            </div>
                          ) : unblockingUserId === user._id ? (
                            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Unblocking...
                            </div>
                          ) : (
                            <AdminRowActionsMenu
                              variant="icon"
                              align="right"
                              label={`Actions for ${user.firstName} ${user.lastName}`}
                              items={[
                                ...(isUserLocked(user) && onUserUnblock
                                  ? [
                                      {
                                        id: 'unblock',
                                        label: 'Unblock account',
                                        icon: Unlock,
                                        tone: 'warning' as const,
                                        loading: unblockingUserId === user._id,
                                        onClick: async () => {
                                          setUnblockingUserId(user._id);
                                          try {
                                            await onUserUnblock(user);
                                          } finally {
                                            setUnblockingUserId(null);
                                          }
                                        },
                                      },
                                    ]
                                  : []),
                                {
                                  id: 'view',
                                  label: 'View details',
                                  icon: Eye,
                                  tone: 'info' as const,
                                  onClick: () => {
                                    setSelectedUser(user);
                                    setShowDetailsModal(true);
                                  },
                                },
                                {
                                  id: 'edit',
                                  label: 'Edit user',
                                  icon: Edit,
                                  onClick: () => openEditUserModal(user),
                                },
                                {
                                  id: 'toggle',
                                  label: user.isActive ? 'Deactivate user' : 'Activate user',
                                  icon: user.isActive ? X : CheckCircle,
                                  tone: user.isActive ? ('warning' as const) : ('success' as const),
                                  onClick: () => onUserToggleStatus(user),
                                },
                                {
                                  id: 'delete',
                                  label: 'Delete user',
                                  icon: Trash2,
                                  tone: 'danger' as const,
                                  onClick: () => {
                                    setSelectedUser(user);
                                    setShowDeleteModal(true);
                                  },
                                },
                              ]}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPanelFooter
          left={
            <>
              Showing <strong>{filteredUsers.length}</strong> of <strong>{stats.total}</strong> users
            </>
          }
          right={
            selectedUsers.size > 0 ? (
              <span className="font-semibold text-[var(--admin-accent)]">{selectedUsers.size} selected</span>
            ) : (
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <MoreHorizontal className="h-4 w-4" />
                Click a user to view details
              </span>
            )
          }
        />
        </AdminPanel>
      </AdminPage>

      {(showCreateModal || showEditModal) && (
        <AdminModalOverlay
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
          }}
        >
          <AdminModalSurface size="md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                    <input
                      type="text"
                      value={userForm.firstName}
                      onChange={(e) => setUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={userForm.lastName}
                      onChange={(e) => setUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password {selectedUser && '(leave empty to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required={!selectedUser}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={userForm.phone}
                      onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                    <input
                      type="text"
                      value={userForm.country}
                      onChange={(e) => setUserForm(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'teacher' | 'student' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                                          <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={userForm.isActive}
                      onChange={(e) => setUserForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isVerified"
                      checked={userForm.isVerified}
                      onChange={(e) => setUserForm(prev => ({ ...prev, isVerified: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isVerified" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Verified</label>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <AdminButton
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                >
                  Cancel
                </AdminButton>
                <AdminButton type="submit" variant="primary" className="flex-1">
                  {selectedUser ? 'Update user' : 'Create user'}
                </AdminButton>
              </div>
            </form>
          </AdminModalSurface>
        </AdminModalOverlay>
      )}

      {showDeleteModal && selectedUser && (
        <AdminModalOverlay onClose={() => setShowDeleteModal(false)}>
          <AdminModalSurface size="md">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete User</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Delete <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>? This cannot be undone.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                If this user was added with wrong payment details, choose &quot;Rollback commissions and delete&quot; to reverse any referral commissions that were paid out from their payment, then delete the user.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleDeleteUser(true)}
                  disabled={deletingUserId === selectedUser._id}
                  className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deletingUserId === selectedUser._id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Rollback commissions and delete'
                  )}
                </button>
                <button
                  onClick={() => handleDeleteUser(false)}
                  disabled={deletingUserId === selectedUser._id}
                  className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  Delete user only
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </AdminModalSurface>
        </AdminModalOverlay>
      )}

      {showDetailsModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {showBulkImposeFeeModal && selectedUsers.size > 0 && (
        <BulkImposeMonthlyFeeModal
          users={(users || []).filter((u) => selectedUsers.has(u._id))}
          onClose={() => setShowBulkImposeFeeModal(false)}
          onComplete={({ succeeded, failed }) => {
            if (succeeded > 0 && failed === 0) {
              showToast(`Monthly fee imposed on ${succeeded} student${succeeded === 1 ? '' : 's'}.`, 'success');
            } else if (succeeded > 0) {
              showToast(`Imposed on ${succeeded}; ${failed} failed (see details in modal).`, 'warning');
            } else {
              showToast('No fees were imposed. Check errors in the modal.', 'error');
            }
          }}
        />
      )}

      {showBulkDeleteModal && selectedUsers.size > 0 && (
        <AdminModalOverlay onClose={() => setShowBulkDeleteModal(false)}>
          <AdminModalSurface size="sm">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
                <AlertTriangle className="h-8 w-8 text-rose-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Delete users</h3>
              <p className="mb-6 text-sm text-[var(--admin-muted)]">
                Delete <strong>{selectedUsers.size}</strong> selected user{selectedUsers.size > 1 ? 's' : ''}? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <AdminButton variant="secondary" className="flex-1" onClick={() => setShowBulkDeleteModal(false)}>
                  Cancel
                </AdminButton>
                <AdminButton
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk}
                  variant="danger"
                  className="flex-1"
                  loading={isDeletingBulk}
                >
                  Delete all
                </AdminButton>
              </div>
            </div>
          </AdminModalSurface>
        </AdminModalOverlay>
      )}
    </motion.div>
  );
}
