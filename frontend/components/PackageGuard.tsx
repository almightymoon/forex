'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { buildApiUrl } from '../utils/api';
import CoolLoader from './CoolLoader';
import { useMaintenanceContext } from '../context/MaintenanceContext';

interface PackageGuardProps {
  children: React.ReactNode;
  allowedPaths?: string[]; // Paths that don't require package (e.g., /select-package, /payment)
}

export default function PackageGuard({ children, allowedPaths = [] }: PackageGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setFromResponse } = useMaintenanceContext();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // Skip check for allowed paths
    if (allowedPaths.some(path => pathname?.startsWith(path))) {
      setHasAccess(true);
      setIsChecking(false);
      return;
    }

    // Skip check for admin/teacher routes (they have their own guards)
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/teacher')) {
      setHasAccess(true);
      setIsChecking(false);
      return;
    }

    const checkPackageAccess = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Try to access a protected API endpoint to check package status
        const response = await fetch(buildApiUrl('api/courses'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 503) {
          try {
            const data = await response.json();
            if (data.maintenanceMode) {
              setFromResponse(true, data.message);
              setHasAccess(true);
              setIsChecking(false);
              return;
            }
          } catch {
            // ignore parse error
          }
        }

        if (response.status === 403) {
          const data = await response.json();
          
          if (data.code === 'PACKAGE_REQUIRED') {
            router.push('/select-package');
            return;
          } else if (data.code === 'PAYMENT_PENDING') {
            router.push('/payment-pending');
            return;
          }
        }

        if (!response.ok && response.status !== 403) {
          // Other errors - might be auth issue
          if (response.status === 401) {
            router.push('/login');
            return;
          }
        }

        // If we get here, user has access (or it's a different error we'll handle)
        setHasAccess(true);
      } catch (error) {
        console.error('Error checking package access:', error);
        // On error, allow access (fail open) - the backend will handle it
        setHasAccess(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkPackageAccess();
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <CoolLoader />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <CoolLoader />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
