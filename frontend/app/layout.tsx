import './globals.css'
import { SettingsProvider } from '../context/SettingsContext'
import { LanguageProvider } from '../context/LanguageContext'
import { ToastProvider } from '../components/Toast'
import { DashboardProvider } from '../context/DashboardContext'
import { AdminProvider } from '../context/AdminContext'
import { WebSocketProvider } from '../context/WebSocketContext'
import { GlobalSessionHandler } from '../components/GlobalSessionHandler'
import { DevToolsProtection } from '../components/DevToolsProtection'

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
        <DevToolsProtection />
        <ToastProvider>
          <LanguageProvider>
            <SettingsProvider>
              <WebSocketProvider>
                <DashboardProvider>
                  <AdminProvider>
                    <GlobalSessionHandler />
                    {children}
                  </AdminProvider>
                </DashboardProvider>
              </WebSocketProvider>
            </SettingsProvider>
          </LanguageProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
