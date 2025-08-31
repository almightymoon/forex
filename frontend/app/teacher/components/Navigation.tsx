import React from 'react';
import { 
  BarChart3, 
  BookOpen, 
  Users, 
  Video, 
  TrendingUp, 
  MessageSquare,
  Target,
  FileText,
  Award
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const tabs = [
  { id: 'overview', name: 'Overview', icon: BarChart3 },
  { id: 'courses', name: 'Courses', icon: BookOpen },
  { id: 'students', name: 'Students', icon: Users },
  { id: 'assignments', name: 'Assignments', icon: FileText },
  { id: 'live-sessions', name: 'Live Sessions', icon: Video },
  { id: 'signals', name: 'Trading Signals', icon: Target },
  { id: 'analytics', name: 'Analytics', icon: TrendingUp },
  { id: 'communications', name: 'Communications', icon: MessageSquare },
  { id: 'community', name: 'Community', icon: Users },
  { id: 'certificates', name: 'Certificates', icon: Award }
];

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
