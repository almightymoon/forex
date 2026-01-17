'use client';

import { useState } from 'react';
import { Copy, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface BinancePaymentInstructionsProps {
  packageName: string;
  packagePrice: number;
  discount?: number;
  onPaymentComplete?: () => void;
  onClose?: () => void;
}

const BINANCE_WALLET_ADDRESS = 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna';
const NETWORK = 'TRC20';

export default function BinancePaymentInstructions({
  packageName,
  packagePrice,
  discount = 0,
  onPaymentComplete,
  onClose
}: BinancePaymentInstructionsProps) {
  const [copied, setCopied] = useState(false);
  const finalAmount = packagePrice - discount;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Deposit USDT to Binance
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Package Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Package:</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{packageName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Amount: <span className="font-semibold">${finalAmount.toFixed(2)} USDT</span>
              {discount > 0 && (
                <span className="text-green-600 dark:text-green-400 ml-2">
                  (${packagePrice.toFixed(2)} - ${discount.toFixed(2)} discount)
                </span>
              )}
            </p>
          </div>

          {/* QR Code Placeholder - You can generate a real QR code using a library */}
          <div className="flex justify-center mb-6">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600">
              <div className="w-64 h-64 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">QR Code</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Generate with wallet address</p>
                </div>
              </div>
            </div>
          </div>

          {/* Network Information */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Network
            </label>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-center justify-between">
              <span className="text-gray-900 dark:text-white font-medium">Tron (TRC20)</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Required</span>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wallet Address
            </label>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-center justify-between group">
              <code className="text-sm text-gray-900 dark:text-white font-mono break-all flex-1 mr-2">
                {BINANCE_WALLET_ADDRESS}
              </code>
              <button
                onClick={() => copyToClipboard(BINANCE_WALLET_ADDRESS)}
                className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Important Warnings */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-semibold">Important:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Don't send NFTs to this address.</li>
                  <li>Make sure to select <strong>TRC20</strong> network when sending USDT.</li>
                  <li>Send exactly <strong>${finalAmount.toFixed(2)} USDT</strong> to complete payment.</li>
                  <li>Your account will be activated once admin confirms the payment.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Payment Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>Open your Binance wallet or any crypto wallet that supports USDT.</li>
              <li>Select <strong>USDT</strong> and choose <strong>TRC20</strong> network.</li>
              <li>Copy the wallet address above and paste it in the recipient field.</li>
              <li>Enter the amount: <strong>${finalAmount.toFixed(2)} USDT</strong>.</li>
              <li>Confirm the transaction and wait for admin approval.</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                if (onPaymentComplete) {
                  onPaymentComplete();
                }
              }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              I've Sent Payment
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
