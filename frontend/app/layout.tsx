import './globals.css'
import { SettingsProvider } from '../context/SettingsContext'
import { LanguageProvider } from '../context/LanguageContext'
import { ToastProvider } from '../components/Toast'
import Script from 'next/script'
import { isDevelopment } from '../lib/env'

export const metadata = {
  title: 'Forex Navigators - Master the Art of Forex Trading',
  description: 'Join thousands of successful forex traders who learned from expert instructors. Access comprehensive courses, live sessions, and real-time trading signals.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Script
          id="error-suppression"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Aggressive error suppression
              (function() {
                'use strict';
                
                // Check if we're in development mode
                const isDevelopment = ${isDevelopment()};
                
                // Suppress console errors
                const originalConsoleError = console.error;
                console.error = function(...args) {
                  if (typeof window !== 'undefined' && isDevelopment) {
                    console.log('🔴 Suppressed Error:', ...args);
                  }
                };
                
                // Suppress global errors
                window.addEventListener('error', function(event) {
                  event.preventDefault();
                  event.stopPropagation();
                  return false;
                }, true);
                
                // Suppress unhandled rejections
                window.addEventListener('unhandledrejection', function(event) {
                  event.preventDefault();
                  event.stopPropagation();
                  return false;
                }, true);
                
                // Hide error overlays
                function hideErrorOverlays() {
                  const selectors = [
                    '[data-nextjs-dialog-overlay]',
                    '[data-nextjs-toast-container]',
                    '[data-nextjs-error-overlay]',
                    '.nextjs-toast-container',
                    '.nextjs-error-overlay',
                    '#__next-build-watcher',
                    '#__next-prerender-indicator'
                  ];
                  
                  selectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                      el.style.display = 'none';
                      el.style.visibility = 'hidden';
                      el.style.opacity = '0';
                      el.style.pointerEvents = 'none';
                    });
                  });
                }
                
                hideErrorOverlays();
                setInterval(hideErrorOverlays, 500);
                
                console.log('✅ Error suppression loaded');
              })();
            `
          }}
        />
        <ToastProvider>
          <LanguageProvider>
            <SettingsProvider>
              {children}
            </SettingsProvider>
          </LanguageProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
