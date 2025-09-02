import React from 'react';
import { Bell, Settings } from 'lucide-react';
import UserProfileDropdown from '../../components/UserProfileDropdown';
import DarkModeToggle from '../../../components/DarkModeToggle';

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
  return (
    <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-gray-600 dark:text-gray-300">{subtitle}</p>
          </div>
          <div className="flex items-center space-x-4">
            <DarkModeToggle size="sm" />
            <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <Settings className="w-5 h-5" />
            </button>
            
            {/* User Profile Dropdown */}
            <UserProfileDropdown user={user} />
          </div>
        </div>
      </div>
    </div>
  );
}
