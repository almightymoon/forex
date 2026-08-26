import './globals.css'
import '../styles/landing-loading-screen.css'
import type { Metadata } from 'next'
import { SettingsProvider } from '../context/SettingsContext'
import { LanguageProvider } from '../context/LanguageContext'
import { ToastProvider } from '../components/Toast'
import { MaintenanceProvider } from '../context/MaintenanceContext'
import { DashboardProvider } from '../context/DashboardContext'
import { AdminProvider } from '../context/AdminContext'
import { WebSocketProvider } from '../context/WebSocketContext'
import { GlobalSessionHandler } from '../components/GlobalSessionHandler'
import { DevToolsProtection } from '../components/DevToolsProtection'
import MaintenanceGate from '../components/MaintenanceGate'
import PackageGuard from '../components/PackageGuard'
import TelegramInviteSidebarGate from '../components/TelegramInviteSidebarGate'
import SiteJsonLd from '../components/seo/SiteJsonLd'
import GoogleAnalytics from '../components/seo/GoogleAnalytics'
import { buildPageMetadata } from '../lib/seo'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Forex Navigators',
    description:
      'Join thousands of successful forex traders who learned from expert instructors. Access comprehensive courses, live sessions, and real-time trading signals.',
    path: '/',
  }),
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SiteJsonLd />
        <GoogleAnalytics />
        <DevToolsProtection />
        <ToastProvider>
          <LanguageProvider>
            <SettingsProvider>
              <MaintenanceProvider>
                <WebSocketProvider>
                  <DashboardProvider>
                    <AdminProvider>
                      <GlobalSessionHandler />
                      <MaintenanceGate>
                        <PackageGuard>{children}</PackageGuard>
                        <TelegramInviteSidebarGate />
                      </MaintenanceGate>
                    </AdminProvider>
                  </DashboardProvider>
                </WebSocketProvider>
              </MaintenanceProvider>
            </SettingsProvider>
          </LanguageProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
