'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, CreditCard, Target, TrendingUp } from 'lucide-react';
import { Analytics } from './types';

interface OverviewProps {
  analytics: Analytics;
  onTabChange: (tab: string) => void;
}

export default function Overview({ analytics, onTabChange }: OverviewProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mb-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-white text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold dark:text-white text-gray-900">{analytics.totalUsers}</p>
              <p className="text-green-600 text-sm font-medium ">+{analytics.monthlyGrowth}% this month</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-white text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">${analytics.totalRevenue.toLocaleString()}</p>
              <p className="text-green-600 dark:text-green-400 text-sm font-medium">+12.5% this month</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-white text-sm font-medium">Total Payments</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.totalPayments}</p>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">{analytics.paymentsThisMonth} this month</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => onTabChange('users')}
            className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 text-left"
          >
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
            <p className="font-semibold text-blue-900 dark:text-blue-100">Manage Users</p>
            <p className="text-blue-600 dark:text-blue-400 text-sm">Add, edit, delete users</p>
          </button>
          
          <button 
            onClick={() => onTabChange('payments')}
            className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-xl hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 text-left"
          >
            <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
            <p className="font-semibold text-green-900 dark:text-green-100">View Payments</p>
            <p className="text-green-600 dark:text-green-400 text-sm">Transaction monitoring</p>
          </button>
          
          <button 
            onClick={() => onTabChange('promocodes')}
            className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 text-left"
          >
            <Target className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
            <p className="font-semibold text-purple-900 dark:text-purple-100">Promo Codes</p>
            <p className="text-purple-600 dark:text-purple-400 text-sm">Manage discounts</p>
          </button>
          
          <button 
            onClick={() => onTabChange('analytics')}
            className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700 rounded-xl hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-200 text-left"
          >
            <TrendingUp className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-2" />
            <p className="font-semibold text-orange-900 dark:text-orange-100">Analytics</p>
            <p className="text-orange-600 dark:text-orange-400 text-sm">Platform insights</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl  p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-gray-900 dark:text-white font-medium">New User Registration</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">John Doe registered as a student</p>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">2 hours ago</span>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-gray-900 dark:text-white font-medium">Payment Received</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">$30 signup fee payment completed</p>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">1 hour ago</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
