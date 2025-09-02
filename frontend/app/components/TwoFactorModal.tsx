'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { showToast } from '@/utils/toast';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
}

export default function TwoFactorModal({ isOpen, onClose, isEnabled }: TwoFactorModalProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'success'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && !isEnabled && step === 'setup') {
      generateSetupData();
    }
  }, [isOpen, isEnabled, step]);

  const generateSetupData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/user2fa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setSecret(data.secret);
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to generate 2FA setup', 'error');
      }
    } catch (error) {
      console.error('Error generating 2FA setup:', error);
      showToast('Error generating 2FA setup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showToast('Please enter a 6-digit verification code', 'error');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/user2fa/enable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          secret,
          token: verificationCode
        })
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backupCodes);
        setStep('success');
        showToast('2FA enabled successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to enable 2FA', 'error');
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      showToast('Error enabling 2FA', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showToast('Please enter a 6-digit verification code', 'error');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/user2fa/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: verificationCode
        })
      });

      if (response.ok) {
        showToast('2FA disabled successfully', 'success');
        onClose();
        // Reset form
        setVerificationCode('');
        setStep('setup');
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to disable 2FA', 'error');
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      showToast('Error disabling 2FA', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep('setup');
    setVerificationCode('');
    setQrCode('');
    setSecret('');
    setBackupCodes([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Shield className="w-5 h-5 mr-2 text-green-600" />
            {isEnabled ? 'Disable 2FA' : 'Enable Two-Factor Authentication'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isEnabled ? (
          // Disable 2FA
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> Disabling 2FA will make your account less secure.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter 2FA Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-lg tracking-widest placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="000000"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        ) : step === 'setup' ? (
          // Setup 2FA
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Step 1:</strong> Install an authenticator app like Google Authenticator or Authy
              </p>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Generating 2FA setup...</p>
              </div>
            ) : qrCode ? (
              <>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Step 2: Scan this QR code with your app</p>
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 inline-block">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Or manually enter this key:</p>
                  <code className="text-sm bg-white dark:bg-gray-600 px-2 py-1 rounded border dark:border-gray-500 font-mono break-all text-gray-900 dark:text-white">
                    {secret}
                  </code>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Step 3: Enter the 6-digit code from your app
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-lg tracking-widest placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEnable2FA}
                    disabled={loading || verificationCode.length !== 6}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Enabling...' : 'Enable 2FA'}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : step === 'success' ? (
          // Success with backup codes
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  2FA has been enabled successfully!
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> Save these backup codes in a secure location. You will not be able to see them again.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Backup Codes
              </label>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex justify-between items-center py-1">
                    <code className="text-sm bg-white dark:bg-gray-600 px-2 py-1 rounded border dark:border-gray-500 font-mono text-gray-900 dark:text-white">
                      {code}
                    </code>
                    <span className="text-xs text-gray-500 dark:text-gray-400">#{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
