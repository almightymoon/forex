// Simple token verification utility
// TODO: Replace with proper JWT verification when backend is ready

interface User {
  id: string;
  email: string;
  role: string;
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    if (!token) {
      return null;
    }

    // Verify token with the backend using /api/auth/me endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api'}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const userData = await response.json();
    
    if (userData.success && userData.user) {
      return {
        id: userData.user.id || userData.user._id,
        email: userData.user.email,
        role: userData.user.role
      };
    }

    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}
