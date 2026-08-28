'use client';

import React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

/* ─── Buttons ─── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning';

const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: 'admin-btn admin-btn--primary',
  secondary: 'admin-btn admin-btn--secondary',
  ghost: 'admin-btn admin-btn--ghost',
  danger: 'admin-btn admin-btn--danger',
  warning: 'admin-btn admin-btn--warning',
};

type AdminButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
};

export function AdminButton({
  variant = 'secondary',
  icon: Icon,
  loading,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}: AdminButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonVariantClass[variant]} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="admin-btn__icon animate-spin" aria-hidden /> : Icon ? <Icon className="admin-btn__icon" aria-hidden /> : null}
      {children}
    </button>
  );
}

type AdminIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  active?: boolean;
  label: string;
};

export function AdminIconButton({ icon: Icon, active, label, className = '', ...props }: AdminIconButtonProps) {
  return (
    <button
      type="button"
      className={`admin-icon-btn ${active ? 'is-active' : ''} ${className}`.trim()}
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon className="h-[1.125rem] w-[1.125rem]" />
    </button>
  );
}

/* ─── Badges ─── */

type BadgeTone = 'neutral' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';

const badgeToneClass: Record<BadgeTone, string> = {
  neutral: 'admin-badge--neutral',
  indigo: 'admin-badge--indigo',
  emerald: 'admin-badge--emerald',
  amber: 'admin-badge--amber',
  rose: 'admin-badge--rose',
  violet: 'admin-badge--violet',
  sky: 'admin-badge--sky',
};

export function AdminBadge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return <span className={`admin-badge ${badgeToneClass[tone]} ${className}`.trim()}>{children}</span>;
}

/* ─── Layout primitives ─── */

export function AdminPage({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`admin-page ${className}`.trim()}>{children}</div>;
}

export function AdminStatGrid({ children }: { children: React.ReactNode }) {
  return <div className="admin-stat-grid">{children}</div>;
}

type AdminStatCardProps = {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: 'indigo' | 'emerald' | 'amber' | 'slate' | 'violet' | 'sky';
  hint?: string;
};

export function AdminStatCard({ label, value, icon: Icon, tone = 'indigo', hint }: AdminStatCardProps) {
  return (
    <article className={`admin-stat-card admin-stat-card--${tone}`}>
      <div className="admin-stat-card__glow" aria-hidden />
      <div className="admin-stat-card__top">
        <div className="admin-stat-card__icon">
          <Icon className="h-5 w-5" />
        </div>
        {hint ? <span className="admin-stat-card__hint">{hint}</span> : null}
      </div>
      <p className="admin-stat-card__label">{label}</p>
      <p className="admin-stat-card__value">{value}</p>
    </article>
  );
}

export function AdminPanel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`admin-panel ${className}`.trim()}>{children}</section>;
}

export function AdminPanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="admin-panel__header">
      <div className="admin-panel__header-text">
        <h2 className="admin-panel__title">{title}</h2>
        {description ? <p className="admin-panel__description">{description}</p> : null}
      </div>
      {actions ? <div className="admin-panel__actions">{actions}</div> : null}
    </header>
  );
}

export function AdminToolbar({ children }: { children: React.ReactNode }) {
  return <div className="admin-toolbar">{children}</div>;
}

export function AdminToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="admin-toolbar__group">{children}</div>;
}

export function AdminSearchField({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`admin-search ${className}`.trim()}>
      <svg className="admin-search__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="admin-search__input"
      />
    </div>
  );
}

export function AdminSelect({
  value,
  onChange,
  children,
  className = '',
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={`admin-select ${className}`.trim()}
    >
      {children}
    </select>
  );
}

export function AdminCheckboxPill({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="admin-check-pill">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function AdminPanelFooter({
  left,
  right,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <footer className="admin-panel__footer">
      <div>{left}</div>
      <div>{right}</div>
    </footer>
  );
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin-empty">
      <div className="admin-empty__icon">
        <Icon className="h-6 w-6" />
      </div>
      <p className="admin-empty__title">{title}</p>
      <p className="admin-empty__description">{description}</p>
      {action ? <div className="admin-empty__action">{action}</div> : null}
    </div>
  );
}

export function AdminModalOverlay({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="admin-modal-overlay">
      {onClose ? (
        <button type="button" className="admin-modal-overlay__backdrop" aria-label="Close dialog" onClick={onClose} />
      ) : null}
      {children}
    </div>
  );
}

export function AdminModalSurface({
  children,
  className = '',
  size = 'md',
}: {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return <div className={`admin-modal admin-modal--${size} ${className}`.trim()}>{children}</div>;
}
