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
      const response = await fetch('http://localhost:4000/api/settings/public');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
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
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
