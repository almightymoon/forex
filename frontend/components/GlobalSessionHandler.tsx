'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleSessionExpiration } from '../utils/tokenUtils';

/**
 * Global session expiration handler
 * This component should be included in the root layout to handle
 * session expiration and payment verification across the entire application
 */
export function GlobalSessionHandler() {
  const router = useRouter();

  useEffect(() => {
    // Set up global error handler for 401 and 403 responses
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
      
      // Check for 403 responses that indicate payment verification required
      if (response.status === 403) {
        try {
          const errorData = await response.clone().json();
          
          // Handle package subscription errors
          if (errorData.code === 'PACKAGE_REQUIRED') {
            console.log('Global session handler: Package subscription required detected');
            // Redirect to package selection
            if (errorData.redirectTo) {
              router.push(errorData.redirectTo);
            } else {
              router.push('/select-package');
            }
            return response;
          }
          
          // Handle payment verification errors
          if (errorData.code === 'PAYMENT_PENDING') {
            console.log('Global session handler: Payment pending detected');
            // Redirect to payment pending page
            if (errorData.redirectTo) {
              router.push(errorData.redirectTo);
            } else {
              router.push('/payment-pending');
            }
            return response;
          }
          
          if (errorData.code === 'PAYMENT_REQUIRED') {
            console.log('Global session handler: Payment required detected');
            // Redirect to package selection
            if (errorData.redirectTo) {
              router.push(errorData.redirectTo);
            } else {
              router.push('/select-package');
            }
            return response;
          }
          
          if (errorData.code === 'VERIFICATION_PENDING') {
            console.log('Global session handler: Verification pending detected');
            // Redirect to payment pending page
            router.push('/payment-pending');
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
  }, [router]);
  
  return null; // This component doesn't render anything
}
