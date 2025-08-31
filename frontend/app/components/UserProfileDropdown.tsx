'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, ChevronDown, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';

interface UserProfileDropdownProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profileImage?: string;
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useLanguage();

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
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page
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

  if (!user) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
              {/* Profile Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 relative"
        >
          {/* Profile Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            {user.profileImage ? (
              <img 
                src={user.profileImage} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-lg">
                {user.firstName?.charAt(0) || user.lastName?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          

        
        {/* User Info */}
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-gray-900">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {user.role}
          </p>
        </div>
        
        {/* Chevron Icon */}
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
                              <p className="text-xs text-gray-400 capitalize mt-1">
                    {user.role} {t('account')}
                  </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Profile */}
            <button
              onClick={handleProfileClick}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
                              <User className="w-4 h-4 mr-3 text-gray-400" />
                {t('profile')}
            </button>

            {/* Settings */}
            {showSettings && (
              <button
                onClick={handleSettingsClick}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
              >
                <Settings className="w-4 h-4 mr-3 text-gray-400" />
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
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
              >
                <Bell className="w-4 h-4 mr-3 text-gray-400" />
                <span>{t('notifications')}</span>
              </button>
            )}

            {/* Divider */}
            <div className="border-t border-gray-100 my-1"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
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

