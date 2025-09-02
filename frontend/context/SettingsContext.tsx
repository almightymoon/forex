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
  darkMode: false // Default to light mode
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: false,
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
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fetchSettings = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch('/api/settings/public', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.warn('Failed to fetch settings, using defaults:', error);
      // Keep default settings on error
    }
  };

  const refreshSettings = async () => {
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
    
    // Check for saved theme preference, default to light mode
    const savedTheme = localStorage.getItem('theme');
    
    let initialDarkMode = false; // Default to light mode
    if (savedTheme === 'dark') {
      initialDarkMode = true;
    } else if (savedTheme === 'light') {
      initialDarkMode = false;
    } else {
      // No saved preference, default to light mode
      initialDarkMode = false;
      localStorage.setItem('theme', 'light');
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
    // Fetch settings in background after mount with a delay
    if (mounted) {
      // Delay the fetch to prioritize initial render
      const timeoutId = setTimeout(() => {
        fetchSettings();
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timeoutId);
    }
  }, [mounted]);

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
