'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface DarkModeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function DarkModeToggle({ className = '', size = 'md' }: DarkModeToggleProps) {
  const { settings, toggleDarkMode } = useSettings();
  const isDarkMode = settings.darkMode;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <motion.button
      onClick={toggleDarkMode}
      className={`relative ${sizeClasses[size]} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center transition-colors duration-300 hover:bg-gray-300 dark:hover:bg-gray-600 ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDarkMode ? 180 : 0 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        {isDarkMode ? (
          <Moon className={`${iconSizes[size]} text-yellow-400`} />
        ) : (
          <Sun className={`${iconSizes[size]} text-orange-500`} />
        )}
      </motion.div>
      
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 dark:opacity-20"
        initial={false}
        animate={{ opacity: isDarkMode ? 0.2 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}
