'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sprout, 
  Medal, 
  Award, 
  Trophy, 
  Gem, 
  Crown,
  Users,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { buildApiUrl } from '../../utils/api';

// Add fade-in animation style
const fadeInStyle = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

interface ReferralRank {
  current: { 
    name: string; 
    icon: string; 
    color: string; 
    description: string; 
    minReferrals: number 
  };
  next: { 
    name: string; 
    icon: string; 
    color: string; 
    minReferrals: number 
  } | null;
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
  level2Count: number;
  level3Count: number;
  level4Count: number;
  level5Count: number;
  referralCode: string;
}

interface ReferralBadgeProps {
  className?: string;
}

// Map rank names to icon components
const getRankIcon = (rankName: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'Starter': Sprout,
    'Bronze': Medal,
    'Silver': Award,
    'Gold': Trophy,
    'Platinum': Gem,
    'Diamond': Crown
  };
  return iconMap[rankName] || Sprout;
};

export default function ReferralBadge({ className = '' }: ReferralBadgeProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReferralStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const statsRes = await fetch(buildApiUrl('/api/referrals/stats'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success && statsData.data) {
            setStats(statsData.data);
          }
        }
      } catch (error) {
        console.error('Error fetching referral stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralStats();
  }, []);

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        badgeRef.current && 
        tooltipRef.current &&
        !badgeRef.current.contains(event.target as Node) &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTooltip]);

  if (loading || !stats?.rank) {
    return null;
  }

  const RankIcon = getRankIcon(stats.rank.current?.name || 'Starter');
  const rankColor = stats.rank.current?.color || '#94a3b8';

  return (
    <div className="relative" ref={badgeRef}>
      <div
        className={`p-2.5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg cursor-pointer group ${className}`}
        style={{ 
          borderColor: rankColor, 
          backgroundColor: `${rankColor}15` 
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/referrals';
          }
        }}
      >
        <RankIcon 
          className="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
          style={{ color: rankColor }}
        />
      </div>

      {/* Tooltip on hover */}
      {showTooltip && (
        <>
          <style>{fadeInStyle}</style>
          <div
            ref={tooltipRef}
            className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50"
            style={{
              animation: 'fadeIn 0.2s ease-in-out forwards'
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
          <div className="space-y-3">
            {/* Rank Header */}
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${rankColor}15` }}
              >
                <RankIcon 
                  className="w-6 h-6"
                  style={{ color: rankColor }}
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {stats.rank.current?.name || 'Starter'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {stats.rank.current?.description || 'Just getting started'}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Referrals</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {stats?.totalReferrals || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</span>
                </div>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ${(stats?.totalEarnings || 0).toFixed(2)}
                </span>
              </div>

              {stats?.pendingEarnings && stats.pendingEarnings > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                  </div>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    ${stats.pendingEarnings.toFixed(2)}
                  </span>
                </div>
              )}

              {stats.rank.next && (
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Next Rank</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {stats.rank.next.name}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${(stats.rank.progressToNext * 100).toFixed(0)}%`,
                        backgroundColor: rankColor
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {Math.max(0, (stats.rank.next.minReferrals - (stats?.totalReferrals || 0)))} more to {stats.rank.next.name}
                  </p>
                </div>
              )}
            </div>

            {/* Click hint */}
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic">
                Click to view details
              </p>
            </div>
          </div>
          </div>
        </>
      )}
    </div>
  );
}
