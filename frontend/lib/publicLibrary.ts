import { buildApiUrl } from '../utils/api';

export type LibraryResourceType =
  | 'link'
  | 'google_sheet'
  | 'pdf'
  | 'document'
  | 'book'
  | 'video';

export type LibraryVisibility = 'public' | 'authenticated' | 'subscribers';

export type LibraryItem = {
  itemId: string;
  title: string;
  description?: string;
  resourceType: LibraryResourceType;
  externalUrl?: string;
  fileUrl?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  allowedPackages?: number[] | null;
  packageLabel?: string;
  author?: string;
  sortOrder?: number;
  hasAccess?: boolean;
  locked?: boolean;
  updatedAt?: string;
};

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function getLibraryAssetUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (typeof window !== 'undefined') return path;
  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  if (site) return `${site.replace(/\/$/, '')}${path}`;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://thefxnavigators.com/api';
  const root = base.replace(/\/api\/?$/, '');
  return `${root}${path}`;
}

export async function fetchPublicLibraryItems(params?: {
  category?: string;
  search?: string;
  type?: string;
  tag?: string;
}): Promise<{ items: LibraryItem[]; total: number; categories: string[] }> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.search) qs.set('search', params.search);
  if (params?.type) qs.set('type', params.type);
  if (params?.tag) qs.set('tag', params.tag);

  try {
    const res = await fetch(buildApiUrl(`api/library?${qs.toString()}`), {
      headers: authHeaders(),
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.status === 401) return { items: [], total: 0, categories: [] };
    if (!res.ok) return { items: [], total: 0, categories: [] };
    return res.json();
  } catch {
    return { items: [], total: 0, categories: [] };
  }
}

export async function fetchPublicLibraryItem(itemId: string): Promise<LibraryItem | null> {
  try {
    const res = await fetch(buildApiUrl(`api/library/${encodeURIComponent(itemId)}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const RESOURCE_TYPE_LABELS: Record<LibraryResourceType, string> = {
  link: 'Link',
  google_sheet: 'Google Sheet',
  pdf: 'PDF',
  document: 'Document',
  book: 'Book',
  video: 'Video',
};

export const VISIBILITY_LABELS: Record<string, string> = {
  public: 'All packages',
  authenticated: 'All packages',
  subscribers: 'Package subscribers',
};
