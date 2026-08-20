'use client';

import { usePathname } from 'next/navigation';
import { useMaintenanceContext } from '../context/MaintenanceContext';
import MaintenancePage from './MaintenancePage';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/about',
  '/contact',
  '/terms',
  '/faq',
  '/f',
  '/e',
];

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isMaintenanceMode, maintenanceMessage } = useMaintenanceContext();

  const isPublicPath = pathname && PUBLIC_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/')));

  if (isMaintenanceMode && !isPublicPath) {
    return <MaintenancePage message={maintenanceMessage} />;
  }

  return <>{children}</>;
}
