'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from './components/LoadingSpinner';
import '../admin/components/admin.css';
import './components/teacher.css';

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
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Set client flag to prevent hydration mismatch
    setIsClient(true);
    
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

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="admin-shell teacher-shell min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-[var(--admin-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="admin-shell teacher-shell min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-[var(--admin-muted)]">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="admin-shell teacher-shell min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
          <p className="mt-4 text-red-600 dark:text-red-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
