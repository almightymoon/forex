'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Plus, Search, Filter, Edit, Trash2, Eye, 
  CheckCircle, X, AlertTriangle, Loader2, Lock, Unlock
} from 'lucide-react';
import { User, UserForm } from './types';
import UserDetailsModal from './UserDetailsModal';

function isUserLocked(user: User): boolean {
  if (user.security?.isLocked) return true;
  const until = user.security?.lockedUntil;
  if (until && new Date(until) > new Date()) return true;
  return false;
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
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive) ||
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">User Management</h3>
          <div className="flex items-center gap-3">
            {selectedUsers.size > 0 && (
              <>
                <button
                  onClick={() => setSelectedUsers(new Set())}
                  disabled={isDeletingBulk}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 flex items-center"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  Clear Selection
                </button>
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  disabled={isDeletingBulk}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isDeletingBulk ? (
                    <>
                      <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 inline mr-2" />
                      Delete Selected ({selectedUsers.size})
                    </>
                  )}
                </button>
              </>
            )}
            <button 
              onClick={openAddUserModal}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add User
            </button>
          </div>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                                  <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
            </div>
          </div>
          
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700">
              <input
                type="checkbox"
                checked={filterNoPackageNoReferral}
                onChange={(e) => setFilterNoPackageNoReferral(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              No package + no referral
            </label>
                              <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="instructor">Instructor</option>
                    <option value="student">Student</option>
                  </select>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="locked">Locked (login)</option>
                  </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white w-12">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">User</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Joined</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr 
                  key={user._id} 
                  className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-opacity ${
                    deletingUserId === user._id || selectedUsers.has(user._id) && isDeletingBulk ? 'opacity-50' : ''
                  } ${selectedUsers.has(user._id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <td className="py-4 px-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user._id)}
                      onChange={() => handleSelectUser(user._id)}
                      disabled={deletingUserId === user._id || isDeletingBulk}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        {user.profileImage ? (
                          <img src={user.profileImage} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-white font-semibold">{(user.firstName || user.email || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.firstName || ''} {user.lastName || ''}
                          {!user.firstName && !user.lastName && user.email && <span>{user.email.split('@')[0]}</span>}
                          {!user.firstName && !user.lastName && !user.email && <span>Unknown User</span>}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {(user.role || 'student').charAt(0).toUpperCase() + (user.role || 'student').slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {isUserLocked(user) && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1" title="Locked due to failed login attempts">
                          <Lock className="w-3 h-3" />
                          Locked
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {deletingUserId === user._id ? (
                        <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Deleting...</span>
                        </div>
                      ) : unblockingUserId === user._id ? (
                        <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Unblocking...</span>
                        </div>
                      ) : (
                        <>
                          {isUserLocked(user) && onUserUnblock && (
                            <button
                              onClick={async () => {
                                setUnblockingUserId(user._id);
                                try {
                                  await onUserUnblock(user);
                                } finally {
                                  setUnblockingUserId(null);
                                }
                              }}
                              className="p-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                              title="Unblock account (failed login lock)"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDetailsModal(true);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              openEditUserModal(user);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => onUserToggleStatus(user)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive 
                                ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                : 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                            title={user.isActive ? 'Deactivate User' : 'Activate User'}
                          >
                            {user.isActive ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

            {/* User Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                >
                  {selectedUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
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
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && selectedUsers.size > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Users</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to delete <strong>{selectedUsers.size}</strong> selected user{selectedUsers.size > 1 ? 's' : ''}? 
                This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isDeletingBulk ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete All'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
