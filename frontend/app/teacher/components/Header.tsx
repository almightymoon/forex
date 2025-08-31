import React from 'react';
import { Bell, Settings } from 'lucide-react';
import UserProfileDropdown from '../../components/UserProfileDropdown';

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
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600">{subtitle}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
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
