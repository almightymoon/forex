import { buildApiUrl } from '../utils/api';

export type AccentKey = 'emerald' | 'blue' | 'purple';

export type UiPackage = {
  _id?: string;
  name: string;
  subtitle?: string;
  price: number;
  currency?: string;
  badge?: string;
  image?: string;
  accent: AccentKey;
  highlight?: boolean;
  features: string[];
  sortOrder?: number;
  isActive?: boolean;
};

const accentKeys: AccentKey[] = ['emerald', 'blue', 'purple'];

const fallbackPackages: UiPackage[] = [
  {
    name: 'FX Launch',
    subtitle: 'Launch your trading journey',
    price: 100,
    badge: 'Starter',
    image: '/pkg1.jpg',
    accent: 'emerald',
    features: [
      'Forex Trading Signals',
      'Forex Basic Mentorship',
      'Premium Indicators',
      'Auto Trading Access',
    ],
  },
  {
    name: 'FX Scale',
    subtitle: 'Grow with structure',
    price: 600,
    badge: 'Most Popular',
    image: '/pkg2.jpg',
    accent: 'blue',
    highlight: true,
    features: [
      'Forex Trading Signals',
      'Live Online Mentorship Sessions',
      'Premium Indicators',
      'Auto Trading Access',
    ],
  },
  {
    name: 'FX Legacy',
    subtitle: 'Trade for life',
    price: 1000,
    badge: 'Elite Program',
    image: '/pkg3.jpg',
    accent: 'purple',
    features: [
      'Forex Trading Signals',
      'Forex Pro Mentorship',
      'Premium Indicators',
      'Auto Trading Access',
      'Physical (On-Ground) Classes',
    ],
  },
];

const styleMap = new Map(fallbackPackages.map((p) => [p.name, p]));

export function getDefaultPackages(): UiPackage[] {
  return fallbackPackages.map((p) => ({ ...p }));
}

export async function fetchMergedPublicPackages(): Promise<UiPackage[]> {
  try {
    const res = await fetch(buildApiUrl('api/packages'), { cache: 'no-store' });
    if (!res.ok) return getDefaultPackages();
    const apiPkgs = await res.json();
    if (!Array.isArray(apiPkgs) || apiPkgs.length === 0) return getDefaultPackages();

    const merged: UiPackage[] = apiPkgs
      .filter((p: { isActive?: boolean }) => p && p.isActive !== false)
      .sort((a: { sortOrder?: number }, b: { sortOrder?: number }) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((p: Record<string, unknown>, idx: number) => {
        const base = styleMap.get(String(p.name || '')) || null;
        const accent = (base?.accent ?? accentKeys[idx % accentKeys.length]) as AccentKey;
        const badge =
          base?.badge ?? (idx === 1 ? 'Most Popular' : idx === 0 ? 'Starter' : 'Elite Program');
        const highlight = base?.highlight ?? idx === 1;

        return {
          _id: p._id as string | undefined,
          name: String(p.name ?? base?.name ?? 'Package'),
          subtitle: String(p.subtitle ?? base?.subtitle ?? ''),
          price: Number(p.price ?? base?.price ?? 0),
          currency: String(p.currency ?? base?.currency ?? 'USD'),
          features:
            Array.isArray(p.features) && (p.features as unknown[]).length
              ? (p.features as string[])
              : base?.features ?? [],
          image: String(p.image ?? base?.image ?? '/pkg1.jpg'),
          accent,
          highlight,
          badge,
          sortOrder: p.sortOrder as number | undefined,
          isActive: p.isActive as boolean | undefined,
        };
      });

    return merged.length ? merged : getDefaultPackages();
  } catch {
    return getDefaultPackages();
  }
}
