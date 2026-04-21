'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Crown, Loader2, Rocket, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { buildApiUrl } from '@/utils/api';
import DarkModeToggle from '../../components/DarkModeToggle';
import { fetchMergedPublicPackages, getDefaultPackages, type UiPackage } from '../../lib/publicPackages';

const accentMeta = {
  emerald: {
    ring: 'ring-emerald-400/35',
    glow: 'shadow-emerald-500/20',
    pill: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30',
    button: 'bg-emerald-500 hover:bg-emerald-400',
  },
  blue: {
    ring: 'ring-blue-400/35',
    glow: 'shadow-blue-500/20',
    pill: 'bg-blue-400/15 text-blue-200 ring-blue-400/30',
    button: 'bg-blue-500 hover:bg-blue-400',
  },
  purple: {
    ring: 'ring-purple-400/35',
    glow: 'shadow-purple-500/20',
    pill: 'bg-purple-400/15 text-purple-200 ring-purple-400/30',
    button: 'bg-purple-500 hover:bg-purple-400',
  },
} as const;

type AccentKey = keyof typeof accentMeta;

export default function SelectPackagePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<UiPackage | null>(null);
  const [packages, setPackages] = useState<UiPackage[]>(() => getDefaultPackages());
  const [error, setError] = useState('');
  const [loadingPackageName, setLoadingPackageName] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/select-package');
      return;
    }
    setCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const merged = await fetchMergedPublicPackages();
      if (!alive) return;
      setPackages(merged);
      setSelectedPackage((prev) => (prev && merged.some((m) => m.name === prev.name) ? prev : null));
    })();
    return () => {
      alive = false;
    };
  }, []);

  const orderedPackages = useMemo(() => packages.filter((p) => p && p.name), [packages]);

  const scrollToIndex = (idx: number) => {
    if (!orderedPackages.length) return;
    const clamped = ((idx % orderedPackages.length) + orderedPackages.length) % orderedPackages.length;
    setActiveIndex(clamped);
    const el = cardRefs.current[clamped];
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const handlePackageSelect = async (pkg: UiPackage) => {
    if (!pkg) {
      setError('Please select a package to continue');
      return;
    }

    // IMPORTANT: selecting a package should NOT create a payment record.
    // The payment record is created only when the user submits the required proof fields on /payment.
    router.push(`/payment?package=${encodeURIComponent(pkg.name)}&amount=${pkg.price}`);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#101012] text-white flex items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-white/80" aria-hidden />
          <span className="text-sm font-medium text-white/70">Preparing packages…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101012] text-zinc-100">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.28),_transparent_60%)] blur-2xl" />
        <div className="absolute -bottom-48 -left-48 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.22),_transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="mb-10 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-white/80 transition hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <DarkModeToggle size="sm" />
        </div>

        <div className="mb-8">
          <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Select your package
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-[15px]">
            Pick the level that fits your trading journey. You can upgrade later.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {/* Mobile carousel controls */}
        {orderedPackages.length > 1 ? (
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex - 1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/80 transition hover:bg-white/[0.06]"
              aria-label="Previous package"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="text-xs font-medium text-white/55">
              Swipe to compare
            </p>
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex + 1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/80 transition hover:bg-white/[0.06]"
              aria-label="Next package"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}

        <div
          ref={scrollerRef}
          className="grid gap-5 lg:grid-cols-3 lg:gap-6 max-lg:flex max-lg:snap-x max-lg:snap-mandatory max-lg:overflow-x-auto max-lg:pb-3 max-lg:[scrollbar-width:none] max-lg:[-ms-overflow-style:none]"
        >
          {orderedPackages.map((pkg, idx) => {
            const isSelected = selectedPackage?.name === pkg.name;
            const accent = (pkg.accent ?? 'blue') as AccentKey;
            const meta = accentMeta[accent] ?? accentMeta.blue;
            const loading = loadingPackageName === pkg.name;
            const badgeIcon =
              pkg.badge === 'Most Popular' ? Star : pkg.badge === 'Elite Program' ? Crown : Rocket;
            const BadgeIcon = badgeIcon;

            return (
              <div
                key={`${pkg._id ?? pkg.name}-${idx}`}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                className="max-lg:snap-center"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setError('');
                    setActiveIndex(idx);
                  }}
                  className={[
                    'group relative w-[min(92vw,420px)] text-left lg:w-full',
                    'overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03]',
                    'ring-1 transition-shadow',
                    isSelected ? `ring-2 ${meta.ring} shadow-2xl ${meta.glow}` : 'ring-white/[0.06] hover:bg-white/[0.045]',
                  ].join(' ')}
                >
                  <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />

                  <div className="relative">
                    <div className="relative h-40 w-full overflow-hidden sm:h-44">
                      <Image
                        src={pkg.image || '/pkg1.jpg'}
                        alt={pkg.name}
                        fill
                        className="object-cover opacity-85 transition-transform duration-500 group-hover:scale-[1.04]"
                        sizes="(max-width: 1024px) 92vw, 33vw"
                        priority={idx === 0}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#101012] via-[#101012]/20 to-transparent" />

                      {pkg.badge ? (
                        <div className="absolute left-4 top-4">
                          <span
                            className={[
                              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 backdrop-blur',
                              meta.pill,
                            ].join(' ')}
                          >
                            <BadgeIcon className="h-3.5 w-3.5" aria-hidden />
                            {pkg.badge}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-extrabold tracking-tight text-white">{pkg.name}</p>
                          {pkg.subtitle ? (
                            <p className="mt-1 text-sm text-white/55">{pkg.subtitle}</p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-white">${pkg.price}</p>
                          <p className="text-xs font-medium text-white/45">{pkg.currency || 'USD'} · USDT</p>
                        </div>
                      </div>

                      <ul className="mt-5 space-y-2.5">
                        {(pkg.features || []).slice(0, 6).map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-sm text-white/70">
                            <span
                              className={[
                                'mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full ring-1',
                                meta.pill,
                              ].join(' ')}
                              aria-hidden
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <span className="leading-snug">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePackageSelect(pkg);
                          }}
                          disabled={loadingPackageName !== null}
                          className={[
                            'inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition',
                            loadingPackageName !== null ? 'cursor-not-allowed opacity-60' : '',
                            loading ? 'bg-white/[0.06] text-white/70' : meta.button + ' text-white',
                          ].join(' ')}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden />
                              Creating checkout…
                            </>
                          ) : isSelected ? (
                            'Continue with this package'
                          ) : (
                            'Choose this package'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
