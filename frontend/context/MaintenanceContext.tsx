'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface MaintenanceContextValue {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  setFromResponse: (isMaintenance: boolean, message?: string) => void;
}

const MaintenanceContext = createContext<MaintenanceContextValue | null>(null);

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  const setFromResponse = useCallback((isMaintenance: boolean, message?: string) => {
    setIsMaintenanceMode(isMaintenance);
    setMaintenanceMessage(message || 'The system is currently under maintenance. Please try again later.');
  }, []);

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, maintenanceMessage, setFromResponse }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenanceContext() {
  const ctx = useContext(MaintenanceContext);
  if (!ctx) {
    return {
      isMaintenanceMode: false,
      maintenanceMessage: '',
      setFromResponse: () => {},
    };
  }
  return ctx;
}
