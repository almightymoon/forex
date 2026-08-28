'use client';

import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  RotateCcw,
  Globe,
  Shield,
  Bell,
  CreditCard,
  Mail,
  Server,
  CheckCircle,
  User,
  Zap,
  AlertTriangle,
  Smartphone,
  Database,
  MessageCircle,
  Star,
  Download,
  Trash2,
  X,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { AdminSettings } from './types';
import AdminRowActionsMenu from './AdminRowActionsMenu';
import {
  AdminButton,
  AdminModalOverlay,
  AdminModalSurface,
  AdminPage,
  AdminPanel,
  AdminPanelHeader,
} from './AdminUI';

type SettingsSectionId =
  | 'general'
  | 'security'
  | 'notifications'
  | 'payments'
  | 'courses'
  | 'email'
  | 'danger';

const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
}[] = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'courses', label: 'Courses', icon: Server },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'danger', label: 'Backups & danger', icon: AlertTriangle, danger: true },
];

function SettingsToggle({
  checked,
  onChange,
  tone = 'default',
  label,
}: {
  checked: boolean;
  onChange: () => void;
  tone?: 'default' | 'danger' | 'success' | 'sky';
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`admin-toggle ${checked ? 'is-on' : ''} ${checked && tone !== 'default' ? `is-${tone}` : ''}`}
    >
      <span className="admin-toggle__knob" />
    </button>
  );
}

function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-settings-row">
      <div>
        <p className="admin-settings-row__title">{title}</p>
        {description ? <p className="admin-settings-row__desc">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function SettingsField({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`admin-field ${className}`.trim()}>
      <label className="admin-field__label">{label}</label>
      {children}
      {hint ? <p className="admin-field__hint">{hint}</p> : null}
    </div>
  );
}

function SettingsSubsection({ title }: { title: string }) {
  return <h4 className="admin-settings-subsection">{title}</h4>;
}

function SettingsCallout({
  icon: Icon,
  tone,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  tone: 'sky' | 'emerald';
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`admin-settings-callout admin-settings-callout--${tone}`}>
      <div className="admin-settings-callout__head">
        <div className={`admin-settings-callout__icon admin-settings-callout__icon--${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="admin-settings-callout__title">{title}</p>
          <p className="admin-settings-callout__desc">{description}</p>
        </div>
      </div>
      <div className="admin-settings-stack">{children}</div>
    </div>
  );
}

function SettingsNotifyRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="admin-settings-notify-row">
      <div className="admin-settings-notify-row__left">
        <div className="admin-settings-notify-row__icon">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="admin-settings-row__title">{title}</p>
          <p className="admin-settings-row__desc">{description}</p>
        </div>
      </div>
      <SettingsToggle label={title} checked={checked} onChange={onChange} />
    </div>
  );
}

interface SettingsProps {
  settings: AdminSettings;
  onSettingsChange: (category: string, field: string, value: any) => Promise<void>;
  onNestedSettingsChange: (category: string, nestedField: string, field: string, value: any) => void;
  onSaveSettings: () => Promise<void>;
  onResetSettings: () => void;
  settingsLoading: boolean;
  settingsSaved: boolean;
  onTestEmailConfig: () => Promise<void>;
  testingEmailConfig: boolean;
  onClearUserData: (confirmText: string) => Promise<void>;
  onDownloadCoursesBackup: () => Promise<void>;
  onRestoreCoursesBackup: (backup: any, confirmText: string) => Promise<void>;
  onDownloadFullBackup: () => Promise<void>;
  onRestoreFullBackup: (file: File, confirmText: string) => Promise<void>;
  onCreateStoredFullBackup: () => Promise<void>;
  onListStoredFullBackups: () => Promise<{ success: boolean; backups?: any[] }>;
  onDownloadStoredFullBackup: (fileName: string) => Promise<void>;
  onRestoreStoredFullBackup: (fileName: string, confirmText: string) => Promise<void>;
  onDeleteStoredFullBackup: (fileName: string) => Promise<void>;
}

export default function Settings({ 
  settings, 
  onSettingsChange, 
  onNestedSettingsChange, 
  onSaveSettings, 
  onResetSettings,
  settingsLoading,
  settingsSaved,
  onTestEmailConfig,
  testingEmailConfig,
  onClearUserData,
  onDownloadCoursesBackup,
  onRestoreCoursesBackup,
  onDownloadFullBackup,
  onRestoreFullBackup,
  onCreateStoredFullBackup,
  onListStoredFullBackups,
  onDownloadStoredFullBackup,
  onRestoreStoredFullBackup,
  onDeleteStoredFullBackup
}: SettingsProps) {
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [clearingData, setClearingData] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoringCourses, setRestoringCourses] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);
  const fullRestoreFileInputRef = useRef<HTMLInputElement | null>(null);
  const [fullRestoreConfirmText, setFullRestoreConfirmText] = useState('');
  const [restoringFull, setRestoringFull] = useState(false);
  const [fullRestoreError, setFullRestoreError] = useState<string | null>(null);
  const [fullBackupError, setFullBackupError] = useState<string | null>(null);
  const [storedBackups, setStoredBackups] = useState<any[]>([]);
  const [loadingStoredBackups, setLoadingStoredBackups] = useState(false);
  const [storedBackupError, setStoredBackupError] = useState<string | null>(null);
  const [creatingStoredBackup, setCreatingStoredBackup] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');

  const refreshStoredBackups = async () => {
    setStoredBackupError(null);
    setLoadingStoredBackups(true);
    try {
      const res = await onListStoredFullBackups();
      setStoredBackups(Array.isArray((res as any)?.backups) ? (res as any).backups : []);
    } catch (e: any) {
      setStoredBackupError(e?.message || 'Failed to load stored backups.');
    } finally {
      setLoadingStoredBackups(false);
    }
  };

  // Ensure settings object exists with default values
  const safeSettings = settings || {
    general: {
      platformName: 'LMS Platform',
      description: 'Learning Management System',
      defaultCurrency: 'USD',
      timezone: 'UTC',
      language: 'en',
      maintenanceMode: false,
      maintenanceAllowTeachers: false,
      defaultReferralCode: '',
      telegramInviteEnabled: true,
      telegramInviteUrl: '',
      trustpilotReviewUrl: 'https://www.trustpilot.com/evaluate/thefxnavigators.com',
      trustpilotAfsBccEmail: '',
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 60,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: false
      },
      loginAttempts: 5,
      accountLockDuration: 30
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: false,
      newUserRegistration: true,
      paymentReceived: true,
      systemAlerts: true,
      courseCompletions: true
    },
    payments: {
      stripeEnabled: true,
      paypalEnabled: false,
      easypaisaEnabled: false,
      jazzCashEnabled: false,
      currency: 'USD',
      taxRate: 0,
      promoCodesEnabled: true
    },
    courses: {
      autoApproval: false,
      maxFileSize: 10,
      allowedFileTypes: ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
      certificateEnabled: true,
      completionThreshold: 80
    },
    email: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: '',
      fromName: ''
    }
  };

  const statusPills = useMemo(() => {
    const smtpReady = Boolean(safeSettings.email.smtpHost && safeSettings.email.smtpUser);
    const gatewaysOn = [
      safeSettings.payments.stripeEnabled,
      safeSettings.payments.paypalEnabled,
      safeSettings.payments.easypaisaEnabled,
      safeSettings.payments.jazzCashEnabled,
    ].filter(Boolean).length;

    return [
      {
        label: 'Platform',
        value: safeSettings.general.platformName || 'Unnamed',
        tone: 'info' as const,
        icon: Sparkles,
      },
      {
        label: 'Maintenance',
        value: safeSettings.general.maintenanceMode ? 'Active' : 'Off',
        tone: safeSettings.general.maintenanceMode ? ('danger' as const) : ('ok' as const),
        icon: AlertTriangle,
      },
      {
        label: 'Email SMTP',
        value: smtpReady ? 'Configured' : 'Incomplete',
        tone: smtpReady ? ('ok' as const) : ('warn' as const),
        icon: Mail,
      },
      {
        label: 'Payments',
        value: `${gatewaysOn} gateway${gatewaysOn === 1 ? '' : 's'} on`,
        tone: gatewaysOn > 0 ? ('ok' as const) : ('warn' as const),
        icon: CreditCard,
      },
    ];
  }, [safeSettings]);

  const activeMeta = SETTINGS_SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AdminPage>
        <section className="admin-settings-hero">
          <div className="admin-settings-hero__glow" aria-hidden />
          <div className="admin-settings-hero__inner">
            <div>
              <p className="admin-settings-hero__eyebrow">Configuration</p>
              <h2 className="admin-settings-hero__title">{safeSettings.general.platformName || 'Platform settings'}</h2>
              <p className="admin-settings-hero__subtitle">
                Tune branding, security, payments, email delivery, and backups from one place. Changes apply after you save.
              </p>
            </div>
            <div className="admin-settings-hero__actions">
              <AdminButton variant="secondary" icon={RotateCcw} onClick={onResetSettings}>
                Reset
              </AdminButton>
              <AdminButton variant="primary" icon={Save} loading={settingsLoading} onClick={onSaveSettings}>
                {settingsLoading ? 'Saving…' : 'Save settings'}
              </AdminButton>
            </div>
          </div>
          {settingsSaved ? (
            <div className="admin-settings-saved mt-4">
              <CheckCircle className="h-4 w-4" />
              Settings saved successfully
            </div>
          ) : null}
        </section>

        <div className="admin-settings-status-grid">
          {statusPills.map((pill) => {
            const Icon = pill.icon;
            return (
              <div key={pill.label} className="admin-settings-status-pill">
                <div className={`admin-settings-status-pill__icon admin-settings-status-pill__icon--${pill.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="admin-settings-status-pill__label">{pill.label}</p>
                  <p className="admin-settings-status-pill__value truncate">{pill.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="admin-settings-layout">
          <nav className="admin-settings-nav" aria-label="Settings sections">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`admin-settings-nav__btn ${section.danger ? 'admin-settings-nav__btn--danger' : ''} ${
                    activeSection === section.id ? 'is-active' : ''
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className="admin-settings-content">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="admin-settings-section-panel"
            >
            {activeSection === 'general' && (
              <AdminPanel>
                <AdminPanelHeader title="General" description="Basic platform configuration" />
                <div className="admin-settings-panel-body admin-settings-stack">
                  <SettingsSubsection title="Branding" />
                  <SettingsField label="Platform name">
                    <input
                      type="text"
                      value={safeSettings.general.platformName}
                      onChange={(e) => onSettingsChange('general', 'platformName', e.target.value)}
                      className="admin-input"
                    />
                  </SettingsField>

                  <SettingsField label="Platform description">
                    <textarea
                      value={safeSettings.general.description}
                      onChange={(e) => onSettingsChange('general', 'description', e.target.value)}
                      rows={3}
                      className="admin-textarea"
                    />
                  </SettingsField>

                  <div className="admin-settings-grid-2">
                    <SettingsField label="Default currency">
                      <select
                        value={safeSettings.general.defaultCurrency}
                        onChange={(e) => onSettingsChange('general', 'defaultCurrency', e.target.value)}
                        className="admin-select"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="PKR">PKR (₨)</option>
                      </select>
                    </SettingsField>

                    <SettingsField label="Timezone">
                      <select
                        value={safeSettings.general.timezone}
                        onChange={(e) => onSettingsChange('general', 'timezone', e.target.value)}
                        className="admin-select"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">EST</option>
                        <option value="Europe/London">GMT</option>
                        <option value="Asia/Karachi">PKT</option>
                      </select>
                    </SettingsField>
                  </div>

                  <SettingsField
                    label="Default referral code"
                    hint="Leave empty to disable automatic assignment for signups without a code."
                  >
                    <input
                      type="text"
                      value={safeSettings.general.defaultReferralCode || ''}
                      onChange={(e) => onSettingsChange('general', 'defaultReferralCode', e.target.value.toUpperCase())}
                      placeholder="e.g. DEFAULT"
                      maxLength={20}
                      className="admin-input admin-input--uppercase"
                    />
                  </SettingsField>

                  <SettingsCallout
                    icon={MessageCircle}
                    tone="sky"
                    title="Telegram channel invite"
                    description="Floating popup on the landing page and other public pages."
                  >
              <SettingsRow title="Show invite popup" description="Floating popup on public pages">
                <SettingsToggle
                  label="Show invite popup"
                  checked={safeSettings.general.telegramInviteEnabled !== false}
                  tone="sky"
                  onChange={() =>
                    onSettingsChange(
                      'general',
                      'telegramInviteEnabled',
                      !(safeSettings.general.telegramInviteEnabled ?? true),
                    )
                  }
                />
              </SettingsRow>
                    <SettingsField
                      label="Telegram invite link"
                      hint={'Visitors who chose "Don\'t show again" must clear site data to see the popup again.'}
                    >
                      <input
                        type="url"
                        value={safeSettings.general.telegramInviteUrl || ''}
                        onChange={(e) => onSettingsChange('general', 'telegramInviteUrl', e.target.value.trim())}
                        placeholder="https://t.me/yourchannel"
                        className="admin-input"
                      />
                    </SettingsField>
                  </SettingsCallout>

                  <SettingsCallout
                    icon={Star}
                    tone="emerald"
                    title="Trustpilot reviews"
                    description="Review page link plus Trustpilot BCC for invited (not organic) review requests."
                  >
                    <SettingsField label="Trustpilot review page URL">
                      <input
                        type="url"
                        value={
                          safeSettings.general.trustpilotReviewUrl ||
                          'https://www.trustpilot.com/evaluate/thefxnavigators.com'
                        }
                        onChange={(e) => onSettingsChange('general', 'trustpilotReviewUrl', e.target.value.trim())}
                        placeholder="https://www.trustpilot.com/evaluate/thefxnavigators.com"
                        className="admin-input"
                      />
                    </SettingsField>
                    <SettingsField
                      label="Trustpilot AFS BCC email"
                      hint="Copy the unique AFS email from Trustpilot Business → Get reviews → Invitation methods."
                    >
                      <input
                        type="email"
                        value={safeSettings.general.trustpilotAfsBccEmail || ''}
                        onChange={(e) => onSettingsChange('general', 'trustpilotAfsBccEmail', e.target.value.trim())}
                        placeholder="your-unique-id@invite.trustpilot.com"
                        className="admin-input"
                      />
                    </SettingsField>
                  </SettingsCallout>

                  <SettingsSubsection title="Access control" />
            <SettingsRow title="Maintenance mode" description="Temporarily disable platform access">
              <SettingsToggle
                label="Maintenance mode"
                checked={!!safeSettings.general.maintenanceMode}
                tone="danger"
                onChange={() => onSettingsChange('general', 'maintenanceMode', !safeSettings.general.maintenanceMode)}
              />
            </SettingsRow>
            <SettingsRow
              title="Allow teachers during maintenance"
              description="Let teachers access the site while maintenance mode is on"
            >
              <SettingsToggle
                label="Allow teachers during maintenance"
                checked={!!safeSettings.general.maintenanceAllowTeachers}
                onChange={() =>
                  onSettingsChange('general', 'maintenanceAllowTeachers', !(safeSettings.general.maintenanceAllowTeachers ?? false))
                }
              />
            </SettingsRow>
                </div>
              </AdminPanel>
            )}

            {activeSection === 'security' && (
              <AdminPanel>
                <AdminPanelHeader title="Security" description="Platform security configuration" />
                <div className="admin-settings-panel-body admin-settings-stack">
                  <SettingsField label="Session timeout">
                    <select
                      value={safeSettings.security.sessionTimeout}
                      onChange={(e) => onSettingsChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      className="admin-select"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={480}>8 hours</option>
                    </select>
                  </SettingsField>

                  <div className="admin-settings-grid-2">
                    <SettingsField label="Max login attempts">
                      <input
                        type="number"
                        value={safeSettings.security.loginAttempts}
                        onChange={(e) => onSettingsChange('security', 'loginAttempts', parseInt(e.target.value))}
                        min={3}
                        max={10}
                        className="admin-input"
                      />
                    </SettingsField>
                    <SettingsField label="Lock duration (minutes)">
                      <input
                        type="number"
                        value={safeSettings.security.accountLockDuration}
                        onChange={(e) => onSettingsChange('security', 'accountLockDuration', parseInt(e.target.value))}
                        min={5}
                        max={1440}
                        className="admin-input"
                      />
                    </SettingsField>
                  </div>

                  <div className="admin-settings-policy-card">
                    <p className="admin-settings-subsection" style={{ border: 'none', padding: 0, marginBottom: '0.75rem' }}>
                      Password policy
                    </p>
                    <div className="admin-settings-policy-card__range">
                      <span className="text-sm text-[var(--admin-muted)]">
                        Minimum length: <strong>{safeSettings.security.passwordPolicy.minLength}</strong>
                      </span>
                      <input
                        type="range"
                        min={6}
                        max={20}
                        value={safeSettings.security.passwordPolicy.minLength}
                        onChange={(e) =>
                          onNestedSettingsChange('security', 'passwordPolicy', 'minLength', parseInt(e.target.value))
                        }
                      />
                    </div>
                    <div className="admin-settings-grid-2">
                      <label className="admin-settings-check">
                        <input
                          type="checkbox"
                          checked={safeSettings.security.passwordPolicy.requireUppercase}
                          onChange={(e) =>
                            onNestedSettingsChange('security', 'passwordPolicy', 'requireUppercase', e.target.checked)
                          }
                        />
                        Uppercase letters
                      </label>
                      <label className="admin-settings-check">
                        <input
                          type="checkbox"
                          checked={safeSettings.security.passwordPolicy.requireNumbers}
                          onChange={(e) =>
                            onNestedSettingsChange('security', 'passwordPolicy', 'requireNumbers', e.target.checked)
                          }
                        />
                        Numbers
                      </label>
                      <label className="admin-settings-check" style={{ gridColumn: '1 / -1' }}>
                        <input
                          type="checkbox"
                          checked={safeSettings.security.passwordPolicy.requireSymbols}
                          onChange={(e) =>
                            onNestedSettingsChange('security', 'passwordPolicy', 'requireSymbols', e.target.checked)
                          }
                        />
                        Special characters (!@#$%^&*)
                      </label>
                    </div>
                  </div>
                </div>
              </AdminPanel>
            )}

            {activeSection === 'notifications' && (
              <AdminPanel>
                <AdminPanelHeader title="Notifications" description="Configure notification preferences" />
                <div className="admin-settings-panel-body admin-settings-stack">
            {[
              { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send email alerts for events', icon: Mail },
              { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Send SMS for critical alerts', icon: Smartphone },
              { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications', icon: Zap },
              { key: 'newUserRegistration', label: 'New User Registration', desc: 'Notify when new users join', icon: User },
              { key: 'paymentReceived', label: 'Payment Received', desc: 'Notify when payments are completed', icon: CreditCard },
              { key: 'systemAlerts', label: 'System Alerts', desc: 'Critical system notifications', icon: AlertTriangle },
              { key: 'courseCompletions', label: 'Course Completions', desc: 'Notify when courses are completed', icon: CheckCircle }
            ].map((setting) => (
              <SettingsNotifyRow
                key={setting.key}
                icon={setting.icon}
                title={setting.label}
                description={setting.desc}
                checked={!!safeSettings.notifications[setting.key as keyof typeof safeSettings.notifications]}
                onChange={() =>
                  onSettingsChange(
                    'notifications',
                    setting.key,
                    !safeSettings.notifications[setting.key as keyof typeof safeSettings.notifications],
                  )
                }
              />
            ))}
                </div>
              </AdminPanel>
            )}

            {activeSection === 'payments' && (
              <AdminPanel>
                <AdminPanelHeader title="Payments" description="Configure payment gateways and options" />
                <div className="admin-settings-panel-body admin-settings-stack">
                  <div className="admin-settings-grid-2">
                    <SettingsField label="Default currency">
                      <select
                        value={safeSettings.payments.currency}
                        onChange={(e) => onSettingsChange('payments', 'currency', e.target.value)}
                        className="admin-select"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="PKR">PKR (₨)</option>
                      </select>
                    </SettingsField>
                    <SettingsField label="Tax rate (%)">
                      <input
                        type="number"
                        value={safeSettings.payments.taxRate}
                        onChange={(e) => onSettingsChange('payments', 'taxRate', parseFloat(e.target.value))}
                        min={0}
                        max={50}
                        step={0.1}
                        className="admin-input"
                      />
                    </SettingsField>
                  </div>

                  <SettingsRow title="Promo codes" description="Allow customers to apply promotional codes at checkout">
                    <SettingsToggle
                      label="Promo codes"
                      checked={!!safeSettings.payments.promoCodesEnabled}
                      tone="success"
                      onChange={() =>
                        onSettingsChange('payments', 'promoCodesEnabled', !safeSettings.payments.promoCodesEnabled)
                      }
                    />
                  </SettingsRow>

                  <SettingsSubsection title="Payment gateways" />
              {[
                { key: 'stripeEnabled', label: 'Stripe', desc: 'Credit card payments' },
                { key: 'paypalEnabled', label: 'PayPal', desc: 'PayPal wallet payments' },
                { key: 'easypaisaEnabled', label: 'EasyPaisa', desc: 'Local mobile payments' },
                { key: 'jazzCashEnabled', label: 'Jazz Cash', desc: 'Local mobile payments' }
              ].map((gateway) => (
                <SettingsRow key={gateway.key} title={gateway.label} description={gateway.desc}>
                  <SettingsToggle
                    label={gateway.label}
                    checked={!!safeSettings.payments[gateway.key as keyof typeof safeSettings.payments]}
                    tone="success"
                    onChange={() =>
                      onSettingsChange(
                        'payments',
                        gateway.key,
                        !safeSettings.payments[gateway.key as keyof typeof safeSettings.payments],
                      )
                    }
                  />
                </SettingsRow>
              ))}
                </div>
              </AdminPanel>
            )}

            {activeSection === 'courses' && (
              <AdminPanel>
                <AdminPanelHeader title="Courses" description="Configure course management options" />
                <div className="admin-settings-panel-body admin-settings-stack">
            <SettingsRow title="Auto-approval" description="Automatically approve new courses">
              <SettingsToggle
                label="Auto-approval"
                checked={!!safeSettings.courses.autoApproval}
                onChange={() => onSettingsChange('courses', 'autoApproval', !safeSettings.courses.autoApproval)}
              />
            </SettingsRow>
            <div className="admin-settings-grid-2">
              <SettingsField label="Max file size (MB)">
                <input
                  type="number"
                  value={safeSettings.courses.maxFileSize}
                  onChange={(e) => onSettingsChange('courses', 'maxFileSize', parseInt(e.target.value))}
                  min={1}
                  max={1000}
                  className="admin-input"
                />
              </SettingsField>
              <SettingsField label="Completion threshold (%)">
                <input
                  type="number"
                  value={safeSettings.courses.completionThreshold}
                  onChange={(e) => onSettingsChange('courses', 'completionThreshold', parseInt(e.target.value))}
                  min={50}
                  max={100}
                  className="admin-input"
                />
              </SettingsField>
            </div>
            <SettingsRow title="Certificates" description="Enable course completion certificates">
              <SettingsToggle
                label="Certificates"
                checked={!!safeSettings.courses.certificateEnabled}
                onChange={() => onSettingsChange('courses', 'certificateEnabled', !safeSettings.courses.certificateEnabled)}
              />
            </SettingsRow>
                </div>
              </AdminPanel>
            )}

            {activeSection === 'email' && (
              <AdminPanel>
                <AdminPanelHeader title="Email" description="SMTP settings for email notifications" />
                <div className="admin-settings-panel-body admin-settings-stack">
                  <div className="admin-settings-grid-2">
                    <SettingsField label="SMTP host">
                      <input
                        type="text"
                        value={safeSettings.email.smtpHost}
                        onChange={(e) => onSettingsChange('email', 'smtpHost', e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="admin-input"
                      />
                    </SettingsField>
                    <SettingsField label="SMTP port">
                      <input
                        type="number"
                        value={safeSettings.email.smtpPort}
                        onChange={(e) => onSettingsChange('email', 'smtpPort', parseInt(e.target.value))}
                        placeholder="587"
                        className="admin-input"
                      />
                    </SettingsField>
                  </div>

                  <div className="admin-settings-grid-2">
                    <SettingsField label="SMTP username">
                      <input
                        type="text"
                        value={safeSettings.email.smtpUser}
                        onChange={(e) => onSettingsChange('email', 'smtpUser', e.target.value)}
                        placeholder="your-email@gmail.com"
                        className="admin-input"
                      />
                    </SettingsField>
                    <SettingsField label="SMTP password">
                      <input
                        type="password"
                        value={safeSettings.email.smtpPassword}
                        onChange={(e) => onSettingsChange('email', 'smtpPassword', e.target.value)}
                        placeholder="App password"
                        className="admin-input"
                      />
                    </SettingsField>
                  </div>

                  <div className="admin-settings-grid-2">
                    <SettingsField
                      label="From email"
                      hint="For Gmail this must match the SMTP username (or a verified alias)."
                    >
                      <input
                        type="email"
                        value={safeSettings.email.fromEmail}
                        onChange={(e) => onSettingsChange('email', 'fromEmail', e.target.value)}
                        placeholder="thefxnavigators@gmail.com"
                        className="admin-input"
                      />
                    </SettingsField>
                    <SettingsField label="From name">
                      <input
                        type="text"
                        value={safeSettings.email.fromName}
                        onChange={(e) => onSettingsChange('email', 'fromName', e.target.value)}
                        placeholder="Forex Navigators"
                        className="admin-input"
                      />
                    </SettingsField>
                  </div>

                  <div className="pt-2 border-t border-[var(--admin-border)]">
              <AdminButton
                variant="primary"
                icon={Server}
                loading={testingEmailConfig}
                onClick={onTestEmailConfig}
              >
                {testingEmailConfig ? 'Sending test…' : 'Send test email to me'}
              </AdminButton>
            </div>
                </div>
              </AdminPanel>
            )}

            {activeSection === 'danger' && (
              <AdminPanel className="border-rose-200/80 dark:border-rose-900/40">
                <AdminPanelHeader
                  title="Backups & danger zone"
                  description="Full platform backups, course backups, and destructive reset actions."
                />
                <div className="admin-settings-panel-body admin-settings-stack">
                  <div className="admin-settings-danger-grid">
                    <div className="admin-settings-danger-card admin-settings-danger-card--wide">
                      <p className="admin-settings-danger-card__title">
                        <Database className="h-4 w-4 text-indigo-500" />
                        Full platform backups
                      </p>
                      <p className="admin-settings-danger-card__desc">
                        Create server-stored snapshots or download a gzip export of all collections.
                      </p>
                      <div className="admin-settings-danger-card__body">
            <AdminButton
              variant="primary"
              icon={Database}
              loading={creatingStoredBackup}
              onClick={async () => {
                setStoredBackupError(null);
                try {
                  setCreatingStoredBackup(true);
                  await onCreateStoredFullBackup();
                  await refreshStoredBackups();
                } catch (err: any) {
                  setStoredBackupError(err?.message || 'Failed to create stored backup.');
                } finally {
                  setCreatingStoredBackup(false);
                }
              }}
            >
              {creatingStoredBackup ? 'Creating stored backup…' : 'Create stored full backup'}
            </AdminButton>

            <AdminButton
              variant="secondary"
              icon={Database}
              loading={loadingStoredBackups}
              onClick={refreshStoredBackups}
            >
              {loadingStoredBackups ? 'Loading backups…' : 'Refresh stored backups'}
            </AdminButton>

            {storedBackupError && (
              <div className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-700 dark:text-red-300">{storedBackupError}</p>
              </div>
            )}

            {storedBackups.length > 0 && (
              <div className="admin-settings-callout admin-settings-callout--indigo">
                <p className="text-xs font-semibold text-[var(--admin-text)] mb-2">Stored backups</p>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {storedBackups.map((b) => (
                    <div key={b.fileName} className="admin-settings-backup-row">
                      <div className="admin-settings-backup-row__meta">
                        <p className="admin-settings-backup-row__name">{b.fileName}</p>
                        <p className="admin-settings-backup-row__sub">
                          {b.exportedAt || b.createdAt || '—'} · {Math.round((Number(b.sizeBytes || 0) / 1024 / 1024) * 10) / 10} MB
                        </p>
                      </div>
                      <AdminRowActionsMenu
                        variant="icon"
                        align="right"
                        label={`Actions for ${b.fileName}`}
                        items={[
                          {
                            id: 'download',
                            label: 'Download',
                            icon: Download,
                            tone: 'info',
                            onClick: () => onDownloadStoredFullBackup(b.fileName),
                          },
                          {
                            id: 'restore',
                            label: 'Restore',
                            icon: RotateCcw,
                            tone: 'warning',
                            loading: restoringFull,
                            onClick: async () => {
                              setFullRestoreError(null);
                              const confirm = String(fullRestoreConfirmText || '').trim().toUpperCase();
                              if (confirm !== 'RESTORE') {
                                setFullRestoreError('Type RESTORE in the box below before restoring.');
                                return;
                              }
                              try {
                                setRestoringFull(true);
                                await onRestoreStoredFullBackup(b.fileName, 'RESTORE');
                              } catch (err: any) {
                                setFullRestoreError(err?.message || 'Failed to restore stored backup.');
                              } finally {
                                setRestoringFull(false);
                              }
                            },
                          },
                          {
                            id: 'delete',
                            label: 'Delete backup',
                            icon: Trash2,
                            tone: 'danger',
                            onClick: async () => {
                              const ok = window.confirm(
                                `Delete backup ${b.fileName}?\n\nThis only deletes the stored backup file.`,
                              );
                              if (!ok) return;
                              try {
                                setStoredBackupError(null);
                                await onDeleteStoredFullBackup(b.fileName);
                                await refreshStoredBackups();
                              } catch (err: any) {
                                setStoredBackupError(err?.message || 'Failed to delete stored backup.');
                              }
                            },
                          },
                        ]}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-[var(--admin-muted)]">
                  Tip: type <span className="font-bold">RESTORE</span> once below, then you can restore any backup.
                </p>
              </div>
            )}

            <AdminButton
              variant="primary"
              icon={Database}
              onClick={async () => {
                setFullBackupError(null);
                try {
                  await onDownloadFullBackup();
                } catch (err: any) {
                  setFullBackupError(err?.message || 'Failed to download full backup.');
                }
              }}
            >
              Download full platform backup
            </AdminButton>
            {fullBackupError && (
              <div className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-700 dark:text-red-300">{fullBackupError}</p>
              </div>
            )}

            <AdminButton variant="secondary" icon={Database} onClick={() => fullRestoreFileInputRef.current?.click()}>
              Restore full platform backup
            </AdminButton>
            <input
              ref={fullRestoreFileInputRef}
              type="file"
              accept="application/json,application/gzip,.json,.gz"
              className="hidden"
              onChange={async (e) => {
                setFullRestoreError(null);
                const inputEl = e.target as HTMLInputElement;
                const file = inputEl.files?.[0];
                if (!file) return;
                try {
                  setRestoringFull(true);
                  const confirm = String(fullRestoreConfirmText || '').trim().toUpperCase();
                  if (confirm !== 'RESTORE') {
                    setFullRestoreError('Type RESTORE in the box below before uploading.');
                    return;
                  }
                  await onRestoreFullBackup(file, 'RESTORE');
                } catch (err: any) {
                  setFullRestoreError(err?.message || 'Failed to restore full backup.');
                } finally {
                  try {
                    inputEl.value = '';
                  } catch {}
                  setRestoringFull(false);
                }
              }}
            />

            <div className="admin-settings-callout admin-settings-callout--indigo">
              <p className="text-xs text-[var(--admin-muted)]">
                To restore the full platform, type <span className="font-bold">RESTORE</span> then upload the backup file.
                This replaces users, payments, referrals, balances, and everything else.
              </p>
              <input
                value={fullRestoreConfirmText}
                onChange={(e) => setFullRestoreConfirmText(e.target.value)}
                placeholder="RESTORE"
                className="admin-input mt-2"
                disabled={restoringFull}
              />
              {fullRestoreError && (
                <p className="mt-2 text-xs text-red-700 dark:text-red-300">{fullRestoreError}</p>
              )}
              {restoringFull && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Restoring full backup...</p>
              )}
            </div>
                      </div>
                    </div>

                    <div className="admin-settings-danger-card">
                      <p className="admin-settings-danger-card__title">
                        <Server className="h-4 w-4 text-slate-500" />
                        Course backups
                      </p>
                      <p className="admin-settings-danger-card__desc">Export or restore course content as JSON.</p>
                      <div className="admin-settings-danger-card__body">
                        <AdminButton
                          variant="secondary"
                          icon={Save}
                          onClick={async () => {
                            setBackupError(null);
                            try {
                              await onDownloadCoursesBackup();
                            } catch (err: any) {
                              setBackupError(err?.message || 'Failed to download backup.');
                            }
                          }}
                        >
                          Download courses backup
                        </AdminButton>
                        {backupError ? (
                          <div className="admin-settings-callout admin-settings-callout--danger">
                            <p className="text-xs text-red-700 dark:text-red-300">{backupError}</p>
                          </div>
                        ) : null}

                        <AdminButton variant="secondary" icon={Server} onClick={() => restoreFileInputRef.current?.click()}>
                          Restore courses backup
                        </AdminButton>
                        <input
                          ref={restoreFileInputRef}
                          type="file"
                          accept="application/json"
                          className="hidden"
                          onChange={async (e) => {
                            setRestoreError(null);
                            const inputEl = e.target as HTMLInputElement;
                            const file = inputEl.files?.[0];
                            if (!file) return;
                            try {
                              setRestoringCourses(true);
                              const text = await file.text();
                              const backup = JSON.parse(text);
                              const confirm = String(restoreConfirmText || '').trim().toUpperCase();
                              if (confirm !== 'RESTORE') {
                                setRestoreError('Type RESTORE in the box below before uploading.');
                                return;
                              }
                              await onRestoreCoursesBackup(backup, 'RESTORE');
                            } catch (err: any) {
                              setRestoreError(err?.message || 'Failed to restore backup.');
                            } finally {
                              try {
                                inputEl.value = '';
                              } catch {}
                              setRestoringCourses(false);
                            }
                          }}
                        />

                        <div className="admin-settings-callout">
                          <p className="text-xs text-[var(--admin-muted)]">
                            To restore courses, type <span className="font-bold">RESTORE</span> then upload the backup file.
                          </p>
                          <input
                            value={restoreConfirmText}
                            onChange={(e) => setRestoreConfirmText(e.target.value)}
                            placeholder="RESTORE"
                            className="admin-input mt-2"
                            disabled={restoringCourses}
                          />
                          {restoreError ? <p className="mt-2 text-xs text-red-700 dark:text-red-300">{restoreError}</p> : null}
                          {restoringCourses ? (
                            <p className="mt-2 text-xs text-[var(--admin-muted)]">Restoring…</p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="admin-settings-danger-card">
                      <p className="admin-settings-danger-card__title">
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                        Clear user data
                      </p>
                      <p className="admin-settings-danger-card__desc">
                        Permanently delete user accounts and transactional history. Settings and course content remain.
                      </p>
                      <div className="admin-settings-danger-card__body">
                        <ul className="space-y-1 pl-4 text-xs text-[var(--admin-muted)] list-disc">
                          <li>Deletes users (keeps Admin/Teacher accounts)</li>
                          <li>Deletes payments, withdrawals, commissions, referrals, logs, and more</li>
                        </ul>
                        <AdminButton
                          variant="danger"
                          icon={RotateCcw}
                          onClick={() => {
                            setResetConfirmText('');
                            setResetError(null);
                            setShowResetModal(true);
                          }}
                        >
                          Clear user data
                        </AdminButton>
                      </div>
                    </div>
                  </div>
                </div>
              </AdminPanel>
            )}
            </motion.div>

            <div className="admin-settings-sticky-save">
              <p className="admin-settings-sticky-save__hint">
                Editing <strong>{activeMeta.label}</strong> — remember to save your changes.
              </p>
              <div className="admin-settings-sticky-save__actions">
                <AdminButton variant="ghost" icon={RotateCcw} onClick={onResetSettings}>
                  Reset
                </AdminButton>
                <AdminButton variant="primary" icon={Save} loading={settingsLoading} onClick={onSaveSettings}>
                  {settingsLoading ? 'Saving…' : 'Save settings'}
                </AdminButton>
              </div>
            </div>
          </div>
        </div>
      </AdminPage>

      {showResetModal && (
        <AdminModalOverlay onClose={() => setShowResetModal(false)}>
          <AdminModalSurface size="sm">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Clear all user data?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    This will permanently delete user accounts and history. Settings (SMTP etc.) stay intact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 admin-settings-callout admin-settings-callout--danger">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Type <span className="font-bold">RESET</span> to confirm.
                </p>
                <input
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESET"
                  className="admin-input mt-3"
                />
                {resetError ? <p className="mt-3 text-sm text-red-700 dark:text-red-300">{resetError}</p> : null}
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <AdminButton variant="secondary" onClick={() => setShowResetModal(false)} disabled={clearingData}>
                  Cancel
                </AdminButton>
                <AdminButton
                  variant="danger"
                  icon={AlertTriangle}
                  loading={clearingData}
                  disabled={clearingData || resetConfirmText.trim().toUpperCase() !== 'RESET'}
                  onClick={async () => {
                    setResetError(null);
                    const txt = resetConfirmText.trim().toUpperCase();
                    if (txt !== 'RESET') {
                      setResetError('Please type RESET exactly to continue.');
                      return;
                    }
                    setClearingData(true);
                    try {
                      await onClearUserData('RESET');
                      setShowResetModal(false);
                    } catch (e: any) {
                      setResetError(e?.message || 'Failed to clear user data.');
                    } finally {
                      setClearingData(false);
                    }
                  }}
                >
                  {clearingData ? 'Clearing…' : 'Yes, clear data'}
                </AdminButton>
              </div>
            </div>
          </AdminModalSurface>
        </AdminModalOverlay>
      )}
    </motion.div>
  );
}
