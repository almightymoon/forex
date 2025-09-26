'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from './components/LoadingSpinner';

interface User {
  _id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Check if we're on the client side
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
          console.log('No token or user data found, redirecting to login');
          router.push('/login?redirect=/teacher&error=not_authenticated');
          return;
        }

        // Parse user data
        let parsedUser: User;
        try {
          parsedUser = JSON.parse(userData);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Clear token cookie
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          router.push('/login?redirect=/teacher&error=invalid_user_data');
          return;
        }

        // Check if user has teacher or admin role
        if (parsedUser.role !== 'teacher' && parsedUser.role !== 'admin') {
          console.log('User does not have teacher/admin role:', parsedUser.role);
          // Redirect to default 404 page
          router.push('/404');
          return;
        }

        // Skip API verification in layout to avoid redirect loops
        // The middleware already handles token validation
        console.log('Teacher layout: User authenticated, allowing access');

        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication check error:', error);
        router.push('/login?redirect=/teacher&error=auth_check_failed');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, [router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show error if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-red-600 dark:text-red-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {children}
    </div>
  );
}
