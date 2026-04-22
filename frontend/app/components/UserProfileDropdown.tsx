'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, ChevronDown, Bell, Share2, Wallet, ArrowUpRight, Package, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { buildApiUrl } from '../../utils/api';
import { clearMonthlyFeeAccessLock } from '../../utils/monthlyFeeAccessLock';

interface UserProfileDropdownProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profileImage?: string;
    balance?: number;
  } | null;
  showNotifications?: boolean;
  showSettings?: boolean;
  className?: string;
}

export default function UserProfileDropdown({ 
  user, 
  showNotifications = true, 
  showSettings = true,
  className = ''
}: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [subscriptionPackage, setSubscriptionPackage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useLanguage();

  // Fetch user's subscription package
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user || user.role === 'admin' || user.role === 'teacher' || user.role === 'developer' || user.role === 'instructor') {
        return; // Admin/teacher don't need packages
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

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
          }
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    };

    if (isOpen && user) {
      fetchSubscription();
    }
  }, [isOpen, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      // Force re-render when language changes
      setIsOpen(false);
    };
    
    window.addEventListener('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearMonthlyFeeAccessLock();

    router.push('/login');
  };

  const handleProfileClick = () => {
    // Navigate to profile page
    router.push('/profile');
  };

  const handleSettingsClick = () => {
    // Navigate to settings page
    router.push('/settings');
  };

  const handleReferralsClick = () => {
    // Navigate to referrals page
    setIsOpen(false);
    router.push('/referrals');
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
              {/* Profile Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1.5 sm:space-x-3 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 relative shrink-0"
        >
          {/* Profile Avatar */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            {user.profileImage ? (
              <img 
                src={user.profileImage} 
                alt="Profile" 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-base sm:text-lg">
                {user.firstName?.charAt(0) || user.lastName?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          

        
        {/* User Info */}
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {user.role}
          </p>
        </div>
        
        {/* Chevron Icon */}
        <ChevronDown 
          className={`hidden sm:inline w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {/* User Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 capitalize mt-1">
              {user.role} {t('account')}
            </p>
            {/* Balance Display - Always show */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Balance:</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  ${((user.balance !== undefined ? user.balance : 0)).toFixed(2)} USDT
                </span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Subscription - Only for students with active subscription */}
            {(user.role === 'student' || !user.role || user.role === '') && subscriptionPackage && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/subscription');
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
              >
                <Package className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
                <span>Subscription</span>
              </button>
            )}

            {/* Profile */}
            <button
              onClick={handleProfileClick}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
            >
                              <User className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                {t('profile')}
            </button>

            {/* Settings */}
            {showSettings && (
              <button
                onClick={handleSettingsClick}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
              >
                <Settings className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                {t('settings')}
              </button>
            )}

            {/* Notifications */}
            {showNotifications && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/notifications');
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
              >
                <Bell className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                <span>{t('notifications')}</span>
              </button>
            )}

            {/* Referrals */}
            <button
              onClick={handleReferralsClick}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
            >
              <Share2 className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
              <span>Referrals</span>
            </button>

            {/* Monthly Fee */}
            {(user.role === 'student' || !user.role || user.role === '') && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/monthly-fee');
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
              >
                <CreditCard className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                <span>Monthly Fee</span>
              </button>
            )}

            {/* Withdrawal - Navigate to withdrawals page */}
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/withdrawals');
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-150"
            >
              <ArrowUpRight className="w-4 h-4 mr-3" />
              <span>Withdraw</span>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
            >
                              <LogOut className="w-4 h-4 mr-3" />
                {t('logout')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

