'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildApiUrl } from '../../utils/api';

type TargetRole = 'student' | 'teacher' | 'admin';

function getStoredUserRole(): string | null {
  try {
    const u = localStorage.getItem('user');
    if (!u) return null;
    const parsed = JSON.parse(u);
    return parsed?.role || null;
  } catch {
    return null;
  }
}

export default function DevSuperDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = getStoredUserRole();
    if (role !== 'developer') {
      // If dev is impersonating, banner provides return.
      // Otherwise block access to /dev unless real developer is logged in.
      router.replace('/404');
      return;
    }
    setLoading(false);
  }, [router]);

  const impersonate = async (role: TargetRole) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/dev');
      return;
    }

    const res = await fetch(buildApiUrl('api/dev/impersonate'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) {
      localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      router.push(role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/dashboard');
      return;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Loading developer dashboard…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Developer Super Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Choose a view to impersonate. You can always return to Developer using the banner at the top.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => impersonate('student')}
            className="px-4 py-3 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100">Student</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Open `/dashboard` as student</div>
          </button>

          <button
            onClick={() => impersonate('teacher')}
            className="px-4 py-3 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100">Teacher</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Open `/teacher` as teacher</div>
          </button>

          <button
            onClick={() => impersonate('admin')}
            className="px-4 py-3 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100">Admin</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Open `/admin` as admin</div>
          </button>
        </div>
      </div>
    </div>
  );
}

