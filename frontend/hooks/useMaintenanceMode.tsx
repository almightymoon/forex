'use client';

import { useState, useEffect } from 'react';

interface MaintenanceError {
  error: string;
  message: string;
  maintenanceMode: boolean;
}

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  const checkMaintenanceMode = (error: any) => {
    if (error && error.maintenanceMode === true) {
      setIsMaintenanceMode(true);
      setMaintenanceMessage(error.message || 'The system is currently under maintenance.');
      return true;
    }
    return false;
  };

  const resetMaintenanceMode = () => {
    setIsMaintenanceMode(false);
    setMaintenanceMessage('');
  };

  return {
    isMaintenanceMode,
    maintenanceMessage,
    checkMaintenanceMode,
    resetMaintenanceMode
  };
};

// Helper function to handle fetch requests with maintenance mode check
export const fetchWithMaintenanceCheck = async (
  url: string, 
  options: RequestInit = {}
): Promise<{ data?: any; error?: MaintenanceError; isMaintenanceMode?: boolean }> => {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      // Check if it's a maintenance mode error
      if (response.status === 503 && data.maintenanceMode) {
        return {
          error: data,
          isMaintenanceMode: true
        };
      }
      
      // Other errors
      return {
        error: data
      };
    }

    return { data };
  } catch (error) {
    return {
      error: {
        error: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        maintenanceMode: false
      }
    };
  }
};

export default useMaintenanceMode;
