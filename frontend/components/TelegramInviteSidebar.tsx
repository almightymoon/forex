'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useSettings } from '../context/SettingsContext';
import styles from './TelegramInviteSidebar.module.css';

const STORAGE_DISMISS = 'fxnav-telegram-invite-dismissed';
const STORAGE_AUTO_OPENED = 'fxnav-telegram-invite-auto-opened';

const envInviteUrl =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TELEGRAM_INVITE_URL
    ? process.env.NEXT_PUBLIC_TELEGRAM_INVITE_URL.trim()
    : '';

function TelegramIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export default function TelegramInviteSidebar() {
  const titleId = useId();
  const pathname = usePathname() ?? '';
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [liftFab, setLiftFab] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const inviteUrl = (settings.telegramInviteUrl || envInviteUrl).trim();
  const hasInviteLink = Boolean(inviteUrl);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (pathname !== '/') {
      setLiftFab(false);
      return;
    }
    const footer = document.getElementById('footer');
    if (!footer) return;

    const io = new IntersectionObserver(
      ([entry]) => setLiftFab(entry.isIntersecting),
      { threshold: 0, rootMargin: '0px 0px 100px 0px' },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_DISMISS) === '1') {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (dismissed || !hasInviteLink || pathname !== '/') return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    try {
      if (sessionStorage.getItem(STORAGE_AUTO_OPENED) === '1') return;
    } catch {
      return;
    }

    const t = window.setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(STORAGE_AUTO_OPENED, '1');
      } catch {
        /* ignore */
      }
    }, 5000);

    return () => window.clearTimeout(t);
  }, [dismissed, hasInviteLink, pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    const focusable = el?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();
  }, [open]);

  const dismissForever = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_DISMISS, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
    setOpen(false);
  }, []);

  if (dismissed || !portalReady || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <>
      <div
        className={`${styles.scrim} ${open ? styles.scrimVisible : ''}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />
      <div className={`${styles.anchor} ${liftFab ? styles.anchorLift : ''}`}>
        <div
          ref={panelRef}
          id="telegram-invite-panel"
          className={`${styles.card} ${open ? styles.cardOpen : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-hidden={!open}
        >
          <div className={styles.cardTop}>
            <div>
              <span className={styles.badge}>Free channel</span>
              <h2 id={titleId} className={styles.cardTitle}>
                <span className={styles.cardTitleAccent}>Join us on Telegram</span>
              </h2>
            </div>
            <button
              type="button"
              className={styles.close}
              aria-label="Close"
              onClick={() => {
                setOpen(false);
                fabRef.current?.focus();
              }}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <p className={styles.copy}>
            Short updates and community chat—optional, easy to mute, no clutter.
          </p>
          {hasInviteLink ? (
            <a
              className={styles.cta}
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <TelegramIcon className={styles.ctaIcon} />
              Open in Telegram
            </a>
          ) : (
            <span className={`${styles.cta} ${styles.ctaDisabled}`} role="status">
              Add your Telegram link in Admin → Settings
            </span>
          )}
          <button type="button" className={styles.dismiss} onClick={dismissForever}>
            Don&apos;t show again
          </button>
        </div>

        <button
          ref={fabRef}
          type="button"
          className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
          aria-expanded={open}
          aria-controls="telegram-invite-panel"
          onClick={() => setOpen((v) => !v)}
          title={open ? 'Close' : 'Telegram'}
        >
          {open ? (
            <span className={styles.fabCloseGlyph} aria-hidden="true">
              ×
            </span>
          ) : (
            <TelegramIcon className={styles.fabIcon} />
          )}
        </button>
      </div>
    </>,
    document.body,
  );
}
