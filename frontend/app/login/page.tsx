'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildApiUrl } from '@/utils/api';
import { useSettings } from '../../context/SettingsContext';
import { useMaintenanceContext } from '../../context/MaintenanceContext';
import AuthPortalShell, {
  authGhostLinkClass,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from '../../components/auth/AuthPortalShell';

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
  const { setFromResponse } = useMaintenanceContext();

  // Prevent hydration mismatch by showing loading state
  if (settingsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#101012]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
          <p className="text-[14px] font-medium text-white/45">Loading…</p>
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
        credentials: 'include',
      });

      const text = await response.text();
      let data: { token?: string; user?: any; message?: string; requiresTwoFactor?: boolean; tempToken?: string; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError('Invalid response from server. Please try again.');
        setIsLoading(false);
        return;
      }
      console.log('Login response:', { status: response.status, data });

      if (response.status === 423) {
        setError(data.message || 'Account temporarily locked. Try again later.');
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        if (data.requiresTwoFactor) {
          // 2FA required - show 2FA modal
          setTempToken(data.tempToken || '');
          setShow2FA(true);
          setError('');
        } else {
          // Regular login success – persist token (Chrome may block if cookies/storage disabled)
          try {
            if (data.token) localStorage.setItem('token', data.token);
            if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
            const isSecure = typeof window !== 'undefined' && window.location?.protocol === 'https:';
            const cookieOpts = `path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
            if (data.token) document.cookie = `token=${data.token}; ${cookieOpts}`;
            console.log('Token set successfully');
          } catch (storageErr) {
            console.error('Token storage failed (e.g. Chrome blocking cookies/storage):', storageErr);
            setError('Sign-in succeeded but session could not be saved. Allow cookies and site data for this site and try again.');
            setIsLoading(false);
            return;
          }
          
          // For students, check package subscription status
          if (data.user?.role === 'student') {
            try {
              const paymentsResponse = await fetch(buildApiUrl('api/payments/user'), {
                headers: {
                  'Authorization': `Bearer ${data.token}`
                },
                credentials: 'include',
              });

              if (paymentsResponse.ok) {
                const raw = await paymentsResponse.json();
                const payments = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
                const completedPayment = payments.find((p: any) => p.type === 'package' && p.status === 'completed');
                if (completedPayment) {
                  const redirectParam = searchParams.get('redirect');
                  if (redirectParam && redirectParam.startsWith('/dashboard')) {
                    router.push(redirectParam);
                    return;
                  }
                  router.push('/dashboard');
                  return;
                }
                const pendingPayment = payments.find((p: any) => p.type === 'package' && p.status === 'pending');
                if (pendingPayment) {
                  const hasTransactionId = !!(pendingPayment.transactionId && String(pendingPayment.transactionId).trim());
                  if (!hasTransactionId) {
                    const pkg = pendingPayment.package?.name || '';
                    const amt = pendingPayment.finalAmount ?? pendingPayment.amount ?? 0;
                    router.push(`/payment?package=${encodeURIComponent(pkg)}&amount=${amt}&paymentId=${pendingPayment._id}`);
                  } else {
                    router.push('/payment-pending');
                  }
                  return;
                }
                router.push('/select-package');
                return;
              }
              // Payments API failed (e.g. 401) - still let user in
              router.push('/select-package');
              return;
            } catch (error) {
              console.error('Error checking package status:', error);
              router.push('/select-package');
              return;
            }
          } else {
            // Admin or teacher - clear maintenance state so they can use the site
            setFromResponse(false);
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
              }
            }
            
            // Route based on user role if no valid redirect
            console.log('Login - User role:', data.user.role);
            
            // Determine redirect URL based on role
            let redirectUrl = '/dashboard'; // default
            if (data.user.role === 'teacher') {
              redirectUrl = '/teacher';
            } else if (data.user.role === 'admin') {
              redirectUrl = '/admin';
            }
            
            console.log(`Login - Redirecting to: ${redirectUrl}`);
            router.push(redirectUrl);
          }
        }
      } else {
        setError(data.message || data.error || 'Login failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Network error. Please check your connection.');
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
    <>
      <AuthPortalShell
        platformName={settings.platformName}
        headline="Welcome!"
        subhead={`Log in to THEFXNAVIGATORS to continue to ${settings.platformName}.`}
        promo={{
          lines: ['10K+ traders on the desk.', 'Signals · risk · execution — one workspace.'],
          ctaLabel: 'Join now',
          ctaHref: '/register',
        }}
        footer={
          <p className="text-[12px] leading-relaxed text-white/35">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-violet-300/90 underline underline-offset-2 hover:text-violet-200">
              Terms of Service &amp; privacy
            </Link>
            .
          </p>
        }
      >
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          {error && !show2FA ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border border-red-500/25 bg-red-950/50 px-4 py-3 text-[13px] leading-snug text-red-200"
              role="alert"
            >
              {error}
            </motion.div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="auth-email-input" className={authLabelClass}>
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
                <input
                  type="email"
                  id="auth-email-input"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={authInputClass}
                  placeholder="Your email address"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-[13px] font-medium text-white/65">
                  Password
                </label>
                <Link href="/forgot-password" className={authGhostLinkClass}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`${authInputClass} pr-12`}
                  placeholder="Your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/85"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={authPrimaryButtonClass}
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Signing in…
                </span>
              ) : (
                'Log in'
              )}
            </motion.button>
          </form>

          <p className="mt-10 text-center text-[14px] text-white/45">
            Don&apos;t have an account?{' '}
            <Link href="/register" className={`${authGhostLinkClass} font-semibold`}>
              Sign up
            </Link>
          </p>
        </motion.div>
      </AuthPortalShell>

      {show2FA ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-[24px] border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl sm:p-8"
          >
            <h3 className="text-center text-xl font-bold tracking-tight">Two-factor authentication</h3>
            <p className="mt-2 text-center text-[14px] leading-relaxed text-white/55">
              Enter the 6-digit code from your authenticator app or a backup code.
            </p>

            <form onSubmit={handle2FASubmit} className="mt-6 space-y-4">
              <input
                type="text"
                inputMode="numeric"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-2xl border border-white/12 bg-black/40 px-4 py-3.5 text-center font-mono text-xl tracking-[0.35em] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                maxLength={6}
                required
                autoComplete="one-time-code"
              />

              {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-950/50 px-3 py-2 text-center text-[13px] text-red-200">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShow2FA(false);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  className="h-11 flex-1 rounded-full border border-white/15 text-[13px] font-semibold text-white/85 transition-colors hover:bg-white/[0.06]"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || twoFactorCode.length < 6}
                  className="h-11 flex-1 rounded-full bg-white text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isLoading ? 'Verifying…' : 'Verify'}
                </button>
              </div>
            </form>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-white/40">
              Lost your device? Use a backup code instead.
            </p>
          </motion.div>
        </div>
      ) : null}
    </>
  );
}
