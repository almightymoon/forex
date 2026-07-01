'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LibraryItemDetailView, {
  LibraryItemLoading,
  LibraryItemNotFound,
} from '../../../../components/library/LibraryItemDetailView';
import { fetchPublicLibraryItem, type LibraryItem } from '../../../../lib/publicLibrary';

export default function TeacherLibraryItemPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = String(params?.itemId || '');
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(`/teacher/library/${itemId}`)}`);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await fetchPublicLibraryItem(itemId);
      if (!alive) return;
      if (!data) {
        setNotFound(true);
        setItem(null);
      } else {
        setItem(data);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [itemId, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/teacher?tab=library" className="text-sm text-blue-600 hover:underline">
            ← Teacher dashboard
          </Link>
        </div>
        {loading ? (
          <LibraryItemLoading />
        ) : notFound || !item ? (
          <LibraryItemNotFound backHref="/teacher?tab=library" />
        ) : (
          <LibraryItemDetailView
            item={item}
            backHref="/teacher?tab=library"
            loginRedirectPath={`/teacher/library/${itemId}`}
          />
        )}
      </div>
    </div>
  );
}
