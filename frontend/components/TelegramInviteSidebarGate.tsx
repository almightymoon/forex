'use client';

import { usePathname } from 'next/navigation';
import { useSettings } from '../context/SettingsContext';
import TelegramInviteSidebar from './TelegramInviteSidebar';

const HIDDEN_PREFIXES = ['/admin', '/dashboard', '/teacher', '/dev'];

/** Public marketing routes where the Telegram invite is shown (includes landing `/`). */
const PUBLIC_MARKETING_PATHS = [
  '/',
  '/about',
  '/contact',
  '/terms',
  '/faq',
];

function isPublicMarketingPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_MARKETING_PATHS.filter((p) => p !== '/').some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export default function TelegramInviteSidebarGate() {
  const pathname = usePathname() ?? '';
  const { settings, settingsLoaded } = useSettings();

  const hideRoute =
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/api');

  if (hideRoute || !isPublicMarketingPath(pathname)) {
    return null;
  }

  if (!settingsLoaded) {
    return null;
  }

  if (settings.telegramInviteEnabled === false) {
    return null;
  }

  return <TelegramInviteSidebar />;
}
