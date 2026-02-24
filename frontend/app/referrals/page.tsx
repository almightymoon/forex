'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Share2, 
  Copy, 
  Users, 
  DollarSign, 
  TrendingUp,
  Award,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  ArrowLeft,
  ShieldCheck,
  ShieldOff,
  Target,
  Sparkles
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
// @ts-ignore - react-d3-tree types
import Tree from 'react-d3-tree';

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

  // Render tree as list view (optionally filtered, flat)
  const renderTreeList = (nodes: any[], level: number = 1, flatFiltered?: boolean): JSX.Element[] => {
    const list = flatFiltered ? nodes : (nodes || []);
    if (!list.length) return [];

    return list.map((node, idx) => {
      const userName = node.user?.name || `${node.firstName || ''} ${node.lastName || ''}`.trim() || 'Unknown';
      const userEmail = node.user?.email || node.email || '';
      const userId = node.user?.id || node._id?.toString() || `n-${idx}`;
      const joinedAt = node.user?.joinedAt || node.createdAt || new Date();
      const nodeLevel = node.level || level;
      const verified = node.verified === true || node.user?.verified === true;

      return (
        <div key={userId} className={flatFiltered ? 'mt-3' : 'ml-8 mt-4'}>
          <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <div className="flex items-center flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded">
                  Level {nodeLevel}
                </span>
                {verified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 text-xs font-semibold rounded">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-semibold rounded">
                    <ShieldOff className="w-3 h-3" /> Unverified
                  </span>
                )}
                <span className="text-gray-900 dark:text-white">
                  {userName}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {userEmail}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Joined: {new Date(joinedAt).toLocaleDateString()}
              </p>
              {(node.childrenCount !== undefined || node.totalDescendants !== undefined) && !flatFiltered && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {node.childrenCount || 0} direct • {node.totalDescendants || 0} total
                </p>
              )}
            </div>
          </div>
          {!flatFiltered && node.children?.length > 0 && (
            <div className="ml-4 border-l-2 border-gray-300 dark:border-gray-600">
              {renderTreeList(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Transform tree data to react-d3-tree format (all children included for complete tree)
  const transformToD3Tree = (node: any): any => {
    if (!node) return null;
    
    const children = node.children || [];
    const allChildren = children.map((child: any) => transformToD3Tree(child)).filter(Boolean);
    
    // Handle both data structures
    const userName = node.user?.name || `${node.firstName || ''} ${node.lastName || ''}`.trim() || 'Unknown';
    const userEmail = node.user?.email || node.email || '';
    const userReferralCode = node.user?.referralCode || node.referralCode || '';
    const userJoinedAt = node.user?.joinedAt || node.createdAt || new Date();
    const nodeLevel = node.level || 1;
    
    return {
      name: `${userName} (Level ${nodeLevel})`,
      attributes: {
        level: nodeLevel,
        email: userEmail,
        referralCode: userReferralCode,
        joinedAt: userJoinedAt
      },
      children: allChildren.length > 0 ? allChildren : undefined
    };
  };

  // Calculate node positions for binary tree layout with better spacing
  const calculateNodePositions = (node: any, x: number, y: number, level: number, spacing: { x: number, y: number }): any => {
    if (!node) return null;

    const positions: any = {
      node,
      x,
      y,
      level
    };

    const childY = y + spacing.y;
    // Increase horizontal spacing based on level to prevent overlap
    // Use exponential spacing: base spacing * 2^level
    const baseSpacing = spacing.x;
    // Reduced multiplier to bring nodes closer together
    const levelMultiplier = Math.pow(1.5, level); // Reduced from 2.2 to 1.5 for tighter spacing
    const childSpacing = (baseSpacing * levelMultiplier) / 2;
    
    if (node.left) {
      positions.left = calculateNodePositions(
        node.left,
        x - childSpacing,
        childY,
        level + 1,
        spacing
      );
    }
    
    if (node.right) {
      positions.right = calculateNodePositions(
        node.right,
        x + childSpacing,
        childY,
        level + 1,
        spacing
      );
    }

    return positions;
  };

  // Render binary tree with SVG connections
  const renderBinaryTree = (rootNode: any, startX: number = 500, startY: number = 50, levelSpacing: number = 120, nodeSpacing: number = 250): JSX.Element => {
    if (!rootNode) {
      return (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No referrals yet. Start sharing your referral code!
          </p>
        </div>
      );
    }

    const positions = calculateNodePositions(
      rootNode,
      startX,
      startY,
      0,
      { x: nodeSpacing, y: levelSpacing }
    );

    if (!positions) {
      console.error('Failed to calculate positions for rootNode:', rootNode);
      return (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            Error calculating tree positions. Please check the console.
          </p>
        </div>
      );
    }

    const nodes: any[] = [];
    const lines: any[] = [];

    const collectNodesAndLines = (pos: any) => {
      if (!pos) return;

      nodes.push(pos);

      if (pos.left) {
        lines.push({
          x1: pos.x,
          y1: pos.y + 70, // Bottom of parent node
          x2: pos.left.x,
          y2: pos.left.y, // Top of child node
        });
        collectNodesAndLines(pos.left);
      }

      if (pos.right) {
        lines.push({
          x1: pos.x,
          y1: pos.y + 70, // Bottom of parent node
          x2: pos.right.x,
          y2: pos.right.y, // Top of child node
        });
        collectNodesAndLines(pos.right);
      }
    };

    collectNodesAndLines(positions);
    
    console.log('Collected nodes:', nodes.length);
    console.log('Collected lines:', lines.length);
    console.log('Nodes:', nodes);

    if (nodes.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No nodes to display. Tree structure might be empty.
          </p>
        </div>
      );
    }

    // Calculate SVG dimensions with proper padding
    const nodeWidth = 180; // Width of each node
    const padding = 200; // Extra padding on each side
    const minX = Math.min(...nodes.map(n => n.x - nodeWidth/2), 0) - padding;
    const maxX = Math.max(...nodes.map(n => n.x + nodeWidth/2), 1000) + padding;
    const maxY = Math.max(...nodes.map(n => n.y + 100), 600);
    const svgWidth = Math.max(1200, maxX - minX);
    const svgHeight = Math.max(800, maxY + 200);
    
    // Calculate offset to center the tree
    const offsetX = Math.abs(minX);

    return (
      <div className="overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg p-8" style={{ minHeight: '600px' }}>
        <svg width={svgWidth} height={svgHeight} className="relative" style={{ marginLeft: `${offsetX}px` }}>
          {/* Draw connecting lines */}
          {lines.map((line, idx) => (
            <line
              key={`line-${idx}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#94a3b8"
              strokeWidth="2.5"
              className="dark:stroke-gray-600"
              markerEnd="url(#arrowhead)"
            />
          ))}
          
          {/* Arrow marker for lines */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="5"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="#94a3b8"
                className="dark:fill-gray-600"
              />
            </marker>
          </defs>
          
          {/* Draw nodes */}
          {nodes.map((pos, idx) => (
            <g key={`node-${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
              {/* Node background with shadow effect */}
              <rect
                x="-90"
                y="0"
                width="180"
                height="70"
                rx="10"
                fill="white"
                className="dark:fill-gray-800 dark:stroke-blue-500"
                stroke="#3b82f6"
                strokeWidth="2.5"
                filter="url(#shadow)"
              />
              
              {/* Shadow filter */}
              <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2"/>
                </filter>
              </defs>
              
              {/* Level badge */}
              <rect
                x="-85"
                y="8"
                width="55"
                height="20"
                rx="5"
                fill="#3b82f6"
                className="dark:fill-blue-600"
              />
              <text
                x="-57.5"
                y="21"
                textAnchor="middle"
                fill="white"
                fontSize="11"
                className="font-normal"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                Level {pos.node.level}
              </text>
              
              {/* Name */}
              <text
                x="0"
                y="42"
                textAnchor="middle"
                fill="#1f2937"
                className="dark:fill-white font-normal"
                fontSize="13"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {pos.node.user.name.length > 18 
                  ? pos.node.user.name.substring(0, 18) + '...' 
                  : pos.node.user.name}
              </text>
              
              {/* Email */}
              <text
                x="0"
                y="58"
                textAnchor="middle"
                fill="#6b7280"
                className="dark:fill-gray-400 font-normal"
                fontSize="10"
              >
                {pos.node.user.email.length > 22 
                  ? pos.node.user.email.substring(0, 22) + '...' 
                  : pos.node.user.email}
              </text>
              
              {/* Show remaining children count if > 2 */}
              {pos.node.remainingCount > 0 && (
                <circle
                  cx="75"
                  cy="15"
                  r="12"
                  fill="#ef4444"
                  className="dark:fill-red-500"
                />
              )}
              {pos.node.remainingCount > 0 && (
                <text
                  x="75"
                  y="19"
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  className="font-normal"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  +{pos.node.remainingCount}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header - Same as Dashboard */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4 group cursor-pointer" onClick={() => router.push('/dashboard')}>
              <div className="relative">
                <img 
                  src="/all-07.svg" 
                  alt={`${settings.platformName} Logo`} 
                  className="w-14 h-14 object-contain dark:invert group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-200">
                  {settings.platformName}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">Referral Program</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <DarkModeToggle size="sm" />
              
              {/* Referral Badge - Only for students */}
              {user?.role === 'student' && <ReferralBadge />}
              
              {/* User Profile Dropdown */}
              <div className="border-l border-gray-200 dark:border-gray-700 pl-4">
                <UserProfileDropdown user={user} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {['overview', 'tree', 'earnings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Referral Code Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Share2 className="w-5 h-5 mr-2 text-blue-600" />
                Your Referral Code
              </h2>
              {referralCode ? (
                <>
                  <div className="flex items-center space-x-3">
                    <code className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-lg font-mono text-gray-900 dark:text-white">
                      {referralCode}
                    </code>
                    <button
                      onClick={copyReferralLink}
                      className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </button>
                  </div>
                  {referralUrl && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Your Referral Link:</p>
                      <code className="text-sm text-blue-700 dark:text-blue-300 break-all">{referralUrl}</code>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                    Share your referral link to earn commissions when people sign up and purchase packages!
                  </p>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {loading ? 'Generating your referral code...' : 'No referral code found. Please refresh the page.'}
                  </p>
                  {!loading && (
                    <button
                      onClick={fetchReferralData}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
            </motion.div>

            {/* Rank & Progress */}
            {stats?.rank && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Your Referral Rank
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div
                    className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border-2"
                    style={{ borderColor: stats.rank.current?.color || '#94a3b8', backgroundColor: `${stats.rank.current?.color || '#94a3b8'}15` }}
                  >
                    <span className="text-2xl" role="img" aria-hidden>{stats.rank.current?.icon || '🌱'}</span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{stats.rank.current?.name || 'Starter'}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{stats.rank.current?.description || 'Just getting started'}</p>
                    </div>
                  </div>
                  {stats.rank.next && (
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Progress to {stats.rank.next.name}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {(stats?.level1Count ?? stats?.directReferrals ?? 0)} / {stats.rank.next.minDirects ?? 0} directs · {stats?.totalReferrals || 0} / {stats.rank.next.minReferrals} total
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(stats.rank.progressToNext ?? 0) * 100}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: stats.rank.next?.color || '#3b82f6' }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <Target className="w-4 h-4 inline mr-1" />
                        Need{' '}
                        <strong className="text-gray-900 dark:text-white">
                          {Math.max(0, (stats.rank.next?.minDirects ?? 0) - (stats?.level1Count ?? stats?.directReferrals ?? 0))}
                        </strong>{' '}
                        more directs and{' '}
                        <strong className="text-gray-900 dark:text-white">
                          {Math.max(0, (stats.rank.next?.minReferrals ?? 0) - (stats?.totalReferrals || 0))}
                        </strong>{' '}
                        more total to reach {stats.rank.next?.name}
                      </p>
                    </div>
                  )}
                  {!stats.rank.next && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <Award className="w-4 h-4" /> You&apos;ve reached the top rank! Keep referring to maximize earnings.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Referrals</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats?.totalReferrals || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Verified</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {stats?.verifiedReferrals ?? 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Purchased a package</p>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-green-600" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Unverified</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                      {stats?.unverifiedReferrals ?? 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">No package yet</p>
                  </div>
                  <ShieldOff className="w-8 h-8 text-amber-600" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      ${(stats?.totalEarnings || 0).toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending Earnings</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      ${(stats?.pendingEarnings || 0).toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-yellow-600" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Level 1</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats?.level1Count || 0}
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-purple-600" />
                </div>
              </motion.div>
            </div>

            {/* Commission Rates */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Commission Structure
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div key={level} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Level {level}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                      {level === 1 ? '20%' : level <= 3 ? '15%' : '10%'}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                Verified referrals are those who purchased a package—they earn you commissions. Share your link and encourage sign-ups to buy!
              </p>
            </motion.div>
          </div>
        )}

        {/* Tree Tab */}
        {activeTab === 'tree' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your Referral Tree
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                {treeView === 'list' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      {(['all', 'verified', 'unverified'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setReferralFilter(f)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                            referralFilter === f
                              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          {f === 'all' ? 'All' : f === 'verified' ? 'Verified' : 'Unverified'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setTreeView('list')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      treeView === 'list'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    List View
                  </button>
                  <button
                    onClick={() => setTreeView('tree')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      treeView === 'tree'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    Tree View
                  </button>
                </div>
              </div>
            </div>
            
            {tree && Array.isArray(tree.tree) && tree.tree.length > 0 ? (
              <div className="mt-4">
                {treeView === 'list' ? (
                  <div>
                    {filteredReferralList.length > 0 ? (
                      <>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Showing {filteredReferralList.length} referral{filteredReferralList.length !== 1 ? 's' : ''}
                          {referralFilter !== 'all' && ` (${referralFilter})`}
                        </p>
                        {renderTreeList(filteredReferralList, 1, true)}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="w-14 h-14 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No {referralFilter} referrals yet.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                          Try &quot;All&quot; to see everyone, or refer more people who purchase packages for &quot;Verified&quot;.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Root node */}
                    <div className="text-center mb-12">
                      <div className="inline-block">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-1 shadow-xl">
                          <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-4">
                            <div className="flex items-center justify-center space-x-3 mb-2">
                              <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold rounded-full">
                                ROOT
                              </span>
                              <span className="text-lg text-gray-900 dark:text-white">
                                {(tree.user as { name?: string; firstName?: string; lastName?: string })?.name || (`${(tree.user as any)?.firstName ?? ''} ${(tree.user as any)?.lastName ?? ''}`.trim()) || 'You'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                              {tree.user?.referralCode || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* D3 Tree */}
                    {(() => {
                      let d3TreeData;
                      if (tree.tree.length === 1) {
                        d3TreeData = transformToD3Tree(tree.tree[0]);
                      } else {
                        const children = tree.tree.map(node => transformToD3Tree(node)).filter(Boolean);
                        d3TreeData = {
                          name: `${tree.user?.name || 'You'} (You)`,
                          attributes: {
                            level: 0,
                            email: '',
                            referralCode: tree.user?.referralCode || ''
                          },
                          children: children.length > 0 ? children : undefined
                        };
                      }
                      
                      if (!d3TreeData) {
                        return <div className="text-center py-12 text-gray-600 dark:text-gray-400">Error transforming tree data.</div>;
                      }
                      
                      return (
                        <div className="referral-tree-wrapper w-full h-[600px] bg-gradient-to-br from-white via-gray-50 to-blue-50 rounded-lg overflow-hidden border border-gray-200 shadow-inner">
                          <style dangerouslySetInnerHTML={{ __html: `
                            .referral-tree-wrapper text,
                            .referral-tree-wrapper .rd3t-label__title {
                              font-weight: 400 !important;
                              font-size: 16px !important;
                              fill: #1f2937 !important;
                            }
                            .referral-tree-wrapper text.rd3t-label__attributes {
                              font-size: 13px !important;
                              fill: #4b5563 !important;
                            }
                            .referral-tree-wrapper .rd3t-link {
                              stroke: #94a3b8 !important;
                            }
                          `}} />
                          <Tree
                            data={d3TreeData}
                            orientation="vertical"
                            pathFunc="straight"
                            separation={{ siblings: 1.5, nonSiblings: 2 }}
                            translate={{ x: 400, y: 50 }}
                            nodeSize={{ x: 220, y: 160 }}
                            styles={{
                              nodes: {
                                node: {
                                  circle: { fill: '#3b82f6', stroke: '#1e40af', strokeWidth: 2 },
                                  name: { fill: '#1f2937', fontSize: '13px', fontFamily: 'system-ui', fontWeight: 400 },
                                  attributes: { fill: '#6b7280', fontSize: '11px' }
                                },
                                leafNode: {
                                  circle: { fill: '#10b981', stroke: '#059669', strokeWidth: 2 }
                                }
                              },
                              links: { stroke: '#94a3b8', strokeWidth: 2, fill: 'none' }
                            }}
                            renderCustomNodeElement={(rd3tProps) => {
                              const { nodeDatum, toggleNode } = rd3tProps;
                              return (
                                <g>
                                  <circle r={15} fill={nodeDatum.children ? '#3b82f6' : '#10b981'} stroke={nodeDatum.children ? '#1e40af' : '#059669'} strokeWidth={2} onClick={toggleNode} style={{ cursor: 'pointer' }} />
                                  <text x={20} y={6} fill="#1f2937" fontFamily="system-ui" style={{ fontWeight: 400, fontSize: '16px' }}>{nodeDatum.name}</text>
                                  {nodeDatum.attributes?.email && <text x={20} y={26} fill="#4b5563" style={{ fontSize: '13px' }}>{nodeDatum.attributes.email}</text>}
                                </g>
                              );
                            }}
                          />
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                {loading ? (
                  <>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Loading referral tree...</p>
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mt-4"></div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {tree && tree.tree && tree.tree.length === 0 
                        ? 'No referrals in tree structure.' 
                        : tree 
                          ? 'Tree data loaded but empty.' 
                          : 'Failed to load referral tree.'} 
                    </p>
                    {stats && stats.totalReferrals > 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 mb-4">
                        You have {stats.totalReferrals} total referrals. Click refresh to reload the tree.
                      </p>
                    )}
                    <button
                      onClick={() => {
                        setLoading(true);
                        fetchReferralData();
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Refresh Tree
                    </button>
                    {/* {tree && (
                      <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                        Debug: Tree exists: {tree ? 'Yes' : 'No'}, 
                        Tree array: {tree?.tree ? (Array.isArray(tree.tree) ? `Yes (${tree.tree.length} items)` : 'Not an array') : 'No tree property'}
                      </div>
                    )} */}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Earnings Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Earnings Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Earned</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    ${(earnings?.totalEarnings || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                    ${(earnings?.pendingEarnings || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Commissions</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {earnings?.commissions?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Commissions List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Commission History
              </h3>
              {earnings && earnings.commissions && earnings.commissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Purchaser</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Level</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Purchase Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Commission</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {earnings.commissions.map((commission) => (
                        <tr key={commission._id}>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {new Date(commission.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {commission.purchaser.firstName} {commission.purchaser.lastName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            Level {commission.level}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            ${commission.purchaseAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                            ${commission.commissionAmount.toFixed(2)} ({commission.commissionRate}%)
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              commission.status === 'paid'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {commission.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No commissions yet. Start referring users to earn!
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

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