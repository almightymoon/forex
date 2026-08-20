'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Mail,
  Send,
  Eye,
  Code,
  Save,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  X,
  CheckCircle,
  FileText,
  History,
  Beaker,
  MousePointerClick,
  Table2,
  Plus,
  Download,
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Minimize2,
  ExternalLink,
  Columns,
  Square,
} from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { fetchWithTokenRefresh } from '../../../utils/tokenUtils';
import { showToast } from '../../../utils/toast';
import EmailHistory from './EmailHistory';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

type Audience = 'all' | 'student' | 'teacher' | 'admin' | 'custom' | 'emails';

type UserRow = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  isActive?: boolean;
};

type EmailTpl = {
  id: string;
  _id?: string;
  source: 'builtin' | 'custom';
  name: string;
  subject: string;
  description?: string;
  category?: string;
  html: string;
  text?: string;
  variables?: string[];
};

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ['link'],
    ['clean'],
  ],
};

const STARTER_HTML = `<h2>Hello {{firstName}},</h2>
<p>We have an update for you from Forex Navigators.</p>
<p>Write your message here. You can use variables like <strong>{{firstName}}</strong>, <strong>{{lastName}}</strong>, and <strong>{{email}}</strong>.</p>
<p>Best regards,<br>The Forex Navigators Team</p>`;

type ActionButton = { id: string; label: string; color: string };

type CampaignRow = {
  _id: string;
  subject: string;
  isTest?: boolean;
  recipientCount?: number;
  responseCount?: number;
  sentAt?: string;
  createdAt?: string;
  buttons?: ActionButton[];
};

type CampaignClick = {
  _id: string;
  name?: string;
  email: string;
  buttonId?: string;
  buttonLabel?: string;
  clickedAt: string;
};

const DEFAULT_BUTTONS: ActionButton[] = [
  { id: 'confirm', label: 'Reserve my spot', color: '#dc2626' },
];

function previewButtonMarkup(buttons: ActionButton[]) {
  const cells = buttons
    .filter((button) => button.label.trim())
    .map(
      (button) =>
        `<td style="padding:6px;"><a href="#" style="display:inline-block;background:${button.color || '#dc2626'};color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${button.label}</a></td>`
    )
    .join('');
  if (!cells) return '';
  return `<div style="text-align:center;margin:28px 0 8px;"><table role="presentation" cellspacing="0" cellpadding="0" align="center"><tr>${cells}</tr></table></div>`;
}

function authJson(method: string, body?: unknown): RequestInit {
  return {
    method,
    body: body == null ? undefined : JSON.stringify(body),
  };
}

function interpolate(html: string, vars: Record<string, string>) {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

export default function EmailServices() {
  const [tab, setTab] = useState<'compose' | 'templates' | 'history' | 'entries'>('compose');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [builtin, setBuiltin] = useState<EmailTpl[]>([]);
  const [custom, setCustom] = useState<EmailTpl[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState(STARTER_HTML);
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');
  const [showPreview, setShowPreview] = useState(true);
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewLayout, setPreviewLayout] = useState<'split' | 'stacked' | 'preview'>('split');
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [audience, setAudience] = useState<Audience>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [customEmails, setCustomEmails] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ total: number; successful: number; failed: number } | null>(null);
  const [trackButtons, setTrackButtons] = useState(false);
  const [buttons, setButtons] = useState<ActionButton[]>(DEFAULT_BUTTONS);
  const [confirmationMessage, setConfirmationMessage] = useState('Thanks, your response has been recorded.');
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<CampaignRow | null>(null);
  const [clicks, setClicks] = useState<CampaignClick[]>([]);
  const [clickTotal, setClickTotal] = useState(0);
  const [sheetSearch, setSheetSearch] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetchWithTokenRefresh(buildApiUrl('api/admin/users'));
      if (!res.ok) return;
      const data = await res.json();
      const list: UserRow[] = Array.isArray(data) ? data : data.users || [];
      setUsers(list.filter((u) => u.email));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetchWithTokenRefresh(buildApiUrl('api/admin/email/templates'));
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setBuiltin(data.builtin || []);
      setCustom(data.custom || []);
    } catch (error) {
      console.error(error);
      showToast('Could not load email templates', 'error');
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await fetchWithTokenRefresh(buildApiUrl('api/admin/email/campaigns?includeTests=1'));
      if (!res.ok) throw new Error('Failed to load campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error(error);
      showToast('Could not load email entries', 'error');
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const openSheet = useCallback(async (campaign: CampaignRow, search = '') => {
    setActiveCampaign(campaign);
    setSheetLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (search.trim()) params.set('q', search.trim());
      const res = await fetchWithTokenRefresh(
        buildApiUrl(`api/admin/email/campaigns/${campaign._id}/clicks?${params}`)
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load entries');
      setClicks(data.clicks || []);
      setClickTotal(data.total || 0);
      if (data.campaign) setActiveCampaign((prev) => ({ ...(prev || campaign), ...data.campaign }));
    } catch (error) {
      console.error(error);
      showToast('Could not load entries', 'error');
    } finally {
      setSheetLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadUsers(), loadTemplates()]);
      setLoading(false);
    })();
  }, [loadUsers, loadTemplates]);

  const roleCount = useCallback(
    (role?: string) => users.filter((u) => (role ? u.role === role : true) && u.isActive !== false).length,
    [users]
  );

  const recipientEstimate = useMemo(() => {
    if (audience === 'emails') {
      return customEmails.split(/[,;\s]+/).filter((e) => e.includes('@')).length;
    }
    if (audience === 'custom') return selectedUsers.length;
    if (audience === 'student') return roleCount('student');
    if (audience === 'teacher') return roleCount('teacher');
    if (audience === 'admin') return roleCount('admin');
    return roleCount();
  }, [audience, customEmails, selectedUsers.length, roleCount]);

  const previewHtml = useMemo(() => {
    const sample = users[0];
    let rendered = interpolate(html, {
      firstName: sample?.firstName || 'Alex',
      lastName: sample?.lastName || 'Trader',
      email: sample?.email || 'alex@example.com',
      userName: `${sample?.firstName || 'Alex'} ${sample?.lastName || 'Trader'}`,
      companyName: 'Forex Navigators',
    });
    if (trackButtons) {
      const firstButton = buttons.find((button) => button.label.trim());
      if (firstButton) {
        const trackHref = '#preview-track';
        rendered = interpolate(rendered, {
          track: trackHref,
          trackUrl: trackHref,
          [`button_${firstButton.id}`]: trackHref,
        });
      }
      const markup = previewButtonMarkup(buttons);
      if (markup) {
        if (/\{\{\s*actionButtons\s*\}\}/.test(rendered)) {
          rendered = rendered.replace(/\{\{\s*actionButtons\s*\}\}/g, markup);
        } else if (!/\{\{\s*button_[a-zA-Z0-9_-]+\s*\}\}/.test(rendered) && !/<a\b[^>]*href=/i.test(rendered)) {
          rendered = `${rendered}${markup}`;
        }
      }
    }
    return rendered;
  }, [html, users, trackButtons, buttons]);

  const previewFrameWidth =
    previewWidth === 'mobile' ? 390 : previewWidth === 'tablet' ? 768 : '100%';

  const openPreviewTab = () => {
    const tab = window.open('', '_blank');
    if (!tab) {
      showToast('Pop-up blocked — allow pop-ups to open preview', 'error');
      return;
    }
    tab.document.open();
    tab.document.write(previewHtml);
    tab.document.close();
    tab.document.title = subject || 'Email preview';
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users.slice(0, 80);
    return users
      .filter((u) =>
        `${u.firstName || ''} ${u.lastName || ''} ${u.email} ${u.role}`.toLowerCase().includes(q)
      )
      .slice(0, 80);
  }, [users, userSearch]);

  const applyTemplate = (tpl: EmailTpl) => {
    setSubject(tpl.subject || tpl.name || '');
    setHtml(tpl.html || '');
    setEditingTemplateId(tpl.source === 'custom' ? tpl.id || tpl._id || null : null);
    setTemplateName(tpl.source === 'custom' ? tpl.name : '');
    const looksLikeFullDocument = /<!DOCTYPE|<html[\s>]/i.test(tpl.html || '');
    setEditorMode(looksLikeFullDocument ? 'html' : 'visual');
    setTab('compose');
    showToast(`Loaded “${tpl.name}”`, 'success');
  };

  const collectEmails = () =>
    customEmails
      .split(/[,;\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes('@'));

  const sendPayload = () => ({
    subject: subject.trim(),
    html,
    audience,
    userIds: audience === 'custom' ? selectedUsers : undefined,
    emails: audience === 'emails' || collectEmails().length ? collectEmails() : undefined,
    trackButtons,
    buttons: trackButtons ? buttons.filter((button) => button.label.trim()) : undefined,
    confirmationMessage: trackButtons ? confirmationMessage.trim() : undefined,
  });

  const handleSend = async () => {
    if (!subject.trim() || !html.trim()) {
      showToast('Subject and email body are required', 'error');
      return;
    }
    if (audience === 'custom' && selectedUsers.length === 0) {
      showToast('Select at least one user', 'error');
      return;
    }
    if (audience === 'emails' && collectEmails().length === 0) {
      showToast('Add at least one email address', 'error');
      return;
    }
    if (trackButtons && buttons.filter((button) => button.label.trim()).length === 0) {
      showToast('Add at least one button label to record clicks', 'error');
      return;
    }
    if (!window.confirm(`Send this email to about ${recipientEstimate} recipient(s)?`)) return;

    setSending(true);
    setSendResult(null);
    try {
      const res = await fetchWithTokenRefresh(buildApiUrl('api/admin/email/send'), authJson('POST', sendPayload()));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || data.error || 'Failed to send emails', 'error');
        return;
      }
      setSendResult({ total: data.total || 0, successful: data.successful || 0, failed: data.failed || 0 });
      showToast(
        data.campaignId
          ? `${data.message || 'Emails sent'} Responses will appear under Entries.`
          : data.message || 'Emails sent',
        'success'
      );
    } catch (error) {
      console.error(error);
      showToast('Failed to send emails', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleTest = async () => {
    if (!subject.trim() || !html.trim()) {
      showToast('Subject and email body are required', 'error');
      return;
    }
    setTesting(true);
    try {
      const res = await fetchWithTokenRefresh(
        buildApiUrl('api/admin/email/test'),
        authJson('POST', {
          subject: subject.trim(),
          html,
          trackButtons,
          buttons: trackButtons ? buttons.filter((button) => button.label.trim()) : undefined,
          confirmationMessage: trackButtons ? confirmationMessage.trim() : undefined,
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || data.error || 'Test email failed', 'error');
        return;
      }
      showToast(`Test email sent to ${data.recipient}`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Test email failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !subject.trim() || !html.trim()) {
      showToast('Template name, subject, and HTML are required', 'error');
      return;
    }
    setSavingTemplate(true);
    try {
      const payload = { name: templateName.trim(), subject: subject.trim(), html };
      const url = editingTemplateId
        ? buildApiUrl(`api/admin/email/templates/${editingTemplateId}`)
        : buildApiUrl('api/admin/email/templates');
      const res = await fetchWithTokenRefresh(url, authJson(editingTemplateId ? 'PUT' : 'POST', payload));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || data.error || 'Could not save template', 'error');
        return;
      }
      if (data.template?._id) setEditingTemplateId(String(data.template._id));
      showToast(editingTemplateId ? 'Template updated' : 'Template saved', 'success');
      setShowSaveModal(false);
      await loadTemplates();
    } catch (error) {
      console.error(error);
      showToast('Could not save template', 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      const res = await fetchWithTokenRefresh(buildApiUrl(`api/admin/email/templates/${id}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      showToast('Template deleted', 'success');
      if (editingTemplateId === id) setEditingTemplateId(null);
      await loadTemplates();
    } catch {
      showToast('Could not delete template', 'error');
    }
  };

  const updateButton = (index: number, patch: Partial<ActionButton>) => {
    setButtons((prev) => prev.map((button, i) => (i === index ? { ...button, ...patch } : button)));
  };

  const addButton = () => {
    if (buttons.length >= 6) return;
    const n = buttons.length + 1;
    setButtons((prev) => [...prev, { id: `btn_${n}`, label: `Option ${n}`, color: '#4b5563' }]);
  };

  const exportCsv = async () => {
    if (!activeCampaign?._id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/email/campaigns/${activeCampaign._id}/export`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(activeCampaign.subject || 'campaign').replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}-entries.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Could not export CSV', 'error');
    }
  };

  const tabs = [
    { id: 'compose' as const, label: 'Compose', icon: Mail },
    { id: 'templates' as const, label: 'Templates', icon: FileText },
    { id: 'entries' as const, label: 'Entries', icon: Table2 },
    { id: 'history' as const, label: 'History', icon: History },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Email services</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Send HTML emails to everyone, a role, selected users, or any address. Use {'{{firstName}}'} and other
            variables for personalization. Turn on tracked buttons to collect Confirm / Decline style responses in a
            spreadsheet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadUsers();
            loadTemplates();
            if (tab === 'entries') {
              if (activeCampaign) openSheet(activeCampaign, sheetSearch);
              else loadCampaigns();
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                if (item.id === 'entries' && !activeCampaign) loadCampaigns();
              }}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                tab === item.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'compose' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Recipients</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Everyone ({roleCount()})</option>
                <option value="student">Students ({roleCount('student')})</option>
                <option value="teacher">Teachers ({roleCount('teacher')})</option>
                <option value="admin">Admins ({roleCount('admin')})</option>
                <option value="custom">Selected users</option>
                <option value="emails">Custom email addresses</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">About {recipientEstimate} recipient(s). Unreachable addresses are skipped.</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {audience === 'custom' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select users ({selectedUsers.length})
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users"
                    className="rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <label key={user._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() =>
                        setSelectedUsers((prev) =>
                          prev.includes(user._id) ? prev.filter((id) => id !== user._id) : [...prev, user._id]
                        )
                      }
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {user.email} · {user.role}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Extra email addresses {audience === 'emails' ? '(required)' : '(optional)'}
              </label>
              <textarea
                rows={2}
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                placeholder="one@example.com, two@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditorMode('visual')}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ${
                editorMode === 'visual' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              <Eye className="h-4 w-4" /> Visual
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('html')}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ${
                editorMode === 'html' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              <Code className="h-4 w-4" /> HTML
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPreview(true);
                setPreviewLayout((prev) => (prev === 'preview' ? 'split' : 'preview'));
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ${
                previewLayout === 'preview'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              <Square className="h-4 w-4" /> Preview only
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPreview(true);
                setPreviewLayout('split');
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ${
                showPreview && previewLayout === 'split'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              <Columns className="h-4 w-4" /> Split
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPreview(true);
                setPreviewLayout('stacked');
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ${
                showPreview && previewLayout === 'stacked'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              <Eye className="h-4 w-4" /> Stacked
            </button>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200"
            >
              {showPreview ? 'Hide preview' : 'Show preview'}
            </button>
            <span className="text-xs text-gray-500">
              Variables: {'{{firstName}} {{lastName}} {{email}} {{userName}} {{companyName}}'}
              {trackButtons
                ? ' · HTML buttons: use {{track}} or keep one tracked response to auto-wire CTAs'
                : ''}
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={trackButtons}
                onChange={(e) => {
                  const on = e.target.checked;
                  setTrackButtons(on);
                  if (on && buttons.length === 0) setButtons(DEFAULT_BUTTONS);
                }}
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <MousePointerClick className="h-4 w-4" /> Record button clicks
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Keep one response button (e.g. “Reserve my spot”). Your existing HTML link — like RESERVE MY SPOT —
                  is converted to a tracked link automatically. You can also set href to {'{{track}}'} or{' '}
                  {'{{button_confirm}}'}. Extra buttons are only appended if no HTML link was found.
                </span>
              </span>
            </label>

            {trackButtons && (
              <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-700">
                {buttons.map((button, index) => (
                  <div key={`${button.id}-${index}`} className="flex flex-wrap items-center gap-2">
                    <input
                      value={button.label}
                      onChange={(e) => updateButton(index, { label: e.target.value })}
                      placeholder="Button label"
                      className="min-w-[140px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <input
                      type="color"
                      value={button.color}
                      onChange={(e) => updateButton(index, { color: e.target.value })}
                      className="h-10 w-12 cursor-pointer rounded border border-gray-300 bg-white dark:border-gray-600"
                      title="Button color"
                    />
                    <button
                      type="button"
                      onClick={() => setButtons((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded-lg border border-gray-300 px-2 py-2 text-gray-500 hover:text-red-600 dark:border-gray-600"
                      aria-label="Remove button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {buttons.length < 6 && (
                  <button
                    type="button"
                    onClick={addButton}
                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                  >
                    <Plus className="h-4 w-4" /> Add button
                  </button>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirmation message
                  </label>
                  <input
                    value={confirmationMessage}
                    onChange={(e) => setConfirmationMessage(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div
            className={`grid gap-4 ${
              showPreview && previewLayout === 'split'
                ? 'lg:grid-cols-2'
                : showPreview && previewLayout === 'stacked'
                  ? 'grid-cols-1'
                  : ''
            }`}
          >
            {previewLayout !== 'preview' && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                {editorMode === 'visual' ? (
                  <div className="overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600 [&_.ql-editor]:min-h-[420px] [&_.ql-toolbar]:bg-gray-50 dark:[&_.ql-toolbar]:bg-gray-700">
                    <ReactQuill theme="snow" value={html} onChange={setHtml} modules={QUILL_MODULES} />
                  </div>
                ) : (
                  <textarea
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    rows={22}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                )}
              </div>
            )}

            {showPreview && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                      Preview · {subject || 'Untitled'}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {previewWidth === 'desktop' ? 'Desktop' : previewWidth === 'tablet' ? 'Tablet' : 'Mobile'} ·{' '}
                      {typeof previewFrameWidth === 'number' ? `${previewFrameWidth}px` : 'Full width'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {(
                      [
                        { id: 'desktop' as const, icon: Monitor, label: 'Desktop' },
                        { id: 'tablet' as const, icon: Tablet, label: 'Tablet' },
                        { id: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
                      ] as const
                    ).map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          title={item.label}
                          onClick={() => setPreviewWidth(item.id)}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs ${
                            previewWidth === item.id
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{item.label}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      title="Open in new tab"
                      onClick={openPreviewTab}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">New tab</span>
                    </button>
                    <button
                      type="button"
                      title="Fullscreen preview"
                      onClick={() => setPreviewFullscreen(true)}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Full</span>
                    </button>
                  </div>
                </div>
                <div className="bg-gray-100 p-3 dark:bg-gray-900/60">
                  <div
                    className="mx-auto overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700"
                    style={{
                      width: previewFrameWidth,
                      maxWidth: '100%',
                    }}
                  >
                    <iframe
                      title="Email preview"
                      className="block w-full bg-white"
                      style={{ height: previewLayout === 'preview' || previewLayout === 'stacked' ? '70vh' : '560px' }}
                      srcDoc={previewHtml}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {previewFullscreen && (
            <div className="fixed inset-0 z-[80] flex flex-col bg-gray-950/80 p-3 backdrop-blur-sm sm:p-6">
              <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Fullscreen preview · {subject || 'Untitled'}
                    </p>
                    <p className="text-xs text-gray-500">Same HTML recipients will receive</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {(
                      [
                        { id: 'desktop' as const, icon: Monitor, label: 'Desktop' },
                        { id: 'tablet' as const, icon: Tablet, label: 'Tablet' },
                        { id: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
                      ] as const
                    ).map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPreviewWidth(item.id)}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs ${
                            previewWidth === item.id
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={openPreviewTab}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> New tab
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFullscreen(false)}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white dark:bg-gray-100 dark:text-gray-900"
                    >
                      <Minimize2 className="h-3.5 w-3.5" /> Close
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto bg-gray-100 p-4 dark:bg-gray-950">
                  <div
                    className="mx-auto h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700"
                    style={{ width: previewFrameWidth, maxWidth: '100%', minHeight: '80%' }}
                  >
                    <iframe title="Fullscreen email preview" className="h-full min-h-[80vh] w-full bg-white" srcDoc={previewHtml} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {sendResult && (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
              <CheckCircle className="h-5 w-5" />
              Sent {sendResult.successful}/{sendResult.total}. Failed: {sendResult.failed}.
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
            >
              <Save className="h-4 w-4" /> Save as template
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Beaker className="h-4 w-4" />}
              Send test to me
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send email
            </button>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-8">
          <section>
            <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Your templates</h3>
            {custom.length === 0 ? (
              <p className="text-sm text-gray-500">No custom templates yet. Compose an email and save it.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {custom.map((tpl) => (
                  <div key={tpl.id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{tpl.name}</h4>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">{tpl.subject}</p>
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={() => applyTemplate(tpl)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white">
                        Use
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Built-in templates</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {builtin.map((tpl) => (
                <div key={tpl.id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-2 text-xs uppercase tracking-wide text-red-600">{tpl.category}</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{tpl.name}</h4>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{tpl.description}</p>
                  <button type="button" onClick={() => applyTemplate(tpl)} className="mt-4 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white dark:bg-gray-100 dark:text-gray-900">
                    Use template
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'entries' && (
        <div className="space-y-4">
          {activeCampaign ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCampaign(null);
                      setClicks([]);
                      loadCampaigns();
                    }}
                    className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    <ArrowLeft className="h-4 w-4" /> All campaigns
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{activeCampaign.subject}</h3>
                  <p className="text-sm text-gray-500">
                    {clickTotal} {clickTotal === 1 ? 'entry' : 'entries'}
                    {activeCampaign.isTest ? ' · Test send' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={sheetSearch}
                    onChange={(e) => setSheetSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openSheet(activeCampaign, sheetSearch);
                    }}
                    placeholder="Search sheet"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => openSheet(activeCampaign, sheetSearch)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:text-gray-200"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:text-gray-200"
                  >
                    <Download className="h-4 w-4" /> CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetLoading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading sheet…
                        </td>
                      </tr>
                    ) : clicks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No responses yet.
                        </td>
                      </tr>
                    ) : (
                      clicks.map((row) => (
                        <tr key={row._id} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-200">
                            {row.clickedAt ? new Date(row.clickedAt).toLocaleString() : ''}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{row.name || '—'}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{row.email}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            {row.buttonLabel || row.buttonId || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : campaignsLoading ? (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading campaigns…
            </p>
          ) : campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
              <Table2 className="mx-auto mb-3 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">
                No tracked emails yet. Compose a message, turn on “Record button clicks”, and send.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {campaigns.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => openSheet(item)}
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-red-300 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{item.subject}</h4>
                    {item.isTest && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        Test
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {item.responseCount || 0} / {item.recipientCount || 0} responses
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {item.sentAt ? new Date(item.sentAt).toLocaleString() : ''}
                  </p>
                  <p className="mt-3 text-xs text-red-600">
                    <Table2 className="mr-1 inline h-3.5 w-3.5" /> View sheet
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && <EmailHistory />}

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Save HTML template</h3>
              <button type="button" onClick={() => setShowSaveModal(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowSaveModal(false)} className="rounded-lg border px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading email data…
        </div>
      )}
    </motion.div>
  );
}
