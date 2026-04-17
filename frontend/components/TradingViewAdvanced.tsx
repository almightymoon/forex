'use client';

/**
 * TradingView Advanced Component
 * For users with TradingView Charting Library license
 * Supports full trading integration via Broker API
 * 
 * This requires:
 * 1. TradingView Charting Library license
 * 2. Broker API implementation on your backend
 * 3. Authentication tokens
 */

import React, { useState, useEffect, useRef } from 'react';
import { LogIn, ExternalLink, Settings, AlertCircle } from 'lucide-react';

export interface TradingViewAdvancedProps {
  symbol?: string;
  theme?: 'light' | 'dark';
  height?: number | string;
  /** Broker API URL for trading integration */
  brokerApiUrl?: string;
  /** Broker name */
  brokerName?: string;
  /** User authentication token */
  authToken?: string;
  /** Enable trading */
  enableTrading?: boolean;
}

export default function TradingViewAdvanced({
  symbol = 'FX:EURUSD',
  theme = 'dark',
  height = 600,
  brokerApiUrl,
  brokerName = 'Your Broker',
  authToken,
  enableTrading = true
}: TradingViewAdvancedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const containerHeight = typeof height === 'number' ? `${height}px` : height;

  useEffect(() => {
    if (!containerRef.current) return;

    // Check if Charting Library is available
    // This requires the library to be hosted on your server
    const libraryPath = '/tradingview/charting_library/'; // Update with your library path
    
    // For now, fallback to iframe if library not available
    if (!brokerApiUrl || !authToken) {
      setError('TradingView Charting Library requires broker API URL and authentication token. Using fallback mode.');
      
      // Fallback to iframe
      containerRef.current.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&theme=${theme}`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.allow = 'fullscreen';
      containerRef.current.appendChild(iframe);
      setIsLoading(false);
      return;
    }

    // Initialize Charting Library
    // This is a placeholder - actual implementation requires:
    // 1. TradingView Charting Library files hosted on your server
    // 2. Broker API implementation
    // 3. Datafeed implementation
    
    setError('TradingView Charting Library integration requires server-side setup. Please configure the library path and broker API.');
    setIsLoading(false);
  }, [symbol, theme, brokerApiUrl, authToken]);

  const openInNewTab = () => {
    const url = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&theme=${theme}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            TradingView Advanced
          </span>
          {authToken && (
            <span className="px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded">
              Authenticated
            </span>
          )}
        </div>
        <button
          onClick={openInNewTab}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 m-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Charting Library Setup Required
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                {error}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                To enable full trading integration:
              </p>
              <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 ml-4 list-disc">
                <li>Obtain TradingView Charting Library license</li>
                <li>Host library files on your server</li>
                <li>Implement Broker API on your backend</li>
                <li>Configure authentication tokens</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center" style={{ height: containerHeight }}>
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading TradingView...</p>
          </div>
        </div>
      )}

      {/* TradingView Container */}
      <div
        ref={containerRef}
        className="tradingview-widget-container w-full overflow-hidden rounded-b-xl border-x border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        style={{ height: containerHeight }}
      />
    </div>
  );
}
