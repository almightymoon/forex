'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { buildApiUrl } from '../utils/api';

type TargetRole = 'student' | 'teacher' | 'admin';

function decodeJwtPayload(token: string | null): any | null {
  try {
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export default function DeveloperRoleNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [tokenPayload, setTokenPayload] = useState<any | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setTokenPayload(decodeJwtPayload(token));
  }, [pathname]);

  const isDeveloper = useMemo(() => {
    return String(tokenPayload?.role || '').toLowerCase() === 'developer';
  }, [tokenPayload]);

  const effectiveRole = useMemo(() => {
    const er = String(tokenPayload?.effectiveRole || '').toLowerCase();
    return er === 'student' || er === 'teacher' || er === 'admin' ? er : null;
  }, [tokenPayload]);

  if (!isDeveloper) return null;

  const go = async (role: TargetRole) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/dev');
      return;
    }
    const res = await fetch(buildApiUrl('api/dev/impersonate'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) {
      localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      router.push(role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/dashboard');
    }
  };

  const backToDev = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/dev');
      return;
    }
    const res = await fetch(buildApiUrl('api/dev/stop-impersonate'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) {
      localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
    router.push('/dev');
  };

  const baseBtn =
    'px-5 py-2 rounded-lg text-sm font-medium transition-colors';
  const idle =
    'text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-400/10';
  const active =
    'bg-red-500/15 text-red-600 dark:bg-red-400/15 dark:text-red-300';

  return (
    <div className="flex items-center gap-2 bg-gray-900/30 dark:bg-black/20 border border-red-500/20 rounded-xl px-2 py-1">
      <button
        type="button"
        onClick={() => go('student')}
        className={`${baseBtn} ${effectiveRole === 'student' ? active : idle}`}
      >
        Student
      </button>
      <button
        type="button"
        onClick={() => go('teacher')}
        className={`${baseBtn} ${effectiveRole === 'teacher' ? active : idle}`}
      >
        Teacher
      </button>
      <button
        type="button"
        onClick={() => go('admin')}
        className={`${baseBtn} ${effectiveRole === 'admin' ? active : idle}`}
      >
        Admin
      </button>

      <div className="w-px h-6 bg-red-500/20 mx-1" />

      <button
        type="button"
        onClick={backToDev}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
      >
        Developer
      </button>
    </div>
  );
}

