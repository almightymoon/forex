'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Users, CreditCard, Target } from 'lucide-react';
import { Analytics as AnalyticsType } from './types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
);

interface AnalyticsProps {
  analytics: AnalyticsType;
}

export default function Analytics({ analytics }: AnalyticsProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Revenue Overview</h3>
          <div className="h-64">
            <Line
              data={{
                labels: analytics.monthlyRevenue.map(item => item.month),
                datasets: [
                  {
                    label: 'Monthly Revenue',
                    data: analytics.monthlyRevenue.map(item => item.revenue),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                    callbacks: {
                      label: function(context) {
                        return `Revenue: $${context.parsed.y.toLocaleString()}`;
                      }
                    }
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(156, 163, 175, 0.2)',
                    },
                    ticks: {
                      color: '#6B7280',
                      callback: function(value) {
                        return '$' + value;
                      }
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: '#6B7280',
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* User Growth */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">User Growth</h3>
          <div className="h-64">
            <Bar
              data={{
                labels: analytics.monthlyUserGrowth.map(item => item.month),
                datasets: [
                  {
                    label: 'New Users',
                    data: analytics.monthlyUserGrowth.map(item => item.users),
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1,
                    callbacks: {
                      label: function(context) {
                        return `New Users: ${context.parsed.y}`;
                      }
                    }
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(156, 163, 175, 0.2)',
                    },
                    ticks: {
                      color: '#6B7280',
                      stepSize: 1,
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: '#6B7280',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Payment Methods</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 flex items-center justify-center">
            <div className="w-64 h-64">
              <Doughnut
                data={{
                  labels: analytics.paymentMethodStats.map(stat => {
                    const methodNames: { [key: string]: string } = {
                      'promo_code': 'Promo Code',
                      'credit_card': 'Credit Card',
                      'easypaisa': 'Easypaisa',
                      'jazz_cash': 'Jazz Cash',
                      'paypal': 'PayPal'
                    };
                    return methodNames[stat.method] || stat.method;
                  }),
                  datasets: [
                    {
                      data: analytics.paymentMethodStats.map(stat => stat.count),
                      backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(168, 85, 247, 0.8)',
                      ],
                      borderColor: [
                        'rgb(99, 102, 241)',
                        'rgb(34, 197, 94)',
                        'rgb(251, 191, 36)',
                        'rgb(239, 68, 68)',
                        'rgb(168, 85, 247)',
                      ],
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                          size: 12,
                        },
                      },
                    },
                    tooltip: {
                      backgroundColor: 'rgba(17, 24, 39, 0.8)',
                      titleColor: '#fff',
                      bodyColor: '#fff',
                      callbacks: {
                        label: function(context) {
                          const stat = analytics.paymentMethodStats[context.dataIndex];
                          return `${context.label}: ${stat.count} payments ($${stat.totalAmount})`;
                        }
                      }
                    },
                  },
                }}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Payment Method Details</h4>
            {analytics.paymentMethodStats.map((stat, index) => {
              const methodNames: { [key: string]: string } = {
                'promo_code': 'Promo Code',
                'credit_card': 'Credit Card',
                'easypaisa': 'Easypaisa',
                'jazz_cash': 'Jazz Cash',
                'paypal': 'PayPal'
              };
              const colors = [
                'bg-indigo-500',
                'bg-green-500',
                'bg-yellow-500',
                'bg-red-500',
                'bg-purple-500',
              ];
              
              return (
                <div key={stat.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                    <span className="font-medium text-gray-900">
                      {methodNames[stat.method] || stat.method}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{stat.count} payments</p>
                    <p className="text-sm text-gray-500">${stat.totalAmount}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Platform Statistics */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Platform Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.activeUsers}</p>
            <p className="text-sm text-gray-600">Active Users</p>
            <p className="text-xs text-blue-600 mt-1">Last 30 days</p>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.paymentsThisMonth}</p>
            <p className="text-sm text-gray-600">Payments</p>
            <p className="text-xs text-green-600 mt-1">This month</p>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.activePromoCodes}</p>
            <p className="text-sm text-gray-600">Active Promo Codes</p>
            <p className="text-xs text-purple-600 mt-1">Currently available</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
