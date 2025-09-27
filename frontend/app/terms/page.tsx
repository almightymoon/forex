'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext';
import { Shield, FileText, Scale, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfService() {
  const { settings } = useSettings();
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: FileText },
    { id: 'acceptance', title: 'Acceptance of Terms', icon: CheckCircle },
    { id: 'services', title: 'Services Description', icon: Users },
    { id: 'user-accounts', title: 'User Accounts', icon: Shield },
    { id: 'prohibited-uses', title: 'Prohibited Uses', icon: AlertTriangle },
    { id: 'intellectual-property', title: 'Intellectual Property', icon: Scale },
    { id: 'disclaimers', title: 'Disclaimers', icon: AlertTriangle },
    { id: 'limitation-liability', title: 'Limitation of Liability', icon: Shield },
    { id: 'termination', title: 'Termination', icon: FileText },
    { id: 'governing-law', title: 'Governing Law', icon: Scale },
    { id: 'changes', title: 'Changes to Terms', icon: FileText },
    { id: 'contact', title: 'Contact Information', icon: Users }
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Table of Contents</h3>
                <nav className="space-y-2">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 ${
                          activeSection === section.id
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{section.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
              </div>

              {/* Overview */}
              {activeSection === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Welcome to {settings.platformName}. These Terms of Service ("Terms") govern your use of our 
                    online learning platform, trading education services, and related features. By accessing or 
                    using our services, you agree to be bound by these Terms.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <p className="text-blue-800 dark:text-blue-200 text-sm">
                      <strong>Important:</strong> Please read these Terms carefully before using our services. 
                      If you do not agree to these Terms, you may not access or use our platform.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Acceptance of Terms */}
              {activeSection === 'acceptance' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Acceptance of Terms</h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    By creating an account, accessing our platform, or using any of our services, you acknowledge 
                    that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                    <li>You must be at least 18 years old to use our services</li>
                    <li>You must provide accurate and complete information when creating your account</li>
                    <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                    <li>You agree to notify us immediately of any unauthorized use of your account</li>
                  </ul>
                </motion.div>
              )}

              {/* Services Description */}
              {activeSection === 'services' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Services Description</h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {settings.platformName} provides educational content and tools for forex trading, including:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                    <li>Online courses and educational materials</li>
                    <li>Trading signals and market analysis</li>
                    <li>Live trading sessions and webinars</li>
                    <li>Community forums and discussion boards</li>
                    <li>Certification programs</li>
                    <li>Mobile and web applications</li>
                  </ul>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      <strong>Disclaimer:</strong> Our services are for educational purposes only. We do not provide 
                      financial advice, and trading involves substantial risk of loss.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* User Accounts */}
              {activeSection === 'user-accounts' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Accounts</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Account Creation</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        To access certain features, you must create an account. You agree to provide accurate, 
                        current, and complete information during registration.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Account Security</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        You are responsible for maintaining the security of your account and password. We cannot 
                        and will not be liable for any loss or damage arising from your failure to comply with 
                        this security obligation.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Account Termination</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        We reserve the right to suspend or terminate your account at any time for violation of 
                        these Terms or for any other reason at our sole discretion.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Prohibited Uses */}
              {activeSection === 'prohibited-uses' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Prohibited Uses</h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    You may not use our services for any unlawful purpose or to solicit others to perform unlawful acts. 
                    You agree not to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                    <li>Violate any applicable laws or regulations</li>
                    <li>Infringe upon the rights of others</li>
                    <li>Transmit or procure the sending of spam or unsolicited messages</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                    <li>Interfere with or disrupt our services</li>
                    <li>Use our platform for commercial purposes without permission</li>
                    <li>Share your account credentials with others</li>
                    <li>Upload malicious code or harmful content</li>
                  </ul>
                </motion.div>
              )}

              {/* Intellectual Property */}
              {activeSection === 'intellectual-property' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Intellectual Property</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Our Content</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        All content on our platform, including courses, videos, text, graphics, and software, 
                        is owned by {settings.platformName} or our licensors and is protected by copyright and 
                        other intellectual property laws.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">License to Use</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        We grant you a limited, non-exclusive, non-transferable license to access and use our 
                        content for personal, non-commercial purposes only.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">User Content</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        By posting content on our platform, you grant us a license to use, modify, and display 
                        such content in connection with our services.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Disclaimers */}
              {activeSection === 'disclaimers' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Disclaimers</h2>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                    <p className="text-red-800 dark:text-red-200 text-sm font-semibold mb-2">
                      IMPORTANT FINANCIAL DISCLAIMER
                    </p>
                    <p className="text-red-700 dark:text-red-300 text-sm">
                      Trading foreign exchange on margin carries a high level of risk and may not be suitable 
                      for all investors. The high degree of leverage can work against you as well as for you. 
                      Before deciding to trade foreign exchange, you should carefully consider your investment 
                      objectives, level of experience, and risk appetite.
                    </p>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Our services are provided "as is" without warranties of any kind. We disclaim all warranties, 
                    express or implied, including but not limited to warranties of merchantability, fitness for a 
                    particular purpose, and non-infringement.
                  </p>
                </motion.div>
              )}

              {/* Limitation of Liability */}
              {activeSection === 'limitation-liability' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Limitation of Liability</h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    In no event shall {settings.platformName}, its officers, directors, employees, or agents be 
                    liable for any indirect, incidental, special, consequential, or punitive damages, including 
                    without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting 
                    from your use of our services.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Our total liability to you for any damages arising from or related to these Terms or our 
                    services shall not exceed the amount you paid us in the 12 months preceding the claim.
                  </p>
                </motion.div>
              )}

              {/* Termination */}
              {activeSection === 'termination' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Termination</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Termination by You</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        You may terminate your account at any time by contacting us or using the account 
                        deletion feature in your profile settings.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Termination by Us</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        We may terminate or suspend your account immediately, without prior notice, for conduct 
                        that we believe violates these Terms or is harmful to other users, us, or third parties.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Effect of Termination</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Upon termination, your right to use our services will cease immediately. Provisions of 
                        these Terms that by their nature should survive termination shall survive.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Governing Law */}
              {activeSection === 'governing-law' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Governing Law</h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], 
                    without regard to its conflict of law provisions. Any legal action or proceeding arising under 
                    these Terms will be brought exclusively in the courts located in [Your Jurisdiction].
                  </p>
                </motion.div>
              )}

              {/* Changes to Terms */}
              {activeSection === 'changes' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Changes to Terms</h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    We reserve the right to modify these Terms at any time. We will notify users of any material 
                    changes by posting the new Terms on our platform and updating the "Last updated" date.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Your continued use of our services after any such changes constitutes your acceptance of the 
                    new Terms. If you do not agree to the modified Terms, you must stop using our services.
                  </p>
                </motion.div>
              )}

              {/* Contact Information */}
              {activeSection === 'contact' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Information</h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    If you have any questions about these Terms of Service, please contact us:
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Email:</strong> thefxnavigators@gmail.com<br />
                      <strong>Phone:</strong> +92 3488566147<br />
                      <strong>Business Hours:</strong> Mon-Fri 9AM-6PM (PST)
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
