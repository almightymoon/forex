'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle, AlertCircle, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildApiUrl } from '@/utils/api';
import {
  normalizeReferralCode,
  sanitizeRegisterForm,
  trimAuthFieldByName,
} from '@/utils/authFormSanitize';
import { useSettings } from '../../context/SettingsContext';
import AuthPortalShell, {
  authGhostLinkClass,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
  authSelectClass,
} from '../../components/auth/AuthPortalShell';

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: 'Pakistan',
  });
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { settings, loading: settingsLoading } = useSettings();

  // Check for referral code in URL
  useEffect(() => {
    const refCode = searchParams?.get('ref');
    if (refCode) {
      setReferralCode(normalizeReferralCode(refCode));
    }
  }, [searchParams]);

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
  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const trimmed = trimAuthFieldByName(name, value);
    if (trimmed !== value) {
      setFormData((prev) => ({ ...prev, [name]: trimmed }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleaned = sanitizeRegisterForm(formData);
    const cleanedReferral = referralCode ? normalizeReferralCode(referralCode) : '';
    setFormData(cleaned);
    if (cleanedReferral !== referralCode) setReferralCode(cleanedReferral);

    if (!cleaned.firstName || !cleaned.lastName) {
      setError('First and last name are required');
      return;
    }
    if (!cleaned.email) {
      setError('Email is required');
      return;
    }

    if (cleaned.password !== cleaned.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (cleaned.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { confirmPassword, ...registrationData } = cleaned;

      const requestBody = {
        ...registrationData,
        referralCode: cleanedReferral || undefined,
      };
      
      // Remove undefined values to avoid sending them
      Object.keys(requestBody).forEach(key => {
        if (requestBody[key as keyof typeof requestBody] === undefined) {
          delete requestBody[key as keyof typeof requestBody];
        }
      });
      
      console.log('Registration request body:', JSON.stringify(requestBody, null, 2));
      console.log('Registration URL:', buildApiUrl('api/auth/register'));
      
      const registerResponse = await fetch(buildApiUrl('api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const registerData = await registerResponse.json();

      if (registerResponse.ok) {
        // Store token
        localStorage.setItem('token', registerData.token);
        localStorage.setItem('user', JSON.stringify(registerData.user));
        document.cookie = `token=${registerData.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        
        // Redirect to package selection page
        setSuccess('Registration successful! Redirecting to package selection...');
        setTimeout(() => {
          router.push('/select-package');
        }, 1500);
      } else {
        // Show detailed error messages from validation
        let errorMessage = registerData.message || 'Registration failed. Please try again.';
        
        if (registerData.details && Array.isArray(registerData.details)) {
          // Format validation errors
          const errorDetails = registerData.details.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err.msg) return err.msg;
            if (err.message) return err.message;
            return JSON.stringify(err);
          }).join(', ');
          
          if (errorDetails) {
            errorMessage = errorDetails;
          }
        }
        
        setError(errorMessage);
        console.error('Registration error:', registerData);
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <AuthPortalShell
      platformName={settings.platformName}
      headline="Create account"
      subhead={`Join ${settings.platformName} — packages, desk tools, and mentorship in one place.`}
      promo={{
        lines: ['Structured access to signals & playbooks.', 'Pick your package after signup — no noise.'],
        ctaLabel: 'View packages',
        ctaHref: '/#packages',
      }}
      maxWidth="lg"
      footer={
        <p className="text-[12px] leading-relaxed text-white/35">
          By registering, you agree to our{' '}
          <Link href="/terms" className="text-violet-300/90 underline underline-offset-2 hover:text-violet-200">
            Terms of Service &amp; privacy
          </Link>
          .
        </p>
      }
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-950/40 px-4 py-3 text-[13px] leading-snug text-emerald-100"
            role="status"
          >
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
            {success}
          </motion.div>
        ) : null}

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-950/50 px-4 py-3 text-[13px] leading-snug text-red-200"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden />
            {error}
          </motion.div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={authLabelClass}>
                First name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={authInputClass}
                  placeholder="Alex"
                  autoComplete="given-name"
                />
              </div>
            </div>
            <div>
              <label htmlFor="lastName" className={authLabelClass}>
                Last name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={authInputClass}
                  placeholder="Rivera"
                  autoComplete="family-name"
                />
              </div>
            </div>
          </div>

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
                onBlur={handleBlur}
                required
                className={authInputClass}
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className={authLabelClass}>
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={`${authInputClass} pr-12`}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
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
            <div>
              <label htmlFor="confirmPassword" className={authLabelClass}>
                Confirm password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={`${authInputClass} pr-12`}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/85"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className={authLabelClass}>
                Phone <span className="font-normal text-black/35 dark:text-white/35">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={authInputClass}
                  placeholder="+1 …"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>
            </div>
            <div>
              <label htmlFor="country" className={authLabelClass}>
                Country
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className={authSelectClass}
              >
                <option value="Pakistan">Pakistan</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-violet-300/70" aria-hidden />
              <h3 className="text-[13px] font-semibold tracking-wide text-white">
                Referral code <span className="font-normal text-white/45">(optional)</span>
              </h3>
            </div>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              onBlur={(e) => setReferralCode(normalizeReferralCode(e.target.value))}
              placeholder="CODE"
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[13px] font-medium uppercase tracking-wider text-white placeholder:text-white/30 focus:border-violet-400/35 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-white/45">
              Supports whoever referred you — leave blank if you don&apos;t have one.
            </p>
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
                Creating account…
              </span>
            ) : (
              'Create account'
            )}
          </motion.button>
        </form>

        <p className="mt-10 text-center text-[14px] text-white/45">
          Already have an account?{' '}
          <Link href="/login" className={`${authGhostLinkClass} font-semibold`}>
            Log in
          </Link>
        </p>
      </motion.div>
    </AuthPortalShell>
  );
}
