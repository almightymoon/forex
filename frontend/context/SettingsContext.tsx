'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PublicSettings {
  platformName: string;
  description: string;
  defaultCurrency: string;
  maintenanceMode: boolean;
}

interface SettingsContextType {
  settings: PublicSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: PublicSettings = {
  platformName: 'Forex Navigators',
  description: 'Premier Trading Education Platform',
  defaultCurrency: 'USD',
  maintenanceMode: false
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {}
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

  const fetchSettings = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/settings/public', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
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

  useEffect(() => {
    fetchSettings();
    
    // Add a fallback timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Settings fetch timeout, using defaults');
        setLoading(false);
      }
    }, 2000); // 2 second timeout
    
    return () => clearTimeout(timeout);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
