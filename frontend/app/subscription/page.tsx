'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle,
  Rocket,
  TrendingUp,
  Crown,
  ArrowLeft,
  Shield,
  Sparkles,
  Zap,
  Users,
  BookOpen,
  BarChart3,
  Gift,
  Star,
  Award
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { buildApiUrl } from '@/utils/api';
import DarkModeToggle from '../../components/DarkModeToggle';
import ReceiptDownloadButton from '../../components/ReceiptDownloadButton';

const packages = [
  { 
    name: 'FX Launch', 
    subtitle: 'Launch your trading journey',
    price: 100, 
    badge: 'Starter',
    accent: 'emerald',
    icon: Rocket,
    gradient: 'from-emerald-500 via-green-500 to-teal-500',
    bgGradient: 'from-emerald-50 via-green-50 to-teal-50',
    darkBgGradient: 'from-emerald-900/20 via-green-900/20 to-teal-900/20',
    features: [
      'Forex Trading Signals',
      'Forex Basic Mentorship',
      'Premium Indicators',
      'Auto Trading Access',
      'Community Support',
      'Email Support'
    ],
    image: '/pkg1.jpg'
  },
  { 
    name: 'FX Scale', 
    subtitle: 'Grow with structure',
    price: 600, 
    badge: 'Most Popular',
    accent: 'blue',
    icon: TrendingUp,
    gradient: 'from-blue-500 via-indigo-500 to-purple-500',
    bgGradient: 'from-blue-50 via-indigo-50 to-purple-50',
    darkBgGradient: 'from-blue-900/20 via-indigo-900/20 to-purple-900/20',
    highlight: true,
    features: [
      'Forex Trading Signals',
      'Live Online Mentorship Sessions',
      'Premium Indicators',
      'Auto Trading Access',
      'Priority Support',
      'Weekly Market Analysis',
      'Risk Management Strategies'
    ],
    image: '/pkg2.jpg'
  },
  { 
    name: 'FX Legacy', 
    subtitle: 'Trade for life',
    price: 1000,
    badge: 'Elite Program',
    accent: 'purple',
    icon: Crown,
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    bgGradient: 'from-purple-50 via-pink-50 to-rose-50',
    darkBgGradient: 'from-purple-900/20 via-pink-900/20 to-rose-900/20',
    features: [
      'Forex Trading Signals',
      'Forex Pro Mentorship',
      'Premium Indicators',
      'Auto Trading Access',
      'Physical (On-Ground) Classes',
      '1-on-1 Coaching Sessions',
      'Advanced Trading Strategies',
      'Lifetime Access',
      'VIP Community Access'
    ],
    image: '/pkg3.jpg'
  }
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscriptionPackage, setSubscriptionPackage] = useState<string | null>(null);
  const [subscriptionPrice, setSubscriptionPrice] = useState<number | null>(null);
  const [subscriptionDate, setSubscriptionDate] = useState<string | null>(null);
  const [packagePaymentId, setPackagePaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(buildApiUrl('api/payments/user'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const payments = await response.json();
          const completedPayment = payments.find((p: any) => 
            p.type === 'package' && p.status === 'completed'
          );

          if (completedPayment && completedPayment.package?.name) {
            setSubscriptionPackage(completedPayment.package.name);
            setSubscriptionPrice(completedPayment.package.price || completedPayment.finalAmount);
            setSubscriptionDate(completedPayment.confirmedAt || completedPayment.createdAt);
            setPackagePaymentId(completedPayment._id || null);
          }
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading subscription...</p>
        </div>
      </div>
    );
  }

  const currentPackage = packages.find(pkg => pkg.name === subscriptionPackage);
  const IconComponent = currentPackage?.icon || Rocket;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link 
            href="/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <DarkModeToggle size="sm" />
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            My Subscription
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View your current subscription package and access details
          </p>
        </div>

        {currentPackage ? (
          <div className="space-y-8">
            {/* Active Subscription Card */}
            <div className="w-full max-w-4xl mx-auto">
              <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-blue-500 dark:border-blue-400 overflow-hidden`}>
                {/* Active Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-green-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg">
                    <CheckCircle className="w-4 h-4" />
                    Active
                  </div>
                </div>

                {/* Package Header */}
                <div className={`bg-gradient-to-br ${currentPackage.gradient} p-8 text-white relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          <IconComponent className="w-8 h-8" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold mb-1">{currentPackage.name}</h2>
                          <p className="text-white/90">{currentPackage.subtitle}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Package Content */}
                <div className="p-8">
                  {/* Subscription Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Package Price</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${subscriptionPrice?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    {subscriptionDate && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Activated On</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {new Date(subscriptionDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {packagePaymentId ? (
                    <div className="mb-8">
                      <ReceiptDownloadButton
                        endpoint={`api/payments/${packagePaymentId}/receipt`}
                        filename="Forex-Navigators-package-receipt.pdf"
                        label="Download package receipt"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                      />
                    </div>
                  ) : null}

                  {/* Features */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Package Features
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentPackage.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 flex-col sm:flex-row">
                    <Link
                      href="/dashboard"
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-center"
                    >
                      Go to Dashboard
                    </Link>
                    <Link
                      href="/subscription/upgrade"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors text-center"
                    >
                      Upgrade Package
                    </Link>
                    <Link
                      href="/select-package"
                      className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-center"
                    >
                      View All Packages
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Package Perks Display - Placed below the subscription card */}
            {subscriptionPackage && (
              <div className="w-full max-w-4xl mx-auto">
                <PackagePerksDisplay showUpgradeButton={true} />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Rocket className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              No Active Subscription
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              You don't have an active subscription. Select a package to get started.
            </p>
            <Link
              href="/select-package"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              View Packages
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
