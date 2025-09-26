'use client';

import AdminDashboard from './components/AdminDashboard';
import AdminErrorBoundary from './components/AdminErrorBoundary';
import './components/admin.css';

export default function AdminPage() {
  console.log('AdminPage - Component rendering...');
  
  return (
    <AdminErrorBoundary>
      <AdminDashboard />
    </AdminErrorBoundary>
  );
}
