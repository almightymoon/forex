'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  ArrowLeft,
  ShieldCheck,
  ShieldOff,
  GitBranch,
  LayoutList,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buildApiUrl } from '../../utils/api';
import { showToast } from '@/utils/toast';
import UserProfileDropdown from '../components/UserProfileDropdown';
import DarkModeToggle from '../../components/DarkModeToggle';
import { useSettings } from '../../context/SettingsContext';
import { useDashboard } from '../../context/DashboardContext';
import ReferralBadge from '../components/ReferralBadge';
import RankRewardsProgress from '../dashboard/components/RankRewardsProgress';
import ReferralTreeView from './components/ReferralTreeView';
import ReferralListView from './components/ReferralListView';
import './referrals.css';

interface ReferralRank {
  current: { name: string; icon: string; color: string; description: string; minReferrals: number; minDirects?: number };
  next: { name: string; icon: string; color: string; minReferrals: number; minDirects?: number } | null;
  progressToNext: number;
}

interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  verifiedReferrals?: number;
  unverifiedReferrals?: number;
  rank?: ReferralRank;
  level1Count: number;
  directReferrals?: number;
  level2Count: number;
  level3Count: number;
  level4Count: number;
  level5Count: number;
  referralCode: string;
}

interface ReferralTree {
  user: {
    id: string;
    name: string;
    referralCode: string;
  };
  stats: ReferralStats & { verifiedReferrals?: number; unverifiedReferrals?: number; rank?: ReferralRank };
  tree: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      referralCode: string;
      joinedAt: string;
      verified?: boolean;
    };
    verified?: boolean;
    level: number;
    children: any[];
  }>;
}

interface Commission {
  _id: string;
  level: number;
  purchaseAmount: number;
  commissionAmount: number;
  commissionRate: number;
  currency: string;
  status: string;
  createdAt: string;
  purchaser: {
    firstName: string;
    lastName: string;
    email: string;
  };
  payment: {
    type: string;
    createdAt: string;
  };
}

export default function ReferralsPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const { data: dashboardData } = useDashboard();
  const user = dashboardData.user;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tree' | 'earnings'>('overview');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralUrl, setReferralUrl] = useState<string>('');
  const [tree, setTree] = useState<ReferralTree | null>(null);
  const [earnings, setEarnings] = useState<{
    commissions: Commission[];
    totalEarnings: number;
    earningsByLevel: any;
    pendingEarnings: number;
  } | null>(null);
  const [treeView, setTreeView] = useState<'list' | 'tree'>('tree');
  const [referralFilter, setReferralFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  useEffect(() => {
    fetchReferralData();
  }, []);

  const handleBack = () => {
    try {
      router.back();
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.history.length <= 1) {
          router.push('/dashboard');
        }
      }, 0);
    } catch {
      router.push('/dashboard');
    }
  };

  const fetchReferralData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch referral code
      const codeRes = await fetch(buildApiUrl('/api/referrals/code'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (codeRes.ok) {
        const codeData = await codeRes.json();
        if (codeData.success && codeData.referralCode) {
          setReferralCode(codeData.referralCode);
          setReferralUrl(codeData.referralUrl);
        } else {
          console.error('Referral code response:', codeData);
        }
      } else {
        const errorData = await codeRes.json().catch(() => ({}));
        console.error('Failed to fetch referral code:', errorData);
      }

      // Fetch stats
      const statsRes = await fetch(buildApiUrl('/api/referrals/stats'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.data) {
          setStats(statsData.data);
          // Fallback: Use referral code from stats if code endpoint didn't return it
          if (!referralCode && statsData.data.referralCode) {
            setReferralCode(statsData.data.referralCode);
            const frontendUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
            setReferralUrl(`${frontendUrl}/register?ref=${statsData.data.referralCode}`);
          }
        }
      } else {
        const errorData = await statsRes.json().catch(() => ({}));
        console.error('Failed to fetch referral stats:', errorData);
      }

      // Fetch tree
      const treeRes = await fetch(buildApiUrl('/api/referrals/tree'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        console.log('[Referrals] Tree API response:', treeData);
        
        if (treeData.success && treeData.data) {
          const treeStructure = treeData.data;
          console.log('[Referrals] Tree structure:', {
            hasTree: !!treeStructure.tree,
            treeLength: Array.isArray(treeStructure.tree) ? treeStructure.tree.length : 0,
            hasUser: !!treeStructure.user,
            treeType: typeof treeStructure.tree,
            treeIsArray: Array.isArray(treeStructure.tree)
          });
          
          // Ensure tree is an array
          if (treeStructure.tree && Array.isArray(treeStructure.tree)) {
            setTree(treeStructure);
            console.log('[Referrals] Tree successfully set with', treeStructure.tree.length, 'referrals');
          } else {
            console.error('[Referrals] Tree is not an array:', treeStructure.tree);
            const empty = {
              user: { id: '', name: 'You', referralCode: (treeStructure.user as any)?.referralCode ?? '' },
              stats: (treeStructure.stats as any) || { totalReferrals: 0, totalEarnings: 0, pendingEarnings: 0, level1Count: 0, level2Count: 0, level3Count: 0, level4Count: 0, level5Count: 0, referralCode: '' },
              tree: [] as any[]
            };
            setTree(empty as ReferralTree);
          }
        } else {
          console.error('[Referrals] Invalid response structure:', treeData);
          const empty = {
            user: { id: '', name: 'You', referralCode: '' },
            stats: { totalReferrals: 0, totalEarnings: 0, pendingEarnings: 0, level1Count: 0, level2Count: 0, level3Count: 0, level4Count: 0, level5Count: 0, referralCode: '' },
            tree: [] as any[]
          };
          setTree(empty as ReferralTree);
        }
      } else {
        const errorText = await treeRes.text();
        console.error('[Referrals] Failed to fetch tree:', treeRes.status, errorText);
        const empty = {
          user: { id: '', name: 'You', referralCode: '' },
          stats: { totalReferrals: 0, totalEarnings: 0, pendingEarnings: 0, level1Count: 0, level2Count: 0, level3Count: 0, level4Count: 0, level5Count: 0, referralCode: '' },
          tree: [] as any[]
        };
        setTree(empty as ReferralTree);
      }

      // Fetch earnings
      const earningsRes = await fetch(buildApiUrl('/api/referrals/earnings'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (earningsRes.ok) {
        const earningsData = await earningsRes.json();
        setEarnings(earningsData.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      showToast('Failed to load referral data', 'error');
      setLoading(false);
    }
  };

  // Re-fetch if referral code is still empty after initial load
  useEffect(() => {
    if (!loading && !referralCode && stats?.referralCode) {
      setReferralCode(stats.referralCode);
      const frontendUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      setReferralUrl(`${frontendUrl}/register?ref=${stats.referralCode}`);
    }
  }, [loading, referralCode, stats]);

  const copyReferralLink = async () => {
    if (referralUrl) {
      await navigator.clipboard.writeText(referralUrl);
      showToast('Referral link copied!', 'success');
    }
  };

  const flattenTree = (nodes: any[]): any[] => {
    if (!nodes || !Array.isArray(nodes)) return [];
    const out: any[] = [];
    for (const node of nodes) {
      out.push(node);
      if (node.children?.length) out.push(...flattenTree(node.children));
    }
    return out;
  };

  const filteredReferralList = (() => {
    if (!tree?.tree?.length) return [];
    const flat = flattenTree(tree.tree);
    if (referralFilter === 'verified') return flat.filter((n) => n.verified === true);
    if (referralFilter === 'unverified') return flat.filter((n) => !n.verified);
    return flat;
  })();

  const treeStats = {
    direct: tree?.tree?.length ?? stats?.level1Count ?? 0,
    total: stats?.totalReferrals ?? filteredReferralList.length,
    verified: stats?.verifiedReferrals ?? filteredReferralList.filter((n) => n.verified).length,
  };

  if (loading) {
    return (
      <div className="referrals-page ref-loading">
        <div className="text-center">
          <div className="ref-loading__spinner mx-auto mb-4" />
          <p style={{ color: 'var(--ref-muted)' }}>Loading referral program...</p>
        </div>
      </div>
    );
  }

  const tabItems = [
    { id: 'overview' as const, label: 'Overview', icon: Sparkles },
    { id: 'tree' as const, label: 'Network Tree', icon: GitBranch },
    { id: 'earnings' as const, label: 'Earnings', icon: Wallet },
  ];

  return (
    <div className="referrals-page">
      <header className="referrals-page__header">
        <div className="ref-page-header">
          <div className="ref-page-header__start">
            <button
              type="button"
              onClick={handleBack}
              className="ref-page-header__back"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="ref-page-header__brand"
              onClick={() => router.push('/dashboard')}
              aria-label={`${settings.platformName} — Dashboard`}
            >
              <img src="/all-07.svg" alt="" />
              <span className="ref-page-header__brand-text">
                <strong>{settings.platformName}</strong>
                <small>Referral Program</small>
              </span>
            </button>
            <p className="ref-page-header__mobile-title">Referrals</p>
          </div>

          <div className="ref-page-header__actions">
            <DarkModeToggle size="sm" />
            {user?.role === 'student' && (
              <div className="ref-page-header__badge">
                <ReferralBadge />
              </div>
            )}
            <div className="ref-page-header__profile">
              <UserProfileDropdown user={user} />
            </div>
          </div>
        </div>
      </header>

      <main className="referrals-page__main">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="ref-back-link"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <nav className="ref-tabs" aria-label="Referral sections">
          {tabItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`ref-tabs__btn${activeTab === id ? ' is-active' : ''}`}
              aria-label={label}
            >
              <Icon size={16} aria-hidden />
              <span className="ref-tabs__label">{label}</span>
            </button>
          ))}
        </nav>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="ref-hero"
            >
              <div className="ref-hero__aurora" aria-hidden />
              <div className="ref-hero__inner">
                <div>
                  <p className="ref-hero__eyebrow">
                    <Sparkles size={12} />
                    Grow your network
                  </p>
                  <h2 className="ref-hero__title">Share. Refer. Earn commissions.</h2>
                  <p className="ref-hero__subtitle">
                    Invite traders with your personal link. When they purchase a package, they join your verified network and you earn on every level.
                  </p>
                </div>
                <div className="ref-hero__code-box">
                  {referralCode ? (
                    <>
                      <div className="ref-hero__code-row">
                        <code className="ref-hero__code">{referralCode}</code>
                        <button type="button" className="ref-hero__copy-btn" onClick={copyReferralLink}>
                          <Copy size={15} />
                          Copy link
                        </button>
                      </div>
                      {referralUrl && <p className="ref-hero__link">{referralUrl}</p>}
                    </>
                  ) : (
                    <button type="button" className="ref-hero__copy-btn" onClick={fetchReferralData}>
                      Generate referral code
                    </button>
                  )}
                </div>
              </div>
            </motion.section>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <RankRewardsProgress hideRefresh />
            </motion.div>

            <div className="ref-stat-grid">
              {[
                { label: 'Total Referrals', value: stats?.totalReferrals || 0, icon: Users, tone: 'blue' },
                { label: 'Verified', value: stats?.verifiedReferrals ?? 0, hint: 'Purchased a package', icon: ShieldCheck, tone: 'green' },
                { label: 'Unverified', value: stats?.unverifiedReferrals ?? 0, hint: 'No package yet', icon: ShieldOff, tone: 'amber' },
                { label: 'Total Earnings', value: `$${(stats?.totalEarnings || 0).toFixed(2)}`, icon: DollarSign, tone: 'green' },
                { label: 'Pending', value: `$${(stats?.pendingEarnings || 0).toFixed(2)}`, icon: TrendingUp, tone: 'amber' },
                { label: 'Direct (L1)', value: stats?.level1Count || 0, icon: Award, tone: 'violet' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.04 }}
                  className={`ref-stat-card ref-stat-card--${item.tone}`}
                >
                  <p className="ref-stat-card__label">{item.label}</p>
                  <p className="ref-stat-card__value">{item.value}</p>
                  {'hint' in item && item.hint && <p className="ref-stat-card__hint">{item.hint}</p>}
                  <item.icon className="ref-stat-card__icon" style={{ color: 'var(--ref-accent)' }} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tree' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="ref-panel">
            <div className="ref-panel__head">
              <h2 className="ref-panel__title">Your Referral Network</h2>
              <div className="ref-panel__head-actions">
                {treeView === 'list' && (
                  <div className="ref-segment">
                    {(['all', 'verified', 'unverified'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setReferralFilter(f)}
                        className={`ref-segment__btn${referralFilter === f ? ' is-active' : ''}`}
                      >
                        {f === 'all' ? 'All' : f === 'verified' ? 'Verified' : 'Pending'}
                      </button>
                    ))}
                  </div>
                )}
                <div className="ref-segment">
                  <button
                    type="button"
                    onClick={() => setTreeView('list')}
                    className={`ref-segment__btn${treeView === 'list' ? ' is-active' : ''}`}
                  >
                    <LayoutList size={14} className="inline mr-1" />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setTreeView('tree')}
                    className={`ref-segment__btn${treeView === 'tree' ? ' is-active' : ''}`}
                  >
                    <GitBranch size={14} className="inline mr-1" />
                    Tree
                  </button>
                </div>
              </div>
            </div>

            <div className="ref-panel__body">
              {tree && Array.isArray(tree.tree) && tree.tree.length > 0 ? (
                treeView === 'list' ? (
                  <ReferralListView nodes={tree.tree} filter={referralFilter} />
                ) : (
                  <ReferralTreeView
                    rootName={
                      (tree.user as { name?: string })?.name ||
                      user?.firstName
                        ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                        : 'You'
                    }
                    rootCode={tree.user?.referralCode || referralCode}
                    nodes={tree.tree}
                    stats={treeStats}
                  />
                )
              ) : (
                <div className="ref-empty">
                  <Users className="ref-empty__icon" />
                  <p className="ref-empty__title">
                    {tree?.tree?.length === 0 ? 'No referrals yet' : 'Could not load network'}
                  </p>
                  <p className="ref-empty__text">
                    Share your referral link to start building your team tree.
                  </p>
                  {stats && stats.totalReferrals > 0 && (
                    <p className="ref-empty__text mt-2">
                      You have {stats.totalReferrals} referrals in stats — try refreshing.
                    </p>
                  )}
                  <button
                    type="button"
                    className="ref-empty__btn"
                    onClick={() => {
                      setLoading(true);
                      fetchReferralData();
                    }}
                  >
                    Refresh network
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'earnings' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="ref-panel">
              <div className="ref-panel__head">
                <h2 className="ref-panel__title">Earnings Summary</h2>
              </div>
              <div className="ref-panel__body">
                <div className="ref-earnings-grid">
                  <div className="ref-earnings-card ref-earnings-card--green">
                    <p className="ref-stat-card__label">Total earned</p>
                    <p className="ref-stat-card__value" style={{ color: 'var(--ref-emerald)' }}>
                      ${(earnings?.totalEarnings || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="ref-earnings-card ref-earnings-card--amber">
                    <p className="ref-stat-card__label">Pending</p>
                    <p className="ref-stat-card__value" style={{ color: 'var(--ref-amber)' }}>
                      ${(earnings?.pendingEarnings || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="ref-earnings-card ref-earnings-card--blue">
                    <p className="ref-stat-card__label">Commissions</p>
                    <p className="ref-stat-card__value" style={{ color: 'var(--ref-accent)' }}>
                      {earnings?.commissions?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="ref-panel">
              <div className="ref-panel__head">
                <h2 className="ref-panel__title">Commission History</h2>
              </div>
              <div className="ref-panel__body">
                {earnings?.commissions?.length ? (
                  <div className="ref-table-wrap">
                    <table className="ref-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Purchaser</th>
                          <th>Level</th>
                          <th>Purchase</th>
                          <th>Commission</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earnings.commissions.map((commission) => (
                          <tr key={commission._id}>
                            <td>{new Date(commission.createdAt).toLocaleDateString()}</td>
                            <td>{commission.purchaser.firstName} {commission.purchaser.lastName}</td>
                            <td>L{commission.level}</td>
                            <td>${commission.purchaseAmount.toFixed(2)}</td>
                            <td style={{ color: 'var(--ref-emerald)', fontWeight: 600 }}>
                              ${commission.commissionAmount.toFixed(2)} ({commission.commissionRate}%)
                            </td>
                            <td>
                              <span className={`ref-node__badge ${commission.status === 'paid' ? 'ref-node__badge--verified' : ''}`} style={commission.status !== 'paid' ? { background: 'rgba(217,119,6,0.12)', color: 'var(--ref-amber)' } : undefined}>
                                {commission.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="ref-empty">
                    <DollarSign className="ref-empty__icon" />
                    <p className="ref-empty__title">No commissions yet</p>
                    <p className="ref-empty__text">Refer users who purchase packages to start earning.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-100 via-blue-50 to-indigo-50 dark:bg-gray-800 text-gray-900 dark:text-white py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 dark:bg-gray-800" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <motion.div 
                className="flex items-center mb-6"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="relative">
                  <img 
                    src="/all-07.svg" 
                    alt={`${settings.platformName} Logo`} 
                    className="w-8 h-8 object-contain dark:invert"
                  />
                  <motion.div
                    className="absolute inset-0 bg-blue-400 rounded-full opacity-20"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <span className="ml-2 text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {settings.platformName}
                </span>
              </motion.div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Empowering traders with comprehensive education and real-time insights to achieve financial success.
              </p>
            </div>
            
            {[
              {
                title: 'Platform',
                links: [
                  { name: 'Live Sessions', href: '/dashboard' },
                  { name: 'Trading Signals', href: '/dashboard' },
                  { name: 'Community', href: '/dashboard' }
                ]
              },
              {
                title: 'Support',
                links: [
                  { name: 'Help Center', href: '/contact' },
                  { name: 'Contact Us', href: '/contact' },
                  { name: 'FAQ', href: '/faq' },
                  { name: 'Terms of Service', href: '/terms' }
                ]
              },
              {
                title: 'Connect',
                links: [
                  { name: 'Twitter', href: '#' },
                  { name: 'LinkedIn', href: '#' },
                  { name: 'YouTube', href: '#' },
                  { name: 'Discord', href: '#' }
                ]
              }
            ].map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link href={link.href} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
          
          <motion.div 
            className="border-t border-gray-300 dark:border-gray-700 mt-12 pt-8 text-center text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <p>&copy; 2026 {settings.platformName}. All rights reserved. | Built with ❤️ for forex traders worldwide</p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}