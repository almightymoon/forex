'use client';

import React from 'react';
import { Wrench, Clock, Mail, Home } from 'lucide-react';

interface MaintenancePageProps {
  platformName?: string;
  message?: string;
  estimatedTime?: string;
  contactEmail?: string;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ 
  platformName = 'Forex Navigators',
  message = 'We are currently performing scheduled maintenance to improve your experience.',
  estimatedTime = 'We expect to be back online shortly.',
  contactEmail = 'support@forexnavigators.com'
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <Wrench className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Under Maintenance
          </h1>

          {/* Platform Name */}
          <div className="mb-4">
            <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {platformName}
            </p>
          </div>

          {/* Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {message}
          </p>

          {/* Estimated Time */}
          <div className="flex items-center justify-center space-x-2 mb-6 text-blue-600">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">{estimatedTime}</span>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Need immediate assistance?
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <a 
                href={`mailto:${contactEmail}`}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                {contactEmail}
              </a>
            </div>
          </div>

          {/* Back to Home Button */}
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Status Updates */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            For real-time updates, follow us on social media
          </p>
        </div>
      </div>

      {/* Background Animation */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default MaintenancePage;
