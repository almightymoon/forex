'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Users,
  Package,
  Filter,
  Download,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';

interface Commission {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    referralCode: string;
  };
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  notes: string;
  metadata: {
    level: string;
    packageName: string;
    packageAmount: string;
    referralPool: string;
    companyShare: string;
    buyerName: string;
    buyerEmail: string;
    commissionRate: string;
  };
  relatedPayment: {
    _id: string;
    package: {
      name: string;
      price: number;
    };
    finalAmount: number;
    status: string;
    createdAt: string;
  };
  createdAt: string;
}

interface CommissionStats {
  total: {
    totalAmount: number;
    totalCount: number;
    avgAmount: number;
  };
  byLevel: Array<{
    level: string;
    totalAmount: number;
    count: number;
  }>;
  byPackage: Array<{
    packageName: string;
    totalAmount: number;
    count: number;
  }>;
}

interface PlatformCommission {
  _id: string;
  paymentId: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  package: {
    name: string;
    price: number;
  };
  packageAmount: number;
  referralPool: number;
  platformCommission: number;
  referralPoolPercentage: number;
  platformCommissionPercentage: number;
  createdAt: string;
  confirmedAt?: string;
}

interface PlatformCommissionStats {
  total: {
    totalPlatformCommission: number;
    totalReferralPool: number;
    totalPackageAmount: number;
    totalCount: number;
  };
  byPackage: Array<{
    packageName: string;
    totalAmount: number;
    platformCommission: number;
    referralPool: number;
    count: number;
  }>;
}

export default function CommissionManagement() {
  const [activeView, setActiveView] = useState<'referral' | 'platform'>('referral');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [platformCommissions, setPlatformCommissions] = useState<PlatformCommission[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformCommissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    level: '',
    packageName: '',
    startDate: '',
    endDate: '',
    referrerSearch: '',
    buyerSearch: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [expandedBuyers, setExpandedBuyers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeView === 'referral') {
      fetchCommissions();
    } else {
      fetchPlatformCommissions();
    }
  }, [pagination.page, filters, activeView]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.level && { level: filters.level }),
        ...(filters.packageName && { packageName: filters.packageName }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.referrerSearch && { referrerId: filters.referrerSearch }),
        ...(filters.buyerSearch && { buyerId: filters.buyerSearch })
      });

      const res = await fetch(buildApiUrl(`api/admin/commissions?${params}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch commissions');
      }

      const data = await res.json();
      setCommissions(data.commissions || []);
      setStats(data.stats || null);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformCommissions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.packageName && { packageName: filters.packageName }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      // Build the API URL - ensure we have the correct base URL
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      // Remove trailing /api if present since we're adding it
      const cleanBaseUrl = baseUrl.replace(/\/api$/, '');
      const apiUrl = `${cleanBaseUrl}/api/admin/platform-commissions?${params}`;
      console.log('[Platform Commissions] Fetching from:', apiUrl);
      
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch platform commissions');
      }

      const data = await res.json();
      console.log('[Platform Commissions] Response:', data);
      console.log('[Platform Commissions] Commissions count:', data.commissions?.length || 0);
      setPlatformCommissions(data.commissions || []);
      setPlatformStats(data.stats || null);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('[Platform Commissions] Error fetching platform commissions:', error);
      console.error('[Platform Commissions] Error details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      level: '',
      packageName: '',
      startDate: '',
      endDate: '',
      referrerSearch: '',
      buyerSearch: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const exportCommissions = () => {
    const csv = [
      ['Date', 'Referrer', 'Level', 'Package', 'Package Amount', 'Referral Pool', 'Commission Rate', 'Commission Amount', 'Buyer', 'Buyer Email'].join(','),
      ...commissions.map(c => [
        new Date(c.createdAt).toLocaleDateString(),
        `${c.user.firstName} ${c.user.lastName}`,
        `Level ${c.metadata.level}`,
        c.metadata.packageName,
        `$${c.metadata.packageAmount}`,
        `$${c.metadata.referralPool}`,
        `${c.metadata.commissionRate}%`,
        `$${c.amount.toFixed(2)}`,
        c.metadata.buyerName,
        c.metadata.buyerEmail
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      '1': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      '2': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      '3': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      '4': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      '5': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    };
    return colors[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  // Group commissions by buyer
  const groupedCommissions = commissions.reduce((acc, commission) => {
    const buyerKey = commission.metadata.buyerEmail || 'unknown';
    if (!acc[buyerKey]) {
      acc[buyerKey] = {
        buyerName: commission.metadata.buyerName,
        buyerEmail: commission.metadata.buyerEmail,
        commissions: [],
        totalAmount: 0,
        count: 0
      };
    }
    acc[buyerKey].commissions.push(commission);
    acc[buyerKey].totalAmount += commission.amount;
    acc[buyerKey].count += 1;
    return acc;
  }, {} as Record<string, {
    buyerName: string;
    buyerEmail: string;
    commissions: Commission[];
    totalAmount: number;
    count: number;
  }>);

  const toggleBuyer = (buyerEmail: string) => {
    setExpandedBuyers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(buyerEmail)) {
        newSet.delete(buyerEmail);
      } else {
        newSet.add(buyerEmail);
      }
      return newSet;
    });
  };

  if (loading && (activeView === 'referral' ? commissions.length === 0 : platformCommissions.length === 0)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Commission Distributions</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage all referral commission distributions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (activeView === 'referral') {
                fetchCommissions();
              } else {
                fetchPlatformCommissions();
              }
            }}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportCommissions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="mb-6 flex gap-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => {
            setActiveView('referral');
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className={`px-6 py-2 rounded-md font-medium transition-all ${
            activeView === 'referral'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Referral Commissions
        </button>
        <button
          onClick={() => {
            setActiveView('platform');
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className={`px-6 py-2 rounded-md font-medium transition-all ${
            activeView === 'platform'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Platform Commissions
        </button>
      </div>

      {/* Statistics Cards - Referral Commissions */}
      {activeView === 'referral' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Commissions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${stats.total.totalAmount.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stats.total.totalCount} transactions
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Commission</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${stats.total.avgAmount.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">By Package</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.byPackage.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  packages
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">By Level</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.byLevel.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  levels active
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards - Platform Commissions */}
      {activeView === 'platform' && platformStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Platform Commission</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${platformStats.total.totalPlatformCommission.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {platformStats.total.totalCount} payments
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Referral Pool</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${platformStats.total.totalReferralPool.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Distributed to referrers
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${platformStats.total.totalPackageAmount.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  All package sales
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Platform Share %</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {platformStats.total.totalPackageAmount > 0 
                    ? ((platformStats.total.totalPlatformCommission / platformStats.total.totalPackageAmount) * 100).toFixed(1)
                    : '0'
                  }%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Average platform share
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">Filters</span>
          </div>
          {showFilters ? (
            <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeView === 'referral' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Level
                </label>
                <select
                  value={filters.level}
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Levels</option>
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4</option>
                  <option value="5">Level 5</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Package
              </label>
              <select
                value={filters.packageName}
                onChange={(e) => handleFilterChange('packageName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Packages</option>
                <option value="FX Launch">FX Launch</option>
                <option value="FX Scale">FX Scale</option>
                <option value="FX Legacy">FX Legacy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {activeView === 'referral' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search Referrer
                  </label>
                  <input
                    type="text"
                    value={filters.referrerSearch}
                    onChange={(e) => handleFilterChange('referrerSearch', e.target.value)}
                    placeholder="Email or name..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search Buyer
                  </label>
                  <input
                    type="text"
                    value={filters.buyerSearch}
                    onChange={(e) => handleFilterChange('buyerSearch', e.target.value)}
                    placeholder="Email or name..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Referral Commissions Table */}
      {activeView === 'referral' && (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Referrer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Package</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Package Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Referral Pool</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Commission</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Buyer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No commissions found
                  </td>
                </tr>
              ) : (
                Object.entries(groupedCommissions).map(([buyerEmail, group]) => {
                  const isExpanded = expandedBuyers.has(buyerEmail);
                  return (
                    <React.Fragment key={buyerEmail}>
                      {/* Buyer Header Row */}
                      <tr 
                        className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-l-4 border-blue-500"
                        onClick={() => toggleBuyer(buyerEmail)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            )}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(group.commissions[0]?.createdAt || '')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3" colSpan={2}>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {group.buyerName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {group.buyerEmail}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="text-xs font-medium">
                            {group.count} {group.count === 1 ? 'item' : 'items'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400" colSpan={3}>
                          <span className="text-xs text-gray-500 dark:text-gray-500 italic">
                            {isExpanded ? 'Click to collapse' : 'Click to expand'} details
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              ${group.totalAmount.toFixed(2)}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                          </div>
                        </td>
                        <td className="px-4 py-3" colSpan={2}></td>
                      </tr>
                      {/* Commission Detail Rows */}
                      {isExpanded && group.commissions.map((commission) => (
                        <tr key={commission._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                          <td className="px-4 py-3 pl-8 text-sm text-gray-900 dark:text-white">
                            {formatDate(commission.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {commission.user.firstName} {commission.user.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {commission.user.email}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(commission.metadata.level)}`}>
                              Level {commission.metadata.level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {commission.metadata.packageName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            ${parseFloat(commission.metadata.packageAmount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            ${parseFloat(commission.metadata.referralPool).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {commission.metadata.commissionRate}%
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              ${commission.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white">
                                {commission.metadata.buyerName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {commission.metadata.buyerEmail}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCommission(commission);
                              }}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} commissions
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Platform Commissions Table */}
      {activeView === 'platform' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Package Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Referral Pool
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Platform Commission
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Platform Share %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {platformCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No platform commissions found
                    </td>
                  </tr>
                ) : (
                  platformCommissions.map((commission) => (
                    <tr key={commission._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {formatDate(commission.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {commission.user?.firstName} {commission.user?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {commission.user?.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {commission.package?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        ${commission.packageAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        ${commission.referralPool.toFixed(2)}
                        <span className="text-xs text-gray-500 ml-1">
                          ({commission.referralPoolPercentage.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          ${commission.platformCommission.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {commission.platformCommissionPercentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} payments
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Platform Commission Breakdown by Package */}
      {activeView === 'platform' && platformStats && platformStats.byPackage.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Platform Commission by Package
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platformStats.byPackage.map((pkg) => (
              <div key={pkg.packageName} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{pkg.packageName}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Revenue:</span>
                    <span className="font-medium text-gray-900 dark:text-white">${pkg.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Platform Commission:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">${pkg.platformCommission.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Referral Pool:</span>
                    <span className="text-gray-900 dark:text-white">${pkg.referralPool.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-gray-600 dark:text-gray-400">Platform Share:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {pkg.totalAmount > 0 ? ((pkg.platformCommission / pkg.totalAmount) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {pkg.count} payment(s)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission Detail Modal */}
      {selectedCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Commission Details
                </h3>
                <button
                  onClick={() => setSelectedCommission(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedCommission.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Commission Amount</p>
                    <p className="font-semibold text-green-600 dark:text-green-400 text-lg">
                      ${selectedCommission.amount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Referrer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.user.firstName} {selectedCommission.user.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.user.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Referral Code</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.user.referralCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Balance After</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${selectedCommission.balanceAfter.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Package & Commission Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Package</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.metadata.packageName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Level</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(selectedCommission.metadata.level)}`}>
                        Level {selectedCommission.metadata.level}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Package Amount</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${parseFloat(selectedCommission.metadata.packageAmount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Referral Pool</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${parseFloat(selectedCommission.metadata.referralPool).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Company Share</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${parseFloat(selectedCommission.metadata.companyShare).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Commission Rate</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.metadata.commissionRate}% of pool
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Buyer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.metadata.buyerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.metadata.buyerEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedCommission.notes && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Notes</p>
                    <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {selectedCommission.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
