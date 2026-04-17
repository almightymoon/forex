'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LogIn, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

export interface TradingViewTerminalProps {
  /** TradingView symbol, e.g. "FX:EURUSD", "OANDA:EURUSD", "BINANCE:BTCUSDT" */
  symbol?: string;
  /** Theme: 'light' | 'dark' */
  theme?: 'light' | 'dark';
  /** Height of the terminal */
  height?: number | string;
  /** Enable login functionality */
  enableLogin?: boolean;
  /** TradingView username (optional, for auto-login) */
  username?: string;
  /** Mode: 'terminal' (full terminal with login) | 'chart' (chart only) | 'iframe' (full iframe) */
  mode?: 'terminal' | 'chart' | 'iframe';
  /** Container ID for widget */
  containerId?: string;
}

/**
 * TradingView Terminal Component
 * Supports multiple embedding modes:
 * 1. Terminal Widget - Full trading terminal with login support (iframe)
 * 2. Chart Widget - Chart only with login
 * 3. Full iframe - Complete TradingView platform
 */
export default function TradingViewTerminal({
  symbol = 'FX:EURUSD',
  theme = 'dark',
  height = 600,
  enableLogin = true,
  username,
  mode = 'terminal',
  containerId = 'tradingview-terminal'
}: TradingViewTerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const containerHeight = typeof height === 'number' ? `${height}px` : height;

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';

    if (mode === 'iframe') {
      // Full iframe mode - embeds complete TradingView platform where users can login
      const iframe = document.createElement('iframe');
      // TradingView chart URL with login support - users can login directly in the iframe
      iframe.src = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&theme=${theme}`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.allow = 'fullscreen';
      iframe.allowFullscreen = true;
      iframe.title = 'TradingView Chart';
      iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation');
      containerRef.current.appendChild(iframe);
      return;
    }

    if (mode === 'terminal') {
      // Advanced chart widget with enhanced features - users can login via TradingView's built-in login
      // This uses the advanced chart which has a login button in the toolbar
      const chartScript = document.createElement('script');
      chartScript.type = 'text/javascript';
      chartScript.async = true;
      chartScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      
      const chartConfig = {
        autosize: true,
        symbol: symbol,
        interval: 'D',
        timezone: 'Etc/UTC',
        theme: theme,
        style: '1',
        locale: 'en',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        calendar: false,
        support_host: 'https://www.tradingview.com',
        // Enable popup button for login/account access
        show_popup_button: enableLogin,
        popup_width: '1000',
        popup_height: '650',
        // Enable trading features (requires TradingView account)
        studies: [
          'Volume@tv-basicstudies'
        ],
        // Show login button in toolbar
        toolbar_bg: theme === 'dark' ? '#1e1e1e' : '#ffffff',
        // Enable user to login and access their TradingView account
        withdateranges: true,
        hide_volume: false,
        save_image: false,
        container_id: containerId
      };
      
      chartScript.innerHTML = JSON.stringify(chartConfig);
      containerRef.current.appendChild(chartScript);
      return;
    }

    // Chart mode - Standard advanced chart
    const chartScript = document.createElement('script');
    chartScript.type = 'text/javascript';
    chartScript.async = true;
    chartScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    
    const chartConfig = {
      autosize: true,
      symbol: symbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      show_popup_button: enableLogin,
      popup_width: '1000',
      popup_height: '650',
    };
    
    chartScript.innerHTML = JSON.stringify(chartConfig);
    containerRef.current.appendChild(chartScript);
  }, [symbol, theme, mode, enableLogin, containerId]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const openInNewTab = () => {
    const url = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&theme=${theme}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="w-full relative flex flex-col" style={{ height: containerHeight }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            TradingView {mode === 'terminal' ? 'Terminal' : mode === 'iframe' ? 'Platform' : 'Chart'}
          </span>
          {enableLogin && (
            <button
              onClick={() => setShowLoginPrompt(true)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isLoggedIn ? 'Logged In' : 'Login'}</span>
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={openInNewTab}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* TradingView Container */}
      <div
        ref={containerRef}
        id={containerId}
        className="tradingview-widget-container w-full flex-1 overflow-hidden rounded-b-xl border-x border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      />

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              TradingView Login
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              To login to TradingView, click the login button that appears in the TradingView widget above, 
              or open TradingView in a new tab to access your account.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={openInNewTab}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open TradingView</span>
              </button>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      {enableLogin && !isLoggedIn && mode !== 'iframe' && (
        <div className="absolute bottom-4 left-4 right-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200 z-10">
          <div className="flex items-start space-x-2">
            <LogIn className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Login to TradingView</p>
              <p className="text-blue-700 dark:text-blue-300">
                {mode === 'terminal' 
                  ? 'Click the login button in the TradingView toolbar to access your TradingView account and enable trading features.'
                  : 'Use the login button in the chart toolbar to access your TradingView account.'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {mode === 'iframe' && (
        <div className="absolute bottom-4 left-4 right-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-xs text-green-800 dark:text-green-200 z-10">
          <div className="flex items-start space-x-2">
            <LogIn className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Full TradingView Platform</p>
              <p className="text-green-700 dark:text-green-300">
                You can login directly in the TradingView platform above. Click the login button in the top-right corner of the chart.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
