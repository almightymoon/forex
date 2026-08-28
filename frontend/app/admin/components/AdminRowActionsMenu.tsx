'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Loader2, MoreVertical, type LucideIcon } from 'lucide-react';

export type AdminRowActionItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Visual tone for the menu row */
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  hidden?: boolean;
};

type Props = {
  items: AdminRowActionItem[];
  label?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
  className?: string;
  /** `icon` shows a compact ⋮ trigger; `labeled` shows "Actions" + chevron */
  variant?: 'labeled' | 'icon';
};

const toneClass: Record<NonNullable<AdminRowActionItem['tone']>, string> = {
  default: 'text-gray-800 dark:text-gray-100',
  success: 'text-green-700 dark:text-green-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-red-700 dark:text-red-300',
  info: 'text-indigo-700 dark:text-indigo-300',
};

/**
 * Compact labeled actions dropdown for dense admin tables.
 */
export default function AdminRowActionsMenu({
  items,
  label = 'Actions',
  align = 'right',
  disabled = false,
  className = '',
  variant = 'labeled',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const visible = items.filter((item) => !item.hidden);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (visible.length === 0) {
    return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>;
  }

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={variant === 'icon' ? label : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={
          variant === 'icon'
            ? 'inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50'
            : 'inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--admin-text)] shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-50'
        }
      >
        {variant === 'icon' ? (
          <MoreVertical className="h-4 w-4" />
        ) : (
          <>
            {label}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute z-40 mt-1 min-w-[12.5rem] rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] py-1 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {visible.map((item) => {
            const Icon = item.icon;
            const busy = Boolean(item.loading);
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled || busy}
                onClick={() => {
                  if (item.disabled || busy) return;
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-50 ${
                  toneClass[item.tone || 'default']
                }`}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                ) : Icon ? (
                  <Icon className="w-4 h-4 shrink-0 opacity-80" />
                ) : (
                  <span className="w-4 h-4 shrink-0" />
                )}
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
