'use client';

import { DM_Sans } from 'next/font/google';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import DarkModeToggle from '../DarkModeToggle';
import '../../styles/auth-globe.css';

const Globe = dynamic(() => import('../landing-experience/Globe'), { ssr: false });

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

/** Dark form column */
export const authInputClass =
  'w-full h-[52px] rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 pl-11 text-[15px] text-white placeholder:text-white/35 transition-[border-color,box-shadow] focus:border-violet-400/35 focus:outline-none focus:ring-2 focus:ring-violet-500/25';

export const authLabelClass = 'mb-1.5 block text-[13px] font-medium text-white/65';

export const authPrimaryButtonClass =
  'flex h-[52px] w-full items-center justify-center rounded-xl border border-white/[0.08] bg-[#2c2c31] text-[15px] font-semibold text-white shadow-inner shadow-white/[0.03] transition-colors hover:bg-[#35353b] disabled:cursor-not-allowed disabled:opacity-45';

export const authSelectClass =
  'h-[52px] w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[15px] text-white transition-[border-color,box-shadow] focus:border-violet-400/35 focus:outline-none focus:ring-2 focus:ring-violet-500/25';

export const authGhostLinkClass =
  'text-[13px] font-medium text-violet-300/90 underline-offset-2 transition-colors hover:text-violet-200';

export type AuthPromo = {
  lines: [string, string] | string[];
  ctaLabel: string;
  ctaHref: string;
};

type Props = {
  platformName: string;
  headline: string;
  subhead: string;
  promo: AuthPromo;
  maxWidth?: 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
};

function LogoMark({ platformName }: { platformName: string }) {
  return (
    <Link href="/" className="group inline-flex items-center" aria-label={`${platformName} — home`}>
      <img
        src="/all-07.svg"
        alt=""
        width={200}
        height={40}
        className="h-9 w-auto max-h-10 max-w-[min(52vw,220px)] object-contain object-left invert transition-opacity group-hover:opacity-95 sm:h-10"
        decoding="async"
      />
    </Link>
  );
}

function GlobePromoColumn({ promo }: { promo: AuthPromo }) {
  const [line1, line2] =
    promo.lines.length >= 2 ? [promo.lines[0], promo.lines[1]] : [promo.lines[0] || '', ''];

  return (
    <aside className="relative order-2 hidden w-full shrink-0 overflow-hidden bg-black lg:block lg:min-h-screen lg:flex-1 lg:border-l-0 lg:border-t-0">
      <div className="auth-globe-stage">
        <Globe variant="auth" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent lg:from-black/40"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end px-5 pb-5 lg:inset-x-auto lg:bottom-auto lg:left-0 lg:right-0 lg:px-10 lg:pb-14 lg:pt-24">
        <p className="max-w-md font-semibold leading-snug tracking-tight text-zinc-100 lg:text-[clamp(1.25rem,2.8vw,1.75rem)]">
          <span className="text-[13px] lg:hidden">
            {line1}
            {line2 ? ` · ${line2}` : ''}
          </span>
          <span className="hidden text-[clamp(1.25rem,2.8vw,1.75rem)] lg:block">
            {line1}
            {line2 ? (
              <>
                <br />
                {line2}
              </>
            ) : null}
          </span>
        </p>
        <div className="pointer-events-auto mt-3 flex flex-col items-start gap-2 lg:mt-8">
          <span className="hidden text-violet-400/90 lg:inline" aria-hidden>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M6 8L0 0h12L6 8z" fill="currentColor" />
            </svg>
          </span>
          <Link
            href={promo.ctaHref}
            className="rounded-full bg-violet-400/20 px-5 py-2 text-[12px] font-semibold tracking-wide text-violet-50 ring-1 ring-violet-400/40 transition-colors hover:bg-violet-400/30 lg:px-6 lg:py-2.5 lg:text-[13px]"
          >
            {promo.ctaLabel}
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default function AuthPortalShell({
  platformName,
  headline,
  subhead,
  promo,
  maxWidth = 'md',
  children,
  footer,
}: Props) {
  const maxClass = maxWidth === 'lg' ? 'max-w-lg' : 'max-w-[400px]';

  return (
    <div
      className={`${dmSans.className} flex min-h-screen flex-col bg-[#101012] text-zinc-100 antialiased lg:flex-row`}
    >
      <div className="order-1 flex flex-1 flex-col px-5 py-8 sm:px-10 sm:py-12 lg:max-w-[50%] lg:border-r lg:border-white/[0.06] lg:py-14">
        <div className={`mx-auto flex w-full flex-1 flex-col ${maxClass}`}>
          <header className="mb-10 flex items-start justify-between gap-4">
            <LogoMark platformName={platformName} />
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[12px] font-medium text-white/60">
                English
              </span>
              <DarkModeToggle size="sm" />
            </div>
          </header>

          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-[13px] font-medium text-white/45 transition-colors hover:text-white/80 lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to site
          </Link>

          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-[2.75rem]">{headline}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-white/45">{subhead}</p>
            <div className="mt-8">{children}</div>
          </div>

          {footer ? <div className="mt-10 text-center">{footer}</div> : null}

          <p className="mt-auto pt-12 text-center text-[11px] text-white/25 lg:pt-8">{platformName}</p>
        </div>
      </div>

      <GlobePromoColumn promo={promo} />
    </div>
  );
}
