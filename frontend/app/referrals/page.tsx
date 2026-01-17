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
  CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { buildApiUrl } from '../../utils/api';
import { showToast } from '@/utils/toast';
import UserProfileDropdown from '../components/UserProfileDropdown';
import DarkModeToggle from '../../components/DarkModeToggle';
import { useSettings } from '../../context/SettingsContext';
// @ts-ignore - react-d3-tree types
import Tree from 'react-d3-tree';

interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  level1Count: number;
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
  stats: ReferralStats;
  tree: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      referralCode: string;
      joinedAt: string;
    };
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
        setTree(treeData.data);
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

  // Render tree as list view (old view)
  const renderTreeList = (nodes: any[], level: number = 1): JSX.Element[] => {
    if (!nodes || nodes.length === 0) return [];

    return nodes.map((node, idx) => (
      <div key={node.user.id} className="ml-8 mt-4">
        <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded">
                Level {node.level}
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {node.user.name}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {node.user.email}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Joined: {new Date(node.user.joinedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="ml-4 border-l-2 border-gray-300 dark:border-gray-600">
            {renderTreeList(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  // Transform tree data to react-d3-tree format (binary tree - max 2 children)
  const transformToD3Tree = (node: any): any => {
    if (!node) return null;
    
    const children = node.children || [];
    // Take only first 2 children for binary tree
    const binaryChildren = children.slice(0, 2).map((child: any) => transformToD3Tree(child)).filter(Boolean);
    
    return {
      name: `${node.user.name} (Level ${node.level})`,
      attributes: {
        level: node.level,
        email: node.user.email,
        referralCode: node.user.referralCode,
        joinedAt: node.user.joinedAt,
        remainingCount: children.length > 2 ? children.length - 2 : 0
      },
      children: binaryChildren.length > 0 ? binaryChildren : undefined
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <img 
                src="/all-07.svg" 
                alt={`${settings.platformName} Logo`} 
                className="w-14 h-14 object-contain dark:invert"
              />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {settings.platformName}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Referral Program</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <DarkModeToggle size="sm" />
              <button
                onClick={() => router.push('/profile')}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Back to Profile
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                transition={{ delay: 0.2 }}
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
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Level 1 Referrals</p>
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your Referral Tree
              </h2>
              <div className="flex items-center space-x-4">
                {/* View Toggle */}
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
            {tree && tree.tree && tree.tree.length > 0 ? (
              <div className="mt-4">
                {treeView === 'list' ? (
                  // List View (old view)
                  <div>
                    {renderTreeList(tree.tree)}
                  </div>
                ) : (
                  // Tree View (binary tree visualization)
                  <>
                    {/* Root node (current user) */}
                    <div className="text-center mb-12">
                      <div className="inline-block">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-1 shadow-xl">
                          <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-4">
                            <div className="flex items-center justify-center space-x-3 mb-2">
                              <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold rounded-full">
                                ROOT
                              </span>
                              <span className="font-bold text-lg text-gray-900 dark:text-white">
                                {tree.user.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                              {tree.user.referralCode}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Binary tree visualization using React D3 Tree */}
                    {(() => {
                      if (tree.tree.length === 0) {
                        return (
                          <div className="text-center py-12">
                            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">
                              No referrals yet. Start sharing your referral code!
                            </p>
                          </div>
                        );
                      }
                      
                      // Transform tree data to D3 format
                      let d3TreeData;
                      
                      if (tree.tree.length === 1) {
                        // Single root node
                        d3TreeData = transformToD3Tree(tree.tree[0]);
                      } else {
                        // Multiple root nodes - create virtual root
                        const children = tree.tree.slice(0, 2).map(node => transformToD3Tree(node)).filter(Boolean);
                        d3TreeData = {
                          name: `${tree.user.name} (You)`,
                          attributes: {
                            level: 0,
                            email: '',
                            referralCode: tree.user.referralCode,
                            remainingCount: tree.tree.length > 2 ? tree.tree.length - 2 : 0
                          },
                          children: children.length > 0 ? children : undefined
                        };
                      }
                      
                      if (!d3TreeData) {
                        return (
                          <div className="text-center py-12">
                            <p className="text-gray-600 dark:text-gray-400">
                              Error transforming tree data.
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="w-full h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden">
                          <Tree
                            data={d3TreeData}
                            orientation="vertical"
                            pathFunc="straight"
                            separation={{ siblings: 1.5, nonSiblings: 2 }}
                            translate={{ x: 400, y: 50 }}
                            nodeSize={{ x: 200, y: 150 }}
                            rootNodeClassName="node__root"
                            branchNodeClassName="node__branch"
                            leafNodeClassName="node__leaf"
                            styles={{
                              nodes: {
                                node: {
                                  circle: {
                                    fill: '#3b82f6',
                                    stroke: '#1e40af',
                                    strokeWidth: 2
                                  },
                                  name: {
                                    fill: '#1f2937',
                                    fontSize: '13px',
                                    fontWeight: 'normal',
                                    fontFamily: 'system-ui, -apple-system, sans-serif'
                                  },
                                  attributes: {
                                    fill: '#6b7280',
                                    fontSize: '11px',
                                    fontWeight: 'normal',
                                    fontFamily: 'system-ui, -apple-system, sans-serif'
                                  }
                                },
                                leafNode: {
                                  circle: {
                                    fill: '#10b981',
                                    stroke: '#059669',
                                    strokeWidth: 2
                                  }
                                }
                              },
                              links: {
                                stroke: '#94a3b8',
                                strokeWidth: 2,
                                fill: 'none'
                              }
                            }}
                            renderCustomNodeElement={(rd3tProps) => {
                              const { nodeDatum, toggleNode } = rd3tProps;
                              return (
                                <g>
                                  <circle
                                    r={15}
                                    fill={nodeDatum.children ? '#3b82f6' : '#10b981'}
                                    stroke={nodeDatum.children ? '#1e40af' : '#059669'}
                                    strokeWidth={2}
                                    onClick={toggleNode}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <text
                                    x={20}
                                    y={5}
                                    fill="#1f2937"
                                    className="dark:fill-white font-normal"
                                    fontSize="13"
                                    fontFamily="system-ui, -apple-system, sans-serif"
                                  >
                                    {nodeDatum.name}
                                  </text>
                                  {nodeDatum.attributes?.email && (
                                    <text
                                      x={20}
                                      y={22}
                                      fill="#6b7280"
                                      className="dark:fill-gray-400 font-normal"
                                      fontSize="11"
                                      fontFamily="system-ui, -apple-system, sans-serif"
                                    >
                                      {nodeDatum.attributes.email}
                                    </text>
                                  )}
                                  {nodeDatum.attributes?.remainingCount > 0 && (
                                    <text
                                      x={20}
                                      y={38}
                                      fill="#ef4444"
                                      className="font-normal"
                                      fontSize="10"
                                      fontFamily="system-ui, -apple-system, sans-serif"
                                    >
                                      +{nodeDatum.attributes.remainingCount} more
                                    </text>
                                  )}
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
                <p className="text-gray-600 dark:text-gray-400">
                  No referrals yet. Start sharing your referral code!
                </p>
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
    </div>
  );
}