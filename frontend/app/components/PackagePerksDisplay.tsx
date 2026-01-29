'use client';

import { usePackagePerks, PackagePerk } from '@/hooks/usePackagePerks';
import { 
  CheckCircle, 
  XCircle, 
  Sparkles, 
  Zap, 
  Crown,
  TrendingUp,
  Users,
  BookOpen,
  BarChart3,
  Shield,
  Mail,
  Video,
  Calendar,
  Award,
  Target,
  Rocket,
  Lock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PackagePerksDisplayProps {
  showUpgradeButton?: boolean;
  className?: string;
}

const perkIcons: Record<string, any> = {
  tradingSignals: TrendingUp,
  mentorship: Users,
  premiumIndicators: BarChart3,
  autoTrading: Zap,
  community: Users,
  support: Mail,
  liveSessions: Video,
  marketAnalysis: BarChart3,
  riskManagement: Shield,
  physicalClasses: Calendar,
  oneOnOneCoaching: Award,
  advancedStrategies: Target,
  lifetimeAccess: Crown,
  vipCommunity: Crown
};

export default function PackagePerksDisplay({ 
  showUpgradeButton = true,
  className = '' 
}: PackagePerksDisplayProps) {
  const { perksData, loading } = usePackagePerks();
  const router = useRouter();

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!perksData) {
    // Still loading or no data yet
    return null;
  }

  if (!perksData.hasPackage) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Active Package
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {perksData.message || 'Subscribe to a package to unlock features and perks'}
          </p>
          {showUpgradeButton && (
            <button
              onClick={() => router.push('/select-package')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Packages
            </button>
          )}
        </div>
      </div>
    );
  }

  const enabledPerks = Object.entries(perksData.perks).filter(([_, perk]) => perk.enabled);
  const disabledPerks = Object.entries(perksData.perks).filter(([_, perk]) => !perk.enabled);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Your Package Perks
          </h3>
          {perksData.packageName && (
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
              {perksData.packageName}
            </span>
          )}
        </div>
        {perksData.isAdmin && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Admin/Teacher - Full Access to All Features
          </p>
        )}
      </div>

      {/* Enabled Perks */}
      {enabledPerks.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
            Available Features ({enabledPerks.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enabledPerks.map(([perkName, perk]) => {
              const Icon = perkIcons[perkName] || Sparkles;
              return (
                <div
                  key={perkName}
                  className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800"
                >
                  <Icon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {perk.description}
                    </p>
                    {perk.sessionsPerMonth && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {perk.sessionsPerMonth === 'unlimited' 
                          ? 'Unlimited sessions' 
                          : `${perk.sessionsPerMonth} sessions/month`}
                      </p>
                    )}
                    {perk.responseTime && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Response: {perk.responseTime}
                      </p>
                    )}
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Disabled Perks (Upgrade Options) */}
      {disabledPerks.length > 0 && showUpgradeButton && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
            <Lock className="w-4 h-4 mr-2 text-gray-400" />
            Upgrade to Unlock ({disabledPerks.length} more features)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {disabledPerks.slice(0, 4).map(([perkName, perk]) => {
              const Icon = perkIcons[perkName] || Sparkles;
              return (
                <div
                  key={perkName}
                  className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 opacity-60"
                >
                  <Icon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {perk.description}
                    </p>
                  </div>
                  <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              );
            })}
          </div>
          {disabledPerks.length > 4 && (
            <button
              onClick={() => router.push('/select-package')}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-semibold"
            >
              Upgrade Package to Unlock All Features
            </button>
          )}
        </div>
      )}
    </div>
  );
}
