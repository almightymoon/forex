import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

interface UseTeacherAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

export function useTeacherAuth(): UseTeacherAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear token cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  const refreshAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        throw new Error('No authentication data found');
      }

      // Parse user data
      const parsedUser = JSON.parse(userData);

      // Verify token by making an API call
      const response = await fetch('/api/teacher/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token expired');
        } else if (response.status === 403) {
          throw new Error('Insufficient permissions');
        }
        throw new Error('Authentication failed');
      }

      setUser(parsedUser);
      setIsAuthenticated(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      setIsAuthenticated(false);
      setUser(null);
      
      // Clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    logout,
    refreshAuth
  };
}

