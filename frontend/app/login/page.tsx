'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildApiUrl } from '@/utils/api';
import { useSettings } from '../../context/SettingsContext';
import DarkModeToggle from '../../components/DarkModeToggle';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, loading: settingsLoading } = useSettings();

  // Prevent hydration mismatch by showing loading state
  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle URL parameters for redirects and error messages
  useEffect(() => {
    const redirectParam = searchParams.get('redirect');
    const errorParam = searchParams.get('error');
    
    if (errorParam) {
      switch (errorParam) {
        case 'not_authenticated':
          setError('Please log in to access this page.');
          break;
        case 'session_expired':
          setError('Your session has expired. Please log in again.');
          break;
        case 'insufficient_permissions':
          setError('You do not have permission to access this page.');
          break;
        case 'invalid_user_data':
          setError('Invalid user data. Please log in again.');
          break;
        case 'auth_check_failed':
          setError('Authentication check failed. Please try again.');
          break;
        default:
          setError('Please log in to continue.');
      }
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl('api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('Login response:', { status: response.status, data });

      if (response.ok) {
        if (data.requiresTwoFactor) {
          // 2FA required - show 2FA modal
          setTempToken(data.tempToken);
          setShow2FA(true);
          setError('');
        } else {
          // Regular login success
          console.log('Setting token in localStorage and cookie');
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Set token in httpOnly cookie for middleware access
          document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
          console.log('Token set successfully');
          
          // Check for redirect parameter first
          const redirectParam = searchParams.get('redirect');
          if (redirectParam) {
            // Verify user has access to the redirect URL
            if (redirectParam.startsWith('/teacher') && (data.user.role === 'teacher' || data.user.role === 'admin')) {
              router.push(redirectParam);
              return;
            } else if (redirectParam.startsWith('/admin') && data.user.role === 'admin') {
              router.push(redirectParam);
              return;
            } else if (redirectParam.startsWith('/dashboard') && data.user.role === 'student') {
              router.push(redirectParam);
              return;
            }
          }
          
          // Route based on user role if no valid redirect
          console.log('Login - User role:', data.user.role);
          console.log('Login - User data:', data.user);
          
          // Determine redirect URL based on role
          let redirectUrl = '/dashboard'; // default
          if (data.user.role === 'teacher') {
            redirectUrl = '/teacher';
          } else if (data.user.role === 'admin') {
            redirectUrl = '/admin';
          }
          
          console.log(`Login - Redirecting to: ${redirectUrl}`);
          console.log('Current location before redirect:', window.location.pathname);
          
          // Add a small delay to ensure token is properly set
          setTimeout(() => {
            console.log('Starting redirect after token setup delay...');
            console.log('Token in localStorage:', localStorage.getItem('token') ? 'EXISTS' : 'MISSING');
            console.log('Redirect URL:', redirectUrl);
            
            // Try multiple redirect methods
            try {
              // Method 1: Next.js router with force refresh
              console.log('Attempting router.push...');
              router.push(redirectUrl);
              console.log('Router.push completed');
              
              // Method 2: Force redirect with window.location.href immediately
              console.log('Using window.location.href as primary method');
              window.location.href = redirectUrl;
              
            } catch (error) {
              console.error('All redirect methods failed:', error);
              // Last resort: direct window.location
              window.location.href = redirectUrl;
            }
          }, 100); // Small delay to ensure token is set
        }
      } else {
        setError(data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl('api/2fa/verify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          tempToken: tempToken,
          twoFactorCode: twoFactorCode
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Set token in httpOnly cookie for middleware access
        document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        
        // Check for redirect parameter first
        const redirectParam = searchParams.get('redirect');
        if (redirectParam) {
          // Verify user has access to the redirect URL
          if (redirectParam.startsWith('/teacher') && (data.user.role === 'teacher' || data.user.role === 'admin')) {
            router.push(redirectParam);
            return;
          } else if (redirectParam.startsWith('/admin') && data.user.role === 'admin') {
            router.push(redirectParam);
            return;
          } else if (redirectParam.startsWith('/dashboard') && data.user.role === 'student') {
            router.push(redirectParam);
            return;
          }
        }
        
        // Route based on user role if no valid redirect
        console.log('2FA Login - User role:', data.user.role);
        console.log('2FA Login - User data:', data.user);
        
        if (data.user.role === 'teacher') {
          console.log('2FA Login - Redirecting to teacher dashboard');
          console.log('2FA Router object:', router);
          try {
          router.push('/teacher');
            console.log('2FA Router.push called for /teacher');
          } catch (error) {
            console.error('2FA Router.push failed, using window.location:', error);
            window.location.href = '/teacher';
          }
        } else if (data.user.role === 'admin') {
          console.log('2FA Login - Redirecting to admin dashboard');
          console.log('2FA Router object:', router);
          try {
          router.push('/admin');
            console.log('2FA Router.push called for /admin');
          } catch (error) {
            console.error('2FA Router.push failed, using window.location:', error);
            window.location.href = '/admin';
          }
        } else {
          console.log('2FA Login - Redirecting to student dashboard');
          console.log('2FA Router object:', router);
          try {
          router.push('/dashboard');
            console.log('2FA Router.push called for /dashboard');
          } catch (error) {
            console.error('2FA Router.push failed, using window.location:', error);
            window.location.href = '/dashboard';
          }
        }
      } else {
        setError(data.message || '2FA verification failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to Home Link and Dark Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 flex items-center justify-between"
        >
          <Link 
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <DarkModeToggle size="sm" />
        </motion.div>

        {/* Login Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-8"
        >
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img 
                src="/all-07.svg" 
                alt="Forex Navigators Logo" 
                className="w-32 h-32 object-contain dark:invert"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Sign in to your Forex Navigators account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link 
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center">
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
            <span className="px-4 text-sm text-gray-500 dark:text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Don't have an account?{' '}
              <Link 
                href="/register"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors"
              >
                Sign up here
              </Link>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              New users pay a one-time $300 registration fee
            </p>
          </div>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </motion.div>
      </div>

      {/* 2FA Modal */}
      {show2FA && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              Two-Factor Authentication
            </h3>
            
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              Enter the 6-digit code from your authenticator app or use a backup code.
            </p>

            <form onSubmit={handle2FASubmit} className="space-y-4">
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                maxLength={6}
                required
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                >
                  <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
                </motion.div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShow2FA(false);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading || twoFactorCode.length < 6}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              Lost your device? Use one of your backup codes instead.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
