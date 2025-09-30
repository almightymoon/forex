'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  CreditCard, 
  Shield, 
  Users, 
  Settings,
  Play,
  Award,
  MessageSquare,
  Smartphone
} from 'lucide-react';
import Link from 'next/link';

export default function FAQ() {
  const { settings } = useSettings();
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const faqCategories = [
    {
      title: 'Getting Started',
      icon: BookOpen,
      items: [
        {
          question: 'How do I create an account?',
          answer: 'Click the "Sign Up" button on our homepage, fill in your details, verify your email address, and you\'ll be ready to start learning!'
        },
        {
          question: 'Is there a free trial available?',
          answer: 'Yes! We offer a 7-day free trial for new users. You can access basic courses and features during this period.'
        },
        {
          question: 'What do I need to get started?',
          answer: 'All you need is a computer or mobile device with internet access. No prior trading experience is required - we start from the basics.'
        },
        {
          question: 'Can I access courses on mobile devices?',
          answer: 'Absolutely! Our platform is fully responsive and works on smartphones, tablets, and computers. We also have a mobile app for iOS and Android.'
        }
      ]
    },
    {
      title: 'Courses & Learning',
      icon: Play,
      items: [
        {
          question: 'What types of courses do you offer?',
          answer: 'We offer comprehensive forex trading courses covering basics, technical analysis, fundamental analysis, risk management, and advanced trading strategies.'
        },
        {
          question: 'How long do I have access to courses?',
          answer: 'Once enrolled, you have lifetime access to all course materials, including updates and new content added to the course.'
        },
        {
          question: 'Are there any prerequisites for the courses?',
          answer: 'Most of our beginner courses require no prior knowledge. Advanced courses may have prerequisites, which are clearly listed in the course description.'
        },
        {
          question: 'Can I get a certificate after completing a course?',
          answer: 'Yes! Upon successful completion of a course (meeting the minimum progress requirements), you\'ll receive a certificate of completion.'
        },
        {
          question: 'How do I track my progress?',
          answer: 'Your progress is automatically tracked as you complete lessons, watch videos, and take quizzes. You can view your progress in your dashboard.'
        }
      ]
    },
    {
      title: 'Trading Signals',
      icon: Shield,
      items: [
        {
          question: 'What are trading signals?',
          answer: 'Trading signals are buy/sell recommendations based on technical and fundamental analysis. They include entry points, stop losses, and take profit levels.'
        },
        {
          question: 'How accurate are your trading signals?',
          answer: 'While we strive for accuracy, no trading signal is 100% guaranteed. Past performance doesn\'t guarantee future results. Always do your own research and risk management.'
        },
        {
          question: 'How often do you provide signals?',
          answer: 'We provide signals based on market conditions and opportunities. This can range from daily to weekly, depending on market volatility and setup quality.'
        },
        {
          question: 'Can I use signals for live trading?',
          answer: 'Signals are for educational purposes. If you choose to trade, always start with a demo account and never risk more than you can afford to lose.'
        }
      ]
    },
    {
      title: 'Live Sessions',
      icon: Users,
      items: [
        {
          question: 'What are live trading sessions?',
          answer: 'Live sessions are real-time trading demonstrations where our experts analyze the market, explain their thought process, and execute trades while teaching.'
        },
        {
          question: 'How often are live sessions held?',
          answer: 'We typically hold live sessions 2-3 times per week, with additional sessions during high-impact news events. The schedule is posted in advance.'
        },
        {
          question: 'Can I ask questions during live sessions?',
          answer: 'Yes! Live sessions include Q&A periods where you can ask questions via chat. Some sessions also allow voice participation.'
        },
        {
          question: 'Are live sessions recorded?',
          answer: 'Yes, most live sessions are recorded and available for replay in your dashboard for 30 days after the session.'
        }
      ]
    },
    {
      title: 'Community & Support',
      icon: MessageSquare,
      items: [
        {
          question: 'Is there a community forum?',
          answer: 'Yes! We have an active community forum where students can discuss trading strategies, ask questions, and share experiences.'
        },
        {
          question: 'How can I get help if I\'m stuck?',
          answer: 'You can reach out through our support ticket system, community forum, or email. We typically respond within 24 hours.'
        },
        {
          question: 'Can I connect with other students?',
          answer: 'Absolutely! Our community features allow you to connect with fellow students, join study groups, and participate in discussions.'
        },
        {
          question: 'Do you offer one-on-one mentoring?',
          answer: 'We offer premium mentoring packages for students who want personalized guidance. Contact support for more information.'
        }
      ]
    },
    {
      title: 'Billing & Payments',
      icon: CreditCard,
      items: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for annual subscriptions.'
        },
        {
          question: 'Can I cancel my subscription anytime?',
          answer: 'Yes, you can cancel your subscription at any time. You\'ll continue to have access until the end of your current billing period.'
        },
        {
          question: 'Do you offer refunds?',
          answer: 'We offer a 30-day money-back guarantee for new subscribers. If you\'re not satisfied, contact support for a full refund.'
        },
        {
          question: 'Are there any hidden fees?',
          answer: 'No hidden fees! The price you see is what you pay. All taxes and fees are included in the displayed price.'
        },
        {
          question: 'Can I upgrade or downgrade my plan?',
          answer: 'Yes, you can change your subscription plan at any time. Changes take effect at your next billing cycle.'
        }
      ]
    },
    {
      title: 'Technical Support',
      icon: Settings,
      items: [
        {
          question: 'What browsers are supported?',
          answer: 'We support all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version for the best experience.'
        },
        {
          question: 'Why is a video not loading?',
          answer: 'Try refreshing the page, clearing your browser cache, or checking your internet connection. If the problem persists, contact support.'
        },
        {
          question: 'Can I download course materials?',
          answer: 'Some course materials are available for download, while others are only accessible online. This varies by course and is indicated in the course description.'
        },
        {
          question: 'Is my data secure?',
          answer: 'Yes, we use industry-standard encryption and security measures to protect your personal and payment information.'
        }
      ]
    },
    {
      title: 'Mobile App',
      icon: Smartphone,
      items: [
        {
          question: 'Is there a mobile app?',
          answer: 'Yes! We have mobile apps for both iOS and Android. You can download them from the App Store or Google Play Store.'
        },
        {
          question: 'Can I sync progress between devices?',
          answer: 'Yes, your progress automatically syncs across all devices when you\'re logged into the same account.'
        },
        {
          question: 'Are all features available on mobile?',
          answer: 'Most features are available on mobile, including course videos, live sessions, and community access. Some advanced features may have limitations.'
        },
        {
          question: 'Can I watch videos offline?',
          answer: 'Yes, you can download certain videos for offline viewing. This feature is available in our mobile apps.'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <img 
                src="/all-07.svg" 
                alt={`${settings.platformName} Logo`} 
                className="w-8 h-8 object-contain dark:invert"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {settings.platformName}
              </span>
            </Link>
            <Link 
              href="/"
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Find answers to common questions about our platform, courses, and services. 
            Can't find what you're looking for? <Link href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">Contact us</Link>.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="relative">
            <input
              type="text"
              placeholder="Search FAQs..."
              className="w-full px-4 py-3 pl-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
            <HelpCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </motion.div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqCategories.map((category, categoryIndex) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={categoryIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
              >
                {/* Category Header */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {category.title}
                    </h2>
                  </div>
                </div>

                {/* FAQ Items */}
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {category.items.map((item, itemIndex) => {
                    const globalIndex = categoryIndex * 100 + itemIndex;
                    const isOpen = openItems.includes(globalIndex);
                    
                    return (
                      <div key={itemIndex} className="px-6 py-4">
                        <button
                          onClick={() => toggleItem(globalIndex)}
                          className="w-full text-left flex items-center justify-between group"
                        >
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.question}
                          </h3>
                          {isOpen ? (
                            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                        
                        <motion.div
                          initial={false}
                          animate={{ 
                            height: isOpen ? 'auto' : 0,
                            opacity: isOpen ? 1 : 0
                          }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4">
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              {item.answer}
                            </p>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Contact CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Our support team is here to help! Get in touch with us and we'll get back to you within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/contact"
                className="px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Contact Support
              </Link>
              <Link 
                href="/terms"
                className="px-6 py-3 border border-white/30 text-white rounded-xl hover:bg-white/10 transition-colors font-medium"
              >
                View Terms of Service
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


