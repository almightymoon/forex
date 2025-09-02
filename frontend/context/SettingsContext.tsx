'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PublicSettings {
  platformName: string;
  description: string;
  defaultCurrency: string;
  maintenanceMode: boolean;
  darkMode: boolean;
}

interface SettingsContextType {
  settings: PublicSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
}

const defaultSettings: PublicSettings = {
  platformName: 'Forex Navigators',
  description: 'Premier Trading Education Platform',
  defaultCurrency: 'USD',
  maintenanceMode: false,
  darkMode: false
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {},
  toggleDarkMode: () => {},
  setDarkMode: () => {}
});

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/public', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.warn('Failed to fetch settings, using defaults:', error);
      // Keep default settings on error
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = async () => {
    setLoading(true);
    await fetchSettings();
  };

  // Dark mode management
  const toggleDarkMode = () => {
    const newDarkMode = !settings.darkMode;
    setSettings(prev => ({ ...prev, darkMode: newDarkMode }));
    
    // Update document class and localStorage
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const setDarkMode = (dark: boolean) => {
    setSettings(prev => ({ ...prev, darkMode: dark }));
    
    // Update document class and localStorage
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    setMounted(true);
    
    // Check for saved theme preference or default to system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let initialDarkMode = false;
    if (savedTheme) {
      initialDarkMode = savedTheme === 'dark';
    } else {
      initialDarkMode = systemPrefersDark;
    }
    
    // Update settings with initial dark mode value
    setSettings(prev => ({ ...prev, darkMode: initialDarkMode }));
    
    // Apply initial theme
    if (initialDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    // Only fetch settings once on mount
    if (mounted) {
      fetchSettings();
      
      // Add a fallback timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        if (loading) {
          console.warn('Settings fetch timeout, using defaults');
          setLoading(false);
        }
      }, 2000); // 2 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [mounted]); // Only depend on mounted state

  // Prevent hydration mismatch
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings, toggleDarkMode, setDarkMode }}>
      {children}
    </SettingsContext.Provider>
  );
};
