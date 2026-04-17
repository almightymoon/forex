import './globals.css'
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
              <MaintenanceProvider>
                <WebSocketProvider>
                  <DashboardProvider>
                    <AdminProvider>
                      <GlobalSessionHandler />
                      <MaintenanceGate>
                        {children}
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
