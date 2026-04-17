'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  ArrowLeft, 
  Check, 
  Sparkles, 
  Zap, 
  Crown,
  TrendingUp,
  Users,
  BookOpen,
  BarChart3,
  Rocket,
  Star,
  Shield,
  Award,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { buildApiUrl } from '@/utils/api';
import DarkModeToggle from '../../components/DarkModeToggle';

const fallbackPackages = [
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
    price: 250, 
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

type PackageType = typeof fallbackPackages[0] & {
  _id?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export default function SelectPackagePage() {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [packages, setPackages] = useState<PackageType[]>(fallbackPackages);
  const [error, setError] = useState('');
  const [loadingPackageName, setLoadingPackageName] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/select-package');
      return;
    }
  }, [router]);

  useEffect(() => {
    // Load packages from backend (admin-managed). Fallback to hardcoded if fetch fails.
    const loadPackages = async () => {
      try {
        const res = await fetch(buildApiUrl('api/packages'), { cache: 'no-store' as any });
        if (!res.ok) return;
        const apiPkgs = await res.json();
        if (!Array.isArray(apiPkgs) || apiPkgs.length === 0) return;

        // Keep the existing UI look by mapping known packages to their visual styles.
        const styleMap = new Map(fallbackPackages.map((p) => [p.name, p]));
        const merged: PackageType[] = apiPkgs
          .filter((p: any) => p && p.isActive !== false)
          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((p: any) => {
            const base = styleMap.get(p.name) || fallbackPackages[0];
            return {
              ...base,
              _id: p._id,
              name: p.name ?? base.name,
              subtitle: p.subtitle ?? base.subtitle,
              price: Number(p.price ?? base.price),
              features: Array.isArray(p.features) && p.features.length ? p.features : base.features,
              image: p.image ?? base.image,
              isActive: p.isActive
            };
          });

        if (merged.length) {
          setPackages(merged);
          // If selected package no longer exists, clear it
          setSelectedPackage((prev) => (prev && merged.some((m) => m.name === prev.name) ? prev : null));
        }
      } catch {
        // keep fallback
      }
    };
    loadPackages();
  }, []);
  const handlePackageSelect = async (pkg: PackageType) => {
    if (!pkg) {
      setError('Please select a package to continue');
      return;
    }

    setLoadingPackageName(pkg.name);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login?redirect=/select-package');
        return;
      }

      // Create payment record
      const response = await fetch(buildApiUrl('api/payments/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          packageName: pkg.name,
          packagePrice: pkg.price,
          paymentMethod: 'binance_wallet'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to payment page with package info
        router.push(`/payment?package=${encodeURIComponent(pkg.name)}&amount=${pkg.price}&paymentId=${data.payment._id}`);
      } else {
        setError(data.message || 'Failed to create payment. Please try again.');
        setLoadingPackageName(null);
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      setLoadingPackageName(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Enhanced Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-green-400/30 to-blue-400/30 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.5, 1],
            rotate: [0, 360],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Floating Sparkles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full opacity-60"
          style={{
            left: `${20 + i * 15}%`,
            top: `${10 + i * 12}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Back Link and Dark Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-center justify-between"
        >
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Dashboard</span>
          </Link>
          <DarkModeToggle size="sm" />
        </motion.div>

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-4 shadow-lg"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Select Your Package
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Choose the perfect package to launch your forex trading journey with expert guidance
          </p>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Package Selection Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {packages.map((pkg, index) => {
            const Icon = pkg.icon;
            const isSelected = selectedPackage?.name === pkg.name;
            
            return (
              <motion.div
                key={pkg.name}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`relative group cursor-pointer ${
                  pkg.highlight ? 'lg:scale-105 lg:-mt-4' : ''
                }`}
                onClick={() => {
                  setSelectedPackage(pkg);
                  setError('');
                }}
              >
                {/* Highlight Badge for Most Popular */}
                {pkg.highlight && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20"
                  >
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      MOST POPULAR
                    </div>
                  </motion.div>
                )}

                {/* Package Card */}
                <div className={`
                  relative h-full rounded-3xl overflow-hidden
                  bg-white dark:bg-gray-800/90
                  border-2 transition-all duration-300
                  ${isSelected 
                    ? pkg.accent === 'emerald' 
                      ? 'border-emerald-500 dark:border-emerald-400 shadow-2xl shadow-emerald-500/50'
                      : pkg.accent === 'blue'
                      ? 'border-blue-500 dark:border-blue-400 shadow-2xl shadow-blue-500/50'
                      : 'border-purple-500 dark:border-purple-400 shadow-2xl shadow-purple-500/50'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                  ${pkg.highlight ? 'ring-4 ring-blue-400/30 dark:ring-blue-500/20' : ''}
                `}>
                  {/* Gradient Background Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${pkg.bgGradient} dark:${pkg.darkBgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  {/* Image Section */}
                  <div className="relative h-48 w-full overflow-hidden">
                    <Image
                      src={pkg.image}
                      alt={pkg.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${pkg.gradient} opacity-20 group-hover:opacity-30 transition-opacity`} />
                    
                    {/* Badge */}
                    <div className="absolute top-4 left-4">
                      <span className={`
                        inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full backdrop-blur-md
                        ${pkg.badge === 'Most Popular'
                          ? 'bg-blue-500/90 text-white'
                          : pkg.badge === 'Elite Program'
                          ? 'bg-purple-500/90 text-white'
                          : 'bg-emerald-500/90 text-white'
                        }
                      `}>
                        {pkg.badge === 'Most Popular' && <Star className="w-3 h-3 fill-current" />}
                        {pkg.badge === 'Elite Program' && <Crown className="w-3 h-3 fill-current" />}
                        {pkg.badge === 'Starter' && <Rocket className="w-3 h-3" />}
                        {pkg.badge}
                      </span>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-4 right-4"
                      >
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                      </motion.div>
                    )}

                    {/* Icon Overlay */}
                    <div className="absolute bottom-4 right-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${pkg.gradient} rounded-2xl flex items-center justify-center shadow-xl backdrop-blur-md bg-white/20`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="relative p-6">
                    {/* Title and Subtitle */}
                    <div className="mb-4">
                      <h3 className={`text-2xl font-bold mb-1 bg-gradient-to-r ${pkg.gradient} bg-clip-text text-transparent`}>
                        {pkg.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{pkg.subtitle}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                          ${pkg.price}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">USDT</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3 mb-6">
                      {pkg.features.map((feature, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 + idx * 0.05 }}
                          className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${pkg.gradient} flex items-center justify-center mt-0.5`}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span>{feature}</span>
                        </motion.li>
                      ))}
                    </ul>

                    {/* Select Button */}
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePackageSelect(pkg);
                      }}
                      disabled={loadingPackageName !== null}
                      whileHover={loadingPackageName === null ? { scale: 1.05 } : {}}
                      whileTap={loadingPackageName === null ? { scale: 0.95 } : {}}
                      className={`
                        w-full py-3 px-4 rounded-xl font-semibold text-center transition-all inline-flex items-center justify-center gap-2
                        ${loadingPackageName === pkg.name
                          ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-wait'
                          : isSelected
                          ? pkg.accent === 'emerald'
                            ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-lg'
                            : pkg.accent === 'blue'
                            ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-lg'
                            : 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white shadow-lg'
                          : `bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${
                            pkg.accent === 'emerald'
                              ? 'group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:via-green-500 group-hover:to-teal-500 group-hover:text-white'
                              : pkg.accent === 'blue'
                              ? 'group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:via-indigo-500 group-hover:to-purple-500 group-hover:text-white'
                              : 'group-hover:bg-gradient-to-r group-hover:from-purple-500 group-hover:via-pink-500 group-hover:to-rose-500 group-hover:text-white'
                            }`
                        }
                      `}
                    >
                      {loadingPackageName === pkg.name ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" aria-hidden />
                          <span>Loading…</span>
                        </>
                      ) : isSelected ? (
                        'Selected ✓'
                      ) : (
                        'Select Package'
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
