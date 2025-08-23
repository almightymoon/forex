import './globals.css'
import { SettingsProvider } from '../context/SettingsContext'
import { ToastProvider } from '../components/Toast'

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
        <ToastProvider>
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
