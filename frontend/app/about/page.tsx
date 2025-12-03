'use client';

import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Target, 
  BookOpen, 
  MessageSquare, 
  Copy,
  GraduationCap,
  BarChart3,
  CheckCircle,
  Star,
  Award,
  Globe,
  Phone,
  Mail,
  MessageCircle,
  ArrowRight,
  Shield,
  Zap,
  Brain,
  DollarSign,
  Clock,
  Play,
  ChevronDown
} from 'lucide-react';

import { useSettings } from '@/context/SettingsContext';
import { useState } from 'react';
import Link from 'next/link';
import DarkModeToggle from '../../components/DarkModeToggle';

export default function AboutPage() {
  const [isVisible, setIsVisible] = useState(false);
  const { settings, loading } = useSettings();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Prevent hydration mismatch by showing loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      icon: <TrendingUp className="w-12 h-12" />,
      value: "9+",
      label: "Years Trading Experience",
      description: "Professional forex trading expertise",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: <Users className="w-12 h-12" />,
      value: "100+",
      label: "Students Trained Successfully",
      description: "And growing community of traders",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: <Target className="w-12 h-12" />,
      value: "85%",
      label: "Student Success Rate",
      description: "Proven track record of results",
      color: "from-purple-500 to-pink-600"
    }
  ];

  const services = [
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Forex Trading Courses",
      description: "Master forex fundamentals with our comprehensive curriculum designed for all skill levels.",
      features: ["Beginner to Advanced", "Live Trading Sessions", "Risk Management", "Market Analysis"]
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Signal Sharing",
      description: "Get real-time expert signals and in-depth market analysis to guide your trading decisions.",
      features: ["Real-time Alerts", "Entry & Exit Points", "Risk Analysis", "Market Commentary"]
    },
    {
      icon: <Copy className="w-8 h-8" />,
      title: "Copy Trading",
      description: "Mirror expert trades automatically and effortlessly with our advanced copy trading system.",
      features: ["Auto Execution", "Risk Controls", "Performance Tracking", "Custom Settings"]
    },
    {
      icon: <GraduationCap className="w-8 h-8" />,
      title: "Personal Coaching",
      description: "One-on-one mentoring to accelerate your trading journey with personalized guidance.",
      features: ["1-on-1 Sessions", "Custom Strategies", "Trade Reviews", "Ongoing Support"]
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Community Support",
      description: "Join our thriving community of successful traders and share experiences.",
      features: ["Expert Network", "Peer Learning", "Market Discussions", "Success Stories"]
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Navigator Strategy",
      description: "Access our exclusive high-accuracy trading techniques and proven strategies.",
      features: ["Proven Methods", "Backtested Results", "Risk Management", "Market Adaptation"]
    }
  ];

  const achievements = [
    {
      title: "9+ Years of Professional Trading Experience",
      description: "Extensive market knowledge and expertise"
    },
    {
      title: "100+ Students Successfully Mentored",
      description: "Proven track record of student success"
    },
    {
      title: "85% Student Success Rate",
      description: "Industry-leading success metrics"
    },
    {
      title: "Comprehensive Forex Education Programs",
      description: "Complete learning ecosystem"
    },
    {
      title: "Real-time Market Analysis & Signals",
      description: "Live market intelligence"
    },
    {
      title: "Proven Trading Strategies",
      description: "Battle-tested methodologies"
    }
  ];

  const faqs = [
    {
      question: "What experience do I need to start?",
      answer: "No prior experience is required! Our courses are designed to take you from absolute beginner to proficient trader. We start with the basics and gradually progress to advanced concepts."
    },
    {
      question: "How does the signal service work?",
      answer: "You'll receive real-time trading signals with detailed entry points, stop-loss, and take-profit levels. Each signal comes with analysis explaining the rationale behind the trade."
    },
    {
      question: "What's included in the coaching program?",
      answer: "The coaching program includes one-on-one sessions, personalized strategy development, trade reviews, and ongoing support. You'll have direct access to me for questions and guidance."
    },
    {
      question: "How much capital do I need to start trading?",
      answer: "While you can start with any amount, we recommend beginning with at least $500 to properly implement risk management strategies. However, you can start learning and practicing with a demo account before trading real money."
    },
    {
      question: "How long does it take to become profitable?",
      answer: "The timeline varies for each trader, but with dedication and proper guidance, many of our students start seeing consistent results within 3-6 months. Remember, trading is a skill that requires patience and practice."
    },
    {
      question: "Do you offer ongoing support?",
      answer: "Yes! All our programs include access to our community platform where you can get help, share ideas, and interact with other traders. Plus, we provide regular market updates and continued education resources."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              className="flex items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <img 
                src="/all-07.svg" 
                alt={`${settings.platformName} Logo`} 
                className="w-20 h-20 object-contain dark:invert"
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
              <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Home</Link>
              <a href="/#features" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Features</a>
              <Link href="/about" className="text-blue-600 dark:text-blue-400 font-medium">About</Link>
              <a href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Contact</a>
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <DarkModeToggle size="sm" className="mr-2" />
              
              <Link 
                href="/login"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
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
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 lg:pt-40 lg:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8">
              <Star className="w-4 h-4 mr-2" />
              Premium Forex Education Platform
            </div>
            <h1 className="text-5xl pb-4 md:text-7xl font-bold mb-8bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
              {settings.platformName || 'Forex Navigators'}
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Master the art of forex trading with Muhammad Adnan Khan's proven strategies and comprehensive education platform
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>Start Your Journey</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="group border-2 border-slate-600 dark:border-slate-300 text-slate-700 dark:text-slate-300 px-8 py-4 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Contact Expert</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>



   

      {/* Stats Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Proven Excellence
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Our track record speaks for itself with industry-leading results and student success rates
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl blur-xl"
                     style={{ background: `linear-gradient(135deg, ${stat.color.split(' ')[1]}, ${stat.color.split(' ')[3]})` }}></div>
                <div className="relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 dark:border-gray-700">
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${stat.color} mb-6`}>
                    <div className="text-white">
                      {stat.icon}
                    </div>
                  </div>
                  <h3 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                    {stat.value}
                  </h3>
                  <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    {stat.label}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Muhammad Adnan Khan */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8">
                <Award className="w-4 h-4 mr-2" />
                Meet the Expert
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                Muhammad Adnan Khan
              </h2>
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-6 rounded-2xl mb-8">
                <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-3">
                  CEO & Founder
                </h3>
                <p className="text-lg text-slate-700 dark:text-slate-300 font-medium">
                  9+ Years of Professional Trading Experience
                </p>
              </div>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                I've been trading forex for over 9 years, learning from both wins and losses. Through countless market cycles, I've refined approaches that actually work in real trading conditions. Now I want to help other traders avoid the mistakes I made and build the skills needed for consistent results.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Certified Expert</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Global Experience</span>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              {/* Owner Image - Professional Circular Design */}
              <div className="mb-12 flex justify-center">
                <div className="relative group">
                  {/* Outer ring with gradient */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full opacity-75 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                  
                  {/* Main image container */}
                  <div className="relative bg-white dark:bg-gray-800 p-2 rounded-full shadow-2xl">
                    <img 
                      src="/owner.jpeg" 
                      alt="Muhammad Adnan Khan - CEO & Founder" 
                      className="w-48 h-48 object-cover rounded-full border-4 border-white dark:border-gray-700 shadow-xl"
                    />
                  </div>
                  
                  {/* Professional badge overlay */}
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg border-2 border-white dark:border-gray-800">
                    <div className="flex items-center space-x-1">
                      <Award className="w-4 h-4" />
                      <span>CEO</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-900 dark:to-purple-900 rounded-3xl p-8 text-slate-900 dark:text-white overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="absolute inset-0 opacity-40">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
                </div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-bold mb-8 text-center text-slate-900 dark:text-white">Track Record</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-white/10 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-white/10">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Years Experience</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-300">9+</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-white/10 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-white/10">
                      <div className="flex items-center space-x-3">
                        <Users className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Students Mentored</span>
                      </div>
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-300">100+</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-white/10 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-white/10">
                      <div className="flex items-center space-x-3">
                        <Target className="w-6 h-6 text-green-600 dark:text-green-300" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Success Rate</span>
                      </div>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-300">85%</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Arjumail Jabbar - Co-Founder */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Image on the left */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative order-2 lg:order-1"
            >
              {/* Co-Founder Image - Professional Circular Design */}
              <div className="mb-12 flex justify-center">
                <div className="relative group">
                  {/* Outer ring with gradient */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 rounded-full opacity-75 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                  
                  {/* Main image container */}
                  <div className="relative bg-white dark:bg-gray-800 p-2 rounded-full shadow-2xl">
                    <img 
                      src="/PHOTO-2025-12-03-14-57-28.jpg" 
                      alt="Arjumail Jabbar - Co-Founder" 
                      className="w-48 h-48 object-cover rounded-full border-4 border-white dark:border-gray-700 shadow-xl"
                    />
                  </div>
                  
                  {/* Professional badge overlay */}
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg border-2 border-white dark:border-gray-800">
                    <div className="flex items-center space-x-1">
                      <Award className="w-4 h-4" />
                      <span>Co-Founder</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative bg-gradient-to-br from-slate-50 via-green-50 to-teal-50 dark:from-slate-900 dark:via-green-900 dark:to-teal-900 rounded-3xl p-8 text-slate-900 dark:text-white overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="absolute inset-0 opacity-40">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-teal-500/5"></div>
                </div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-bold mb-8 text-center text-slate-900 dark:text-white">Track Record</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-white/10 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-white/10">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-300" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Years Experience</span>
                      </div>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-300">4+</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-white/10 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-white/10">
                      <div className="flex items-center space-x-3">
                        <Users className="w-6 h-6 text-teal-600 dark:text-teal-300" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Traders Helped</span>
                      </div>
                      <span className="text-2xl font-bold text-teal-600 dark:text-teal-300">50+</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-white/10 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-white/10">
                      <div className="flex items-center space-x-3">
                        <Target className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Market Cycles</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-300">100+</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Text on the right */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="order-1 lg:order-2"
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium mb-8">
                <Award className="w-4 h-4 mr-2" />
                Meet the Co-Founder
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                Arjumail Jabbar
              </h2>
              <div className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/20 p-6 rounded-2xl mb-8">
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-3">
                  Co-Founder
                </h3>
                <p className="text-lg text-slate-700 dark:text-slate-300 font-medium">
                  4+ Years of Professional Trading Experience
                </p>
              </div>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                I've been actively involved in the forex market for over 4 years, gaining experience through both the ups and downs of real trading conditions. Throughout this journey, I've learned to navigate market cycles, refine my strategies, and develop approaches that truly work in live environments.
              </p>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                Now, as the Co-Founder of Forex Navigators, my mission is to help traders shorten their learning curve, avoid the mistakes I once made, and build the skills required for consistent and confident trading.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Live Trading Expert</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700">
                  <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Strategy Developer</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8">
              <Zap className="w-4 h-4 mr-2" />
              Premium Services
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Comprehensive Solutions
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Professional forex trading education and tools designed to accelerate your success in the financial markets
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"></div>
                <div className="relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600">
                  <div className="inline-flex p-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                    <div className="text-white">
                      {service.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    {service.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    {service.description}
                  </p>
                  <div className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium mb-8">
              <Shield className="w-4 h-4 mr-2" />
              Proven Results
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Industry-Leading Achievements
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Our commitment to excellence has resulted in measurable success across all our programs and services
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {achievements.map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group flex items-start space-x-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-gray-700"
              >
                <div className="flex-shrink-0 p-2 bg-green-100 dark:bg-green-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {achievement.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {achievement.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-medium mb-8">
              <Brain className="w-4 h-4 mr-2" />
              Knowledge Base
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Get answers to the most common questions about our forex trading programs and services
            </p>
          </motion.div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white pr-4">
                    {faq.question}
                  </h3>
                  <ChevronDown 
                    className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{ 
                    height: expandedFaq === index ? 'auto' : 0,
                    opacity: expandedFaq === index ? 1 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-8 pb-6">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8">
              <MessageCircle className="w-4 h-4 mr-2" />
              Get in Touch
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Connect with our expert team and take the first step towards mastering forex trading with professional guidance
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="group bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 dark:border-gray-700"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Phone/WhatsApp</h3>
                  <p className="text-slate-600 dark:text-slate-400">Direct communication</p>
                </div>
              </div>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">+923325280486</p>
              <p className="text-slate-600 dark:text-slate-400">Available for immediate consultation and support</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="group bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 dark:border-gray-700"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Email</h3>
                  <p className="text-slate-600 dark:text-slate-400">Professional correspondence</p>
                </div>
              </div>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">thefxnavigators.com</p>
              <p className="text-slate-600 dark:text-slate-400">Detailed inquiries and program information</p>
            </motion.div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Chat on WhatsApp</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <Mail className="w-5 h-5" />
              <span>Send Email</span>
            </motion.button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-white/20 to-white/10 border border-white/30 text-white text-sm font-medium mb-8">
              <DollarSign className="w-4 h-4 mr-2" />
              Limited Time Offer
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent leading-tight">
              Transform Your Trading Journey
            </h2>
            <p className="text-xl md:text-2xl mb-12 text-slate-300 max-w-4xl mx-auto leading-relaxed">
              Join hundreds of successful traders who have mastered the forex market with our proven strategies, expert guidance, and comprehensive education platform
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="group bg-gradient-to-r from-white to-blue-100 text-slate-900 px-10 py-5 rounded-xl font-bold text-lg hover:from-blue-50 hover:to-white transition-all duration-300 shadow-2xl hover:shadow-3xl flex items-center justify-center space-x-3"
              >
                <span>Start Learning Now</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="group border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-slate-900 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
              >
                <MessageCircle className="w-6 h-6" />
                <span>Contact Expert</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-100 via-blue-50 to-indigo-50 dark:bg-gray-800 text-gray-900 dark:text-white py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 dark:bg-gray-800" />
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
                    src="/all-07.svg" 
                    alt={`${settings.platformName} Logo`} 
                    className="w-8 h-8 object-contain dark:invert"
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
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Empowering traders with comprehensive education and real-time insights to achieve financial success.
              </p>
            </div>
            
            {[
              {
                title: 'Platform',
                links: [
                  { name: 'Live Sessions', href: '/dashboard' },
                  { name: 'Trading Signals', href: '/dashboard' },
                  { name: 'Community', href: '/dashboard' }
                ]
              },
              {
                title: 'Support',
                links: [
                  { name: 'Help Center', href: '/contact' },
                  { name: 'Contact Us', href: '/contact' },
                  { name: 'FAQ', href: '/faq' },
                  { name: 'Terms of Service', href: '/terms' }
                ]
              },
              {
                title: 'Connect',
                links: [
                  { name: 'Twitter', href: '#' },
                  { name: 'LinkedIn', href: '#' },
                  { name: 'YouTube', href: '#' },
                  { name: 'Discord', href: '#' }
                ]
              }
            ].map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link href={link.href} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
          
          <motion.div 
            className="border-t border-gray-300 dark:border-gray-700 mt-12 pt-8 text-center text-gray-600 dark:text-gray-300"
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

