'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  currencies: string[];
}

interface PaymentData {
  amount: number;
  currency: string;
  description: string;
  courseId?: string;
  promoCode?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
}

const PaymentPage: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    amount: 0,
    currency: 'USD',
    description: '',
    customerEmail: '',
    customerPhone: '',
    customerName: ''
  });

  useEffect(() => {
    fetchPaymentMethods();
    loadUserData();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payments/methods');
      const data = await response.json();
      
      if (data.success) {
        setPaymentMethods(data.methods);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    }
  };

  const loadUserData = () => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setPaymentData(prev => ({
          ...prev,
          customerEmail: user.email,
          customerName: `${user.firstName} ${user.lastName}`,
          customerPhone: user.phone || ''
        }));
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    
    // Set default currency based on payment method
    const method = paymentMethods.find(m => m.id === methodId);
    if (method) {
      if (method.id === 'jazzcash' || method.id === 'easypaisa') {
        setPaymentData(prev => ({ ...prev, currency: 'PKR' }));
      } else {
        setPaymentData(prev => ({ ...prev, currency: 'USD' }));
      }
    }
  };

  const processPayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (paymentData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...paymentData,
          paymentMethod: selectedMethod
        })
      });

      const result = await response.json();

      if (result.success) {
        if (selectedMethod === 'stripe' || selectedMethod === 'credit_card' || selectedMethod === 'card') {
          // Handle Stripe payment
          handleStripePayment(result.data);
        } else if (selectedMethod === 'jazzcash') {
          // Handle JazzCash payment
          window.location.href = result.data.redirectUrl;
        } else if (selectedMethod === 'easypaisa') {
          // Handle EasyPaisa payment
          window.location.href = result.data.redirectUrl;
        }
      } else {
        toast.error(result.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripePayment = async (data: any) => {
    // This would integrate with Stripe Elements
    // For now, we'll show a success message
    toast.success('Stripe payment integration coming soon!');
  };

  const getMethodIcon = (icon: string) => {
    switch (icon) {
      case 'credit-card':
        return <CreditCard className="w-6 h-6" />;
      case 'mobile':
        return <Smartphone className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Payment
          </h1>

          {/* Payment Amount */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount
            </label>
            <div className="flex">
              <select
                name="currency"
                value={paymentData.currency}
                onChange={handleInputChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="USD">USD</option>
                <option value="PKR">PKR</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <input
                type="number"
                name="amount"
                value={paymentData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={paymentData.description}
              onChange={handleInputChange}
              placeholder="Payment description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Promo Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Promo Code (Optional)
            </label>
            <input
              type="text"
              name="promoCode"
              value={paymentData.promoCode}
              onChange={handleInputChange}
              placeholder="Enter promo code..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Customer Information */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={paymentData.customerName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="customerEmail"
                  value={paymentData.customerEmail}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={paymentData.customerPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Select Payment Method
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  onClick={() => handlePaymentMethodSelect(method.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedMethod === method.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-600 dark:text-blue-400">
                      {getMethodIcon(method.icon)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {method.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {method.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Process Payment Button */}
          <div className="flex justify-end">
            <button
              onClick={processPayment}
              disabled={isProcessing || !selectedMethod || paymentData.amount <= 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Process Payment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;

