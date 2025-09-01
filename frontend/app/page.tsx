'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';
import { 
  TrendingUp, 
  BookOpen, 
  Users, 
  Video, 
  Shield, 
  Globe,
  ArrowRight,
  CheckCircle,
  Star,
  Play,
  Zap,
  Target,
  Award,
  Clock,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const { settings, loading } = useSettings();

  useEffect(() => {
    // Add a small delay to ensure proper hydration
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loading, settings]);

  const features = [
    {
      icon: <BookOpen className="w-10 h-10" />,
      title: 'Comprehensive Courses',
      description: 'Learn trading from beginner to advanced levels with structured courses.',
      gradient: 'from-blue-500 to-cyan-500',
      delay: 0.1
    },
    {
      icon: <Video className="w-10 h-10" />,
      title: 'Live Trading Sessions',
      description: 'Join real-time webinars and live trading sessions with professional traders.',
      gradient: 'from-purple-500 to-pink-500',
      delay: 0.2
    },
    {
      icon: <TrendingUp className="w-10 h-10" />,
      title: 'Trading Signals',
      description: 'Get real-time buy/sell signals and market analysis from experienced traders.',
      gradient: 'from-green-500 to-emerald-500',
      delay: 0.3
    },
    {
      icon: <Users className="w-10 h-10" />,
      title: 'Community Learning',
      description: 'Connect with fellow traders and share insights in our vibrant community.',
      gradient: 'from-orange-500 to-red-500',
      delay: 0.4
    },
    {
      icon: <Shield className="w-10 h-10" />,
      title: 'Risk Management',
      description: 'Learn proper risk management techniques to protect your capital.',
      gradient: 'from-indigo-500 to-purple-500',
      delay: 0.5
    },
    {
      icon: <Globe className="w-10 h-10" />,
      title: 'Global Markets',
      description: 'Access courses on Forex, Crypto, Stocks, and Commodities trading.',
      gradient: 'from-teal-500 to-blue-500',
      delay: 0.6
    }
  ];

  const stats = [
    { number: '500+', label: 'Active Students', icon: <Users className="w-8 h-8" />, color: 'text-blue-600' },
    { number: '2', label: ' Courses', icon: <BookOpen className="w-8 h-8" />, color: 'text-green-600' },
    { number: '3', label: 'Expert Instructors', icon: <Award className="w-8 h-8" />, color: 'text-purple-600' },
    { number: '95%', label: 'Success Rate', icon: <Target className="w-8 h-8" />, color: 'text-orange-600' }
  ];

  const testimonials = [
    {
      name: 'Ahmed Khan',
      role: 'Forex Trader',
      content: 'This platform transformed my trading journey. The courses are practical and the instructors are world-class.',
      rating: 5,
      avatar: 'AK',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      name: 'Sarah Ahmed',
      role: 'Crypto Investor',
      content: 'The live sessions and trading signals have helped me make better investment decisions.',
      rating: 5,
      avatar: 'SA',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      name: 'Muhammad Ali',
      role: 'Stock Trader',
      content: 'Excellent learning resources and a supportive community. Highly recommended!',
      rating: 5,
      avatar: 'MA',
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  const benefits = [
    { icon: <Zap className="w-6 h-6" />, text: 'Learn at your own pace' },
    { icon: <Clock className="w-6 h-6" />, text: '24/7 access to courses' },
    { icon: <DollarSign className="w-6 h-6" />, text: 'Money-back guarantee' },
    { icon: <CheckCircle className="w-6 h-6" />, text: 'Certificate upon completion' }
  ];

  // Show loading state while settings are being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
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

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              className="flex items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
                              <img 
                  src="/all-07.png" 
                  alt={`${settings.platformName} Logo`} 
                  className="w-20 h-20 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {settings.platformName}
              </span>
            </motion.div>
            
            <motion.div 
              className="hidden md:flex items-center space-x-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Features</a>
              <a href="#courses" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Courses</a>
              <a href="#about" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">About</a>
              <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Contact</a>
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link 
                href="/login"
                className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
              >
                Login
              </Link>
         
              <Link 
                href="/register"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ duration: 1 }}
            className="relative z-10"
          >
            <motion.div
              className="inline-block mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                <img 
                  src="/all-07.png" 
                  alt="Logo" 
                  className="w-6 h-6 mr-2 object-contain"
                />
                Join 10,000+ Successful Traders
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Master the Art of
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                Forex Trading
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Join thousands of successful traders who learned from expert instructors. 
              Access comprehensive courses, live sessions, and real-time trading signals.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  href="/register"
                  className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Start Learning Today
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <button className="inline-flex items-center border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-lg">
                  <Play className="mr-2 w-5 h-5" />
                  Watch Demo
                </button>
              </motion.div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-center text-sm text-gray-600"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                >
                  <span className="text-blue-600 mr-2">{benefit.icon}</span>
                  {benefit.text}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center group"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 mb-4 group-hover:from-blue-200 group-hover:to-purple-200 transition-all"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <span className={stat.color}>{stat.icon}</span>
                </motion.div>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Choose{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {settings.platformName}?
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              We provide everything you need to become a successful trader with our comprehensive platform
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: feature.delay }}
                className="group"
              >
                <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-white/20">
                  <motion.div 
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} text-white mb-6 group-hover:scale-110 transition-transform`}
                    whileHover={{ rotate: 5 }}
                  >
                    {feature.icon}
                  </motion.div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <motion.div
                    className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ opacity: 0, x: -20 }}
                    whileHover={{ opacity: 1, x: 0 }}
                  >
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Start Your Trading Journey?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
              Join our platform today and get access to premium trading education resources that will transform your financial future
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  href="/register"
                  className="inline-flex items-center bg-white text-blue-600 px-10 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all transform hover:-translate-y-1 shadow-2xl"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <button className="inline-flex items-center border-2 border-white text-white px-10 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all transform hover:-translate-y-1">
                  Learn More
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              What Our Students Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Join thousands of satisfied students who transformed their trading skills and achieved financial success
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="group"
              >
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${testimonial.gradient} flex items-center justify-center text-white font-bold text-lg mr-4`}>
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-gray-500 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  <p className="text-gray-600 mb-4 leading-relaxed">"{testimonial.content}"</p>
                  
                  <motion.div
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ opacity: 0, x: -20 }}
                    whileHover={{ opacity: 1, x: 0 }}
                  >
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
                          <motion.div 
              className="flex items-center mb-6"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <img 
                  src="/all-07.png" 
                  alt={`${settings.platformName} Logo`} 
                  className="w-8 h-8 object-contain"
                />
                <motion.div
                  className="absolute inset-0 bg-blue-400 rounded-full opacity-20"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {settings.platformName}
              </span>
            </motion.div>
              <p className="text-gray-400 leading-relaxed">
                Empowering traders with comprehensive education and real-time insights to achieve financial success.
              </p>
            </div>
            
            {[
              {
                title: 'Platform',
                links: ['Courses', 'Live Sessions', 'Trading Signals', 'Community']
              },
              {
                title: 'Support',
                links: ['Help Center', 'Contact Us', 'FAQ', 'Terms of Service']
              },
              {
                title: 'Connect',
                links: ['Twitter', 'LinkedIn', 'YouTube', 'Discord']
              }
            ].map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <h3 className="text-lg font-semibold mb-4 text-white">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
          
          <motion.div 
            className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <p>&copy; 2024 {settings.platformName}. All rights reserved. | Built with ❤️ for forex traders worldwide</p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
