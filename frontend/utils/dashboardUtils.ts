/**
 * Utility function to determine the correct dashboard route based on user role
 * @param userRole - The user's role (admin, teacher, student)
 * @returns The appropriate dashboard route
 */
export const getDashboardRoute = (userRole: string): string => {
  switch (userRole?.toLowerCase()) {
    case 'admin':
      return '/admin';
    case 'teacher':
      return '/teacher';
    case 'student':
    default:
      return '/dashboard';
  }
};

/**
 * Utility function to get user role from localStorage token
 * @returns The user's role or null if not found
 */
export const getUserRole = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};
