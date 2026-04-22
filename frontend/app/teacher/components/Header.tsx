'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings, X, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UserProfileDropdown from '../../components/UserProfileDropdown';
import DarkModeToggle from '../../../components/DarkModeToggle';
import DeveloperRoleNav from '../../../components/DeveloperRoleNav';

interface HeaderProps {
  title: string;
  subtitle: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profileImage?: string;
  } | null;
}

export default function Header({ title, subtitle, user }: HeaderProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSettingsClick = () => {
    router.push('/settings');
    setShowSettings(false);
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowSettings(false);
  };

  const handleSettingsButtonClick = () => {
    setShowSettings(!showSettings);
    setShowNotifications(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 items-center py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-gray-600 dark:text-gray-300">{subtitle}</p>
          </div>
          <div className="flex justify-center">
            <DeveloperRoleNav />
          </div>
          <div className="flex items-center space-x-4 relative justify-end">
            <DarkModeToggle size="sm" />
            
            {/* Notifications Button */}
            <div ref={notificationRef} className="relative">
              <button 
                onClick={handleNotificationClick}
                className={`p-2 rounded-lg transition-colors ${
                  showNotifications 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Bell className="w-5 h-5" />
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                      No new notifications
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <div ref={settingsRef} className="relative">
              <button 
                onClick={handleSettingsButtonClick}
                className={`p-2 rounded-lg transition-colors ${
                  showSettings 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-2 border-blue-500 dark:border-blue-400' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {/* Settings Dropdown */}
              {showSettings && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-2">
                    <button
                      onClick={handleSettingsClick}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        router.push('/profile');
                        setShowSettings(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <User className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                      Profile Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* User Profile Dropdown */}
            <UserProfileDropdown user={user} />
          </div>
        </div>
      </div>
    </div>
  );
}
