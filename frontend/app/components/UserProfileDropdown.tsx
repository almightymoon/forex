'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  Share2,
  Wallet,
  ArrowUpRight,
  Package,
  CreditCard,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { buildApiUrl } from '../../utils/api';
import { clearMonthlyFeeAccessLock } from '../../utils/monthlyFeeAccessLock';
import './profile-menu.css';

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

function rolePillClass(role: string): string {
  const r = role.toLowerCase();
  if (r === 'admin') return 'is-admin';
  if (r === 'teacher' || r === 'instructor') return 'is-teacher';
  if (r === 'developer') return 'is-developer';
  return 'is-student';
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'success' | 'danger' | 'highlight';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`profile-menu__item ${tone !== 'default' ? `is-${tone}` : ''}`}
    >
      <span className="profile-menu__item-icon">
        <Icon className="h-4 w-4" />
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function UserProfileDropdown({
  user,
  showNotifications = true,
  showSettings = true,
  className = '',
}: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [subscriptionPackage, setSubscriptionPackage] = useState<string | null>(null);
  const [, setHasUpgradeAvailable] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useLanguage();

  const close = useCallback(() => setIsOpen(false), []);

  const navigate = useCallback(
    (path: string) => {
      close();
      router.push(path);
    },
    [close, router]
  );

  useEffect(() => {
    const fetchSubscriptionAndUpgrade = async () => {
      if (!user || user.role === 'admin' || user.role === 'teacher' || user.role === 'developer' || user.role === 'instructor') {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(buildApiUrl('api/payments/user'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const payments = await response.json();
          const completedPayment = payments.find(
            (p: { type?: string; status?: string; package?: { name?: string } }) =>
              p.type === 'package' && p.status === 'completed'
          );
          if (completedPayment?.package?.name) {
            setSubscriptionPackage(completedPayment.package.name);
          }
        }

        if (user.role === 'student' || !user.role || user.role === '') {
          const upgradeRes = await fetch(buildApiUrl('api/packages/upgrade-options'), {
            headers: { Authorization: `Bearer ${token}` },
          });
          const upgradeJson = await upgradeRes.json().catch(() => ({}));
          setHasUpgradeAvailable(Boolean((upgradeJson as { hasUpgrade?: boolean })?.hasUpgrade));
        } else {
          setHasUpgradeAvailable(false);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setHasUpgradeAvailable(false);
      }
    };

    if (isOpen && user) {
      void fetchSubscriptionAndUpgrade();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  useEffect(() => {
    const handleLanguageChange = () => close();
    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, [close]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearMonthlyFeeAccessLock();
    router.push('/login');
  };

  if (!user) return null;

  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  const initial = user.firstName?.charAt(0) || user.lastName?.charAt(0) || user.email?.charAt(0) || 'U';
  const isStudent = user.role === 'student' || !user.role || user.role === '';
  const balance = user.balance !== undefined ? user.balance : 0;

  const renderAvatar = () =>
    user.profileImage ? (
      <img src={user.profileImage} alt="" />
    ) : (
      <span>{initial.toUpperCase()}</span>
    );

  return (
    <div className={`profile-menu ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`profile-menu__trigger ${isOpen ? 'is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <div className="profile-menu__avatar">{renderAvatar()}</div>
        <div className="profile-menu__identity">
          <p className="profile-menu__name">{displayName}</p>
          <p className="profile-menu__role">{user.role}</p>
        </div>
        <ChevronDown className="profile-menu__chevron" aria-hidden />
      </button>

      {isOpen ? (
        <div className="profile-menu__panel" role="menu">
          <div className="profile-menu__header">
            <div className="profile-menu__header-mesh" aria-hidden />
            <div className="profile-menu__header-main">
              <div className="profile-menu__avatar profile-menu__header-avatar">{renderAvatar()}</div>
              <div className="profile-menu__header-text">
                <p className="profile-menu__header-name">{displayName}</p>
                <p className="profile-menu__header-email">{user.email}</p>
                <span className={`profile-menu__role-pill ${rolePillClass(user.role)}`}>{user.role}</span>
              </div>
            </div>
          </div>

          <div className="profile-menu__balance">
            <span className="profile-menu__balance-label">
              <Wallet className="h-4 w-4 text-emerald-500" />
              Available balance
            </span>
            <span className="profile-menu__balance-value">${balance.toFixed(2)} USDT</span>
          </div>

          <div className="profile-menu__section">
            {isStudent && subscriptionPackage ? (
              <MenuRow
                icon={Package}
                label="My Package"
                tone="highlight"
                onClick={() => navigate('/subscription')}
              />
            ) : null}

            <MenuRow icon={User} label={t('profile')} onClick={() => navigate('/profile')} />

            {showSettings ? (
              <MenuRow icon={Settings} label={t('settings')} onClick={() => navigate('/settings')} />
            ) : null}

            {showNotifications ? (
              <MenuRow icon={Bell} label={t('notifications')} onClick={() => navigate('/notifications')} />
            ) : null}

            <MenuRow icon={Share2} label="Referrals" onClick={() => navigate('/referrals')} />

            {isStudent ? (
              <MenuRow icon={CreditCard} label="Monthly fee" onClick={() => navigate('/monthly-fee')} />
            ) : null}

            <MenuRow icon={Receipt} label="Receipts" onClick={() => navigate('/receipts')} />

            <MenuRow icon={ArrowUpRight} label="Withdraw" tone="success" onClick={() => navigate('/withdrawals')} />
          </div>

          <div className="profile-menu__section profile-menu__section--footer">
            <MenuRow icon={LogOut} label={t('logout')} tone="danger" onClick={handleLogout} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
