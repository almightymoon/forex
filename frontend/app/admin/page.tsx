'use client';

import AdminDashboard from './components/AdminDashboard';
import AdminErrorBoundary from './components/AdminErrorBoundary';
import './components/admin.css';

export default function AdminPage() {
  return (
    <AdminErrorBoundary>
      <AdminDashboard />
    </AdminErrorBoundary>
  );
}
