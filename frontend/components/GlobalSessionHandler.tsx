'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleSessionExpiration } from '../utils/tokenUtils';
import { useMaintenanceContext } from '../context/MaintenanceContext';

/**
 * Global session expiration handler
 * This component should be included in the root layout to handle
 * session expiration and payment verification across the entire application
 */
export function GlobalSessionHandler() {
  const router = useRouter();
  const { setFromResponse } = useMaintenanceContext();

  useEffect(() => {
    // Set up global error handler for 401, 403, and 503 (maintenance) responses
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Only set maintenance when an *authenticated* request gets 503 (so direct visit / login page never triggers it)
      if (response.status === 503) {
        try {
          const data = await response.clone().json();
          if (data.maintenanceMode) {
            const opts = args[1];
            const headers = opts?.headers;
            const hasAuth = headers && (
              typeof (headers as Headers)?.get === 'function'
                ? (headers as Headers).get('Authorization')
                : (headers as Record<string, string>)?.['Authorization'] ?? (headers as Record<string, string>)?.['authorization']
            );
            if (hasAuth) setFromResponse(true, data.message);
            return response;
          }
        } catch {
          // ignore parse error
        }
      }
      
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
          // When user is on /payment they must stay to submit transaction ID – don't redirect (use current path at response time)
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          const isOnPaymentPage = currentPath === '/payment' || (currentPath.startsWith('/payment/') && currentPath !== '/payment-pending');
          
          // Handle package subscription errors
          if (errorData.code === 'PACKAGE_REQUIRED') {
            if (isOnPaymentPage) return response;
            console.log('Global session handler: Package subscription required detected');
            if (errorData.redirectTo) {
              router.push(errorData.redirectTo);
            } else {
              router.push('/select-package');
            }
            return response;
          }
          
          // Handle payment verification errors
          if (errorData.code === 'PAYMENT_PENDING') {
            if (isOnPaymentPage) return response;
            console.log('Global session handler: Payment pending detected');
            if (errorData.redirectTo === '/payment' && errorData.paymentId) {
              const pkg = errorData.packageName ?? '';
              const amt = errorData.amount ?? 0;
              router.push(`/payment?package=${encodeURIComponent(pkg)}&amount=${amt}&paymentId=${errorData.paymentId}`);
            } else if (errorData.redirectTo) {
              router.push(errorData.redirectTo);
            } else {
              router.push('/payment-pending');
            }
            return response;
          }
          
          if (errorData.code === 'PAYMENT_REQUIRED') {
            if (isOnPaymentPage) return response;
            console.log('Global session handler: Payment required detected');
            if (errorData.redirectTo) {
              router.push(errorData.redirectTo);
            } else {
            router.push('/select-package');
            }
            return response;
          }
          
          if (errorData.code === 'VERIFICATION_PENDING') {
            if (isOnPaymentPage) return response;
            console.log('Global session handler: Verification pending detected');
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
  }, [router, setFromResponse]);
  
  return null; // This component doesn't render anything
}
