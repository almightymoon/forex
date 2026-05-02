import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  BookOpen, 
  Users, 
  Video, 
  TrendingUp, 
  MessageSquare,
  Target,
  FileText,
  Award,
  ChevronLeft,
  ChevronRight,
  LineChart
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const tabs = [
  { id: 'overview', name: 'Overview', icon: BarChart3 },
  { id: 'students', name: 'Students', icon: Users },
  { id: 'courses', name: 'Courses', icon: BookOpen },
  { id: 'assignments', name: 'Assignments', icon: FileText },
  { id: 'live-sessions', name: 'Live Sessions', icon: Video },
  { id: 'signals', name: 'Trading Signals', icon: Target },
  { id: 'analytics', name: 'Analytics', icon: TrendingUp },
  { id: 'communications', name: 'Communications', icon: MessageSquare },
  { id: 'community', name: 'Community', icon: Users },
  { id: 'landing-progress', name: 'Landing progress', icon: LineChart },
  { id: 'certificates', name: 'Certificates', icon: Award }
];

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const checkScrollability = () => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    checkScrollability();
    const nav = navRef.current;
    if (nav) {
      nav.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        nav.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, []);

  const scrollLeft = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Navigation with scroll controls */}
        <div className="relative">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-md hover:shadow-lg transition-shadow"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          
          {/* Scroll Right Button */}
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-md hover:shadow-lg transition-shadow"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}

          <nav 
            ref={navRef}
            className="flex space-x-8 overflow-x-auto scrollbar-hide py-2"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Mobile Navigation - Dropdown for smaller screens */}
        <div className="md:hidden mt-2">
          <select
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
}
