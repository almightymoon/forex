'use client';

import { Suspense } from 'react';
import AdminDashboard from './components/AdminDashboard';
import AdminErrorBoundary from './components/AdminErrorBoundary';
import CoolLoader from '../../components/CoolLoader';
import './components/admin.css';

export default function AdminPage() {
  return (
    <AdminErrorBoundary>
      <Suspense fallback={<CoolLoader />}>
        <AdminDashboard />
      </Suspense>
    </AdminErrorBoundary>
  );
}
