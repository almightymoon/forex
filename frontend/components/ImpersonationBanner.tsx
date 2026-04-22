'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { buildApiUrl } from '../utils/api';

function safeDecodeRole(token: string | null): { effectiveRole?: string; impersonating?: boolean } {
  try {
    if (!token) return {};
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      effectiveRole: payload.effectiveRole,
      impersonating: payload.impersonating
    };
  } catch {
    return {};
  }
}

export default function ImpersonationBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [effectiveRole, setEffectiveRole] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const decoded = safeDecodeRole(token);
    if (decoded.impersonating && decoded.effectiveRole) {
      setEffectiveRole(String(decoded.effectiveRole).toLowerCase());
    } else {
      setEffectiveRole(null);
    }
  }, [pathname]);

  if (!effectiveRole) return null;

  const stop = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
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
    } finally {
      router.push('/dev');
    }
  };

  return (
    <div className="w-full bg-amber-100 text-amber-900 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
      <div className="text-sm">
        Impersonating <span className="font-semibold">{effectiveRole}</span>
      </div>
      <button
        onClick={stop}
        className="text-sm font-medium px-3 py-1 rounded bg-amber-200 hover:bg-amber-300"
      >
        Return to Developer
      </button>
    </div>
  );
}

