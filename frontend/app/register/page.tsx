'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  TrendingUp, 
  ArrowLeft, 
  CreditCard, 
  Gift,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buildApiUrl } from '@/utils/api';
import { useSettings } from '../../context/SettingsContext';
import DarkModeToggle from '../../components/DarkModeToggle';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: 'Pakistan',
    paymentMethod: 'credit_card',
  });
  const [promoCode, setPromoCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPromoValid, setIsPromoValid] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const router = useRouter();
  const { settings } = useSettings();

  const signupFee = 30;
  const finalFee = signupFee - promoDiscount;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;

    try {
      const response = await fetch(buildApiUrl('api/promos/validate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: promoCode,
          orderAmount: signupFee,
          orderType: 'signup'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsPromoValid(true);
        setPromoDiscount(data.promo.discount || 0);
        setSuccess(`Promo code applied! You save $${data.promo.discount}`);
        setError('');
      } else {
        setIsPromoValid(false);
        setPromoDiscount(0);
        setError(data.message || 'Invalid promo code');
        setSuccess('');
      }
    } catch (err) {
      setError('Error validating promo code');
      setIsPromoValid(false);
      setPromoDiscount(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl('api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          promoCode: promoCode || undefined,
          signupFee: finalFee,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresPayment) {
          // Redirect to payment page or handle payment flow
          setSuccess('Registration successful! Redirecting to payment...');
          setTimeout(() => {
            // Handle payment redirect based on payment method
            if (formData.paymentMethod === 'credit_card') {
              // Redirect to Stripe checkout
              window.location.href = data.paymentUrl;
            } else {
              // Handle local payment methods
              router.push('/payment/local');
            }
          }, 2000);
        } else {
          // Free registration with promo code
          setSuccess('Registration successful! Redirecting to login...');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      } else {
        setError(data.message || 'Registration failed. Please try again.');
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

      <div className="w-full max-w-lg relative z-10">
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

        {/* Registration Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-8"
        >
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <motion.div 
              className="inline-flex items-center justify-center mb-4"
              // whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <img 
                src="/all-07.png" 
                alt="Forex Navigators Logo" 
                className="w-36 h-36 object-contain"
              />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Join Forex Navigators
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Start your forex trading journey today
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm flex items-center"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-center"
            >
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </motion.div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="First name"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>

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

            {/* Password Fields */}
            <div className="grid grid-cols-2 gap-4">
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
                    placeholder="Password"
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
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Contact Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Country
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
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

            {/* Promo Code Section */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center mb-3">
                <Gift className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Have a Promo Code?</h3>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={validatePromoCode}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Apply
                </button>
              </div>
              {isPromoValid && (
                <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Promo code applied! Save ${promoDiscount}
                </div>
              )}
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Payment Method
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-700">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                    checked={formData.paymentMethod === 'credit_card'}
                    onChange={handleChange}
                    className="mr-3 text-blue-600"
                  />
                  <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900 dark:text-white">Credit Card (International)</span>
                </label>
                <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-700">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="easypaisa"
                    checked={formData.paymentMethod === 'easypaisa'}
                    onChange={handleChange}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">Easypaisa (Pakistan)</span>
                </label>
                <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-700">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="jazz_cash"
                    checked={formData.paymentMethod === 'jazz_cash'}
                    onChange={handleChange}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">Jazz Cash (Pakistan)</span>
                </label>
              </div>
            </div>

            {/* Fee Display */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">Registration Fee:</span>
                <span className="font-medium text-gray-900 dark:text-white">${signupFee}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400">
                  <span>Promo Discount:</span>
                  <span>-${promoDiscount}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-lg text-gray-900 dark:text-white">${finalFee}</span>
                </div>
              </div>
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
                  Creating Account...
                </div>
              ) : (
                `Create Account - $${finalFee}`
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link 
                href="/login"
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-center text-sm text-gray-500"
        >
          <p>By creating an account, you agree to our Terms of Service and Privacy Policy</p>
          <p className="mt-2">
            <Link href="/dashboard" className="text-green-600 hover:text-green-700 font-medium">
              View Dashboard Demo
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
