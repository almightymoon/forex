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
      body: JSON.stringify({ role }),
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
      headers: { Authorization: `Bearer ${token}` },
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
    'px-3 py-1.5 lg:px-5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap';
  const idle =
    'text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-400/10';
  const active =
    'bg-red-500/15 text-red-600 dark:bg-red-400/15 dark:text-red-300';

  const mobileValue = effectiveRole || 'developer';

  return (
    <>
      {/* Mobile: compact select */}
      <div className="w-full max-w-xs md:hidden">
        <select
          value={mobileValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'developer') void backToDev();
            else void go(v as TargetRole);
          }}
          className="w-full rounded-lg border border-red-500/30 bg-gray-900/30 px-3 py-2 text-sm font-medium text-red-600 dark:bg-black/20 dark:text-red-300"
          aria-label="Developer role switcher"
        >
          <option value="student">View as Student</option>
          <option value="teacher">View as Teacher</option>
          <option value="admin">View as Admin</option>
          <option value="developer">Back to Developer</option>
        </select>
      </div>

      {/* Desktop: button strip */}
      <div className="hidden md:flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-red-500/20 bg-gray-900/30 px-1.5 py-1 scrollbar-hide dark:bg-black/20 lg:gap-2 lg:px-2">
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

        <div className="mx-0.5 hidden h-6 w-px shrink-0 bg-red-500/20 lg:block" />

        <button
          type="button"
          onClick={backToDev}
          className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 lg:px-4 lg:py-2 lg:text-sm"
        >
          Developer
        </button>
      </div>
    </>
  );
}
