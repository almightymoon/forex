'use client';

import { useEffect } from 'react';
import { handleSessionExpiration } from '../utils/tokenUtils';

/**
 * Global session expiration handler
 * This component should be included in the root layout to handle
 * session expiration across the entire application
 */
export function GlobalSessionHandler() {
  useEffect(() => {
    // Set up global error handler for 401 responses
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Check for 401 responses that indicate session expiration
      if (response.status === 401) {
        try {
          const errorData = await response.clone().json();
          if (errorData.sessionExpired && errorData.redirectTo) {
            console.log('Global session handler: Session expired detected');
            handleSessionExpiration(errorData.message || 'Session expired');
            return response;
          }
        } catch (jsonError) {
          // If we can't parse JSON, continue normally
        }
      }
      
      return response;
    };
    
    // Set up global unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Session expired') || 
          event.reason?.message?.includes('Authentication failed')) {
        console.log('Global session handler: Unhandled rejection with session error');
        handleSessionExpiration('Session expired');
        event.preventDefault();
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Cleanup
    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  return null; // This component doesn't render anything
}
