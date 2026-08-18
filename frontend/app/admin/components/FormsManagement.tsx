'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Copy,
  Link2,
  Save,
  ArrowUp,
  ArrowDown,
  Table2,
  FileText,
  Search,
  Download,
  Loader2,
  RefreshCw,
  X,
  ClipboardList,
} from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { fetchWithTokenRefresh } from '../../../utils/tokenUtils';
import { showToast } from '../../../utils/toast';

type FieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'number'
  | 'phone'
  | 'dropdown'
  | 'multiple_choice'
  | 'checkboxes'
  | 'date'
  | 'time'
  | 'yes_no';

type FormField = {
  id: string;
  type: FieldType;
  label: string;
  description: string;
  placeholder: string;
  required: boolean;
  options: string[];
};

type SurveyForm = {
  _id: string;
  title: string;
  description: string;
  slug: string;
  status: 'draft' | 'published' | 'closed';
  fields: FormField[];
  collectEmail: boolean;
  collectName: boolean;
  allowMultiple: boolean;
  confirmationMessage?: string;
  responseCount: number;
  updatedAt?: string;
};

type FormResponse = {
  _id: string;
  answers: { fieldId: string; label: string; value: unknown }[];
  respondentEmail?: string;
  respondentName?: string;
  submittedAt: string;
};

const FIELD_TYPES: { id: FieldType; label: string }[] = [
  { id: 'short_text', label: 'Short answer' },
  { id: 'long_text', label: 'Paragraph' },
  { id: 'email', label: 'Email' },
  { id: 'number', label: 'Number' },
  { id: 'phone', label: 'Phone' },
  { id: 'dropdown', label: 'Dropdown' },
  { id: 'multiple_choice', label: 'Multiple choice' },
  { id: 'checkboxes', label: 'Checkboxes' },
  { id: 'date', label: 'Date' },
  { id: 'time', label: 'Time' },
  { id: 'yes_no', label: 'Yes / No' },
];

const OPTION_TYPES: FieldType[] = ['dropdown', 'multiple_choice', 'checkboxes'];

function newFieldId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyField(): FormField {
  return {
    id: newFieldId(),
    type: 'short_text',
    label: 'Untitled question',
    description: '',
    placeholder: '',
    required: false,
    options: ['Option 1'],
  };
}

function formatCell(value: unknown) {
  if (value == null || value === '') return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function columnLetter(index: number) {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export default function FormsManagement() {
  const [view, setView] = useState<'list' | 'builder' | 'sheet'>('list');
  const [forms, setForms] = useState<SurveyForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<SurveyForm> | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [responseTotal, setResponseTotal] = useState(0);
  const [sheetSearch, setSheetSearch] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);

  const loadForms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithTokenRefresh(buildApiUrl('api/admin/forms'));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      setForms(data.forms || []);
    } catch {
      showToast('Could not load forms', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const publicLink = (slug?: string) => {
    if (!slug || typeof window === 'undefined') return '';
    return `${window.location.origin}/f/${slug}`;
  };

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(publicLink(slug));
      showToast('Form link copied', 'success');
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  const startCreate = () => {
    setForm({
      title: 'Untitled form',
      description: '',
      status: 'draft',
      fields: [emptyField()],
      collectEmail: true,
      collectName: true,
      allowMultiple: true,
      confirmationMessage: 'Thanks for your response. We have received your submission.',
    });
    setView('builder');
  };

  const openBuilder = async (id: string) => {
    try {
      const res = await fetchWithTokenRefresh(buildApiUrl(`api/admin/forms/${id}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setForm(data.form);
      setView('builder');
    } catch {
      showToast('Could not open form', 'error');
    }
  };

  const openSheet = async (id: string, search = '') => {
    setSheetLoading(true);
    setView('sheet');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetchWithTokenRefresh(buildApiUrl(`api/admin/forms/${id}/responses?${params}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setForm(data.form);
      setResponses(data.responses || []);
      setResponseTotal(data.total || 0);
    } catch {
      showToast('Could not load responses', 'error');
    } finally {
      setSheetLoading(false);
    }
  };

  const saveForm = async (publish?: 'draft' | 'published' | 'closed') => {
    if (!form?.title?.trim()) {
      showToast('Form title is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        status: publish || form.status || 'draft',
        fields: form.fields || [],
      };
      const isNew = !form._id;
      const url = isNew ? buildApiUrl('api/admin/forms') : buildApiUrl(`api/admin/forms/${form._id}`);
      const res = await fetchWithTokenRefresh(url, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || data.error || 'Could not save form', 'error');
        return;
      }
      setForm(data.form);
      showToast(publish === 'published' ? 'Form published' : 'Form saved', 'success');
      await loadForms();
    } catch {
      showToast('Could not save form', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteForm = async (id: string) => {
    if (!window.confirm('Delete this form and all of its responses?')) return;
    try {
      const res = await fetchWithTokenRefresh(buildApiUrl(`api/admin/forms/${id}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
      showToast('Form deleted', 'success');
      if (form?._id === id) {
        setForm(null);
        setView('list');
      }
      await loadForms();
    } catch {
      showToast('Could not delete form', 'error');
    }
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: (prev.fields || []).map((field) => (field.id === id ? { ...field, ...patch } : field)),
      };
    });
  };

  const moveField = (index: number, dir: -1 | 1) => {
    setForm((prev) => {
      if (!prev?.fields) return prev;
      const next = [...prev.fields];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, fields: next };
    });
  };

  const sheetColumns = useMemo(() => {
    const cols: { key: string; label: string }[] = [{ key: '_submitted', label: 'Timestamp' }];
    if (form?.collectName) cols.push({ key: '_name', label: 'Name' });
    if (form?.collectEmail) cols.push({ key: '_email', label: 'Email' });
    (form?.fields || []).forEach((field) => cols.push({ key: field.id, label: field.label }));
    return cols;
  }, [form]);

  const cellValue = (row: FormResponse, key: string) => {
    if (key === '_submitted') return new Date(row.submittedAt).toLocaleString();
    if (key === '_name') return row.respondentName || '';
    if (key === '_email') return row.respondentEmail || '';
    const answer = row.answers?.find((a) => a.fieldId === key);
    return formatCell(answer?.value);
  };

  const exportCsv = async () => {
    if (!form?._id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/forms/${form._id}/export`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.slug || 'form'}-responses.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Could not export CSV', 'error');
    }
  };

  const deleteResponse = async (responseId: string) => {
    if (!form?._id || !window.confirm('Delete this response?')) return;
    try {
      const res = await fetchWithTokenRefresh(
        buildApiUrl(`api/admin/forms/${form._id}/responses/${responseId}`),
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('failed');
      setResponses((prev) => prev.filter((r) => r._id !== responseId));
      setResponseTotal((n) => Math.max(0, n - 1));
      setSelectedResponse(null);
      showToast('Response deleted', 'success');
    } catch {
      showToast('Could not delete response', 'error');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Forms</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Build public forms like Google Forms. Responses appear in a spreadsheet you can search and export.
          </p>
        </div>
        <div className="flex gap-2">
          {view !== 'list' && (
            <button
              type="button"
              onClick={() => {
                setView('list');
                loadForms();
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
            >
              All forms
            </button>
          )}
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" /> New form
          </button>
        </div>
      </div>

      {view === 'list' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Your forms</h3>
            <button type="button" onClick={loadForms} className="inline-flex items-center gap-1 text-sm text-gray-500">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading forms…
            </div>
          ) : forms.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-40" />
              No forms yet. Create one to start collecting responses.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {forms.map((item) => (
                <div key={item._id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          item.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'closed'
                              ? 'bg-gray-200 text-gray-600'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {item.responseCount || 0} responses · {item.fields?.length || 0} questions
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openBuilder(item._id)} className="rounded-lg border px-3 py-1.5 text-sm">
                      <FileText className="mr-1 inline h-4 w-4" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openSheet(item._id)}
                      className="rounded-lg border px-3 py-1.5 text-sm"
                    >
                      <Table2 className="mr-1 inline h-4 w-4" /> Sheet
                    </button>
                    {item.status === 'published' && (
                      <button type="button" onClick={() => copyLink(item.slug)} className="rounded-lg border px-3 py-1.5 text-sm">
                        <Link2 className="mr-1 inline h-4 w-4" /> Copy link
                      </button>
                    )}
                    <button type="button" onClick={() => deleteForm(item._id)} className="rounded-lg border px-3 py-1.5 text-sm text-red-600">
                      <Trash2 className="mr-1 inline h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'builder' && form && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <input
              value={form.title || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full border-b border-gray-200 bg-transparent pb-2 text-2xl font-bold text-gray-900 outline-none dark:border-gray-700 dark:text-white"
              placeholder="Form title"
            />
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="mt-3 w-full bg-transparent text-sm text-gray-600 outline-none dark:text-gray-300"
              placeholder="Form description"
            />
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.collectName !== false}
                  onChange={(e) => setForm((prev) => ({ ...prev, collectName: e.target.checked }))}
                />
                Collect name
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.collectEmail !== false}
                  onChange={(e) => setForm((prev) => ({ ...prev, collectEmail: e.target.checked }))}
                />
                Collect email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.allowMultiple !== false}
                  onChange={(e) => setForm((prev) => ({ ...prev, allowMultiple: e.target.checked }))}
                />
                Allow multiple responses
              </label>
            </div>
            {form.slug && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <Link2 className="h-4 w-4" />
                <span className="truncate">{publicLink(form.slug)}</span>
                <button type="button" onClick={() => copyLink(form.slug!)} className="text-red-600">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {(form.fields || []).map((field, index) => (
            <div key={field.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex flex-wrap items-start gap-3">
                <input
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  className="min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Question"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                  className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {FIELD_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => moveField(index, -1)} className="rounded-lg border p-2">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => moveField(index, 1)} className="rounded-lg border p-2">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, fields: (prev?.fields || []).filter((f) => f.id !== field.id) }))
                  }
                  className="rounded-lg border p-2 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                value={field.description}
                onChange={(e) => updateField(field.id, { description: e.target.value })}
                placeholder="Help text (optional)"
                className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              {OPTION_TYPES.includes(field.type) && (
                <div className="space-y-2">
                  {(field.options || []).map((option, optIndex) => (
                    <div key={`${field.id}-opt-${optIndex}`} className="flex gap-2">
                      <input
                        value={option}
                        onChange={(e) => {
                          const options = [...(field.options || [])];
                          options[optIndex] = e.target.value;
                          updateField(field.id, { options });
                        }}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateField(field.id, { options: (field.options || []).filter((_, i) => i !== optIndex) })
                        }
                        className="text-gray-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateField(field.id, { options: [...(field.options || []), `Option ${(field.options || []).length + 1}`] })}
                    className="text-sm text-red-600"
                  >
                    + Add option
                  </button>
                </div>
              )}
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                />
                Required
              </label>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, fields: [...(prev?.fields || []), emptyField()] }))}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-400 px-4 py-3 text-sm text-gray-600"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>

          <div className="flex flex-wrap justify-end gap-2">
            {form._id && (
              <button type="button" onClick={() => openSheet(form._id!)} className="rounded-lg border px-4 py-2 text-sm">
                <Table2 className="mr-1 inline h-4 w-4" /> View sheet
              </button>
            )}
            <button type="button" onClick={() => saveForm('draft')} disabled={saving} className="rounded-lg border px-4 py-2 text-sm">
              {saving ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Save className="mr-1 inline h-4 w-4" />}
              Save draft
            </button>
            <button
              type="button"
              onClick={() => saveForm('published')}
              disabled={saving}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
            >
              Publish
            </button>
            {form.status === 'published' && (
              <button type="button" onClick={() => saveForm('closed')} className="rounded-lg border px-4 py-2 text-sm">
                Close form
              </button>
            )}
          </div>
        </div>
      )}

      {view === 'sheet' && form && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{form.title}</h3>
              <p className="text-sm text-gray-500">{responseTotal} responses</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={sheetSearch}
                  onChange={(e) => setSheetSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && form._id) openSheet(form._id, sheetSearch);
                  }}
                  placeholder="Search sheet"
                  className="rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => form._id && openSheet(form._id, sheetSearch)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Search
              </button>
              <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                <Download className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>

          <div className="overflow-auto rounded-xl border border-[#c8c8c8] bg-white shadow-inner dark:border-gray-700">
            <table className="min-w-full border-collapse font-sans text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="sticky left-0 z-20 w-12 border border-[#e0e0e0] bg-[#f8f9fa] px-2 py-1 text-center text-xs font-medium text-gray-500">
                    #
                  </th>
                  {sheetColumns.map((col, index) => (
                    <th
                      key={col.key}
                      className="min-w-[160px] border border-[#e0e0e0] bg-[#f8f9fa] px-3 py-1 text-left font-medium text-gray-700"
                    >
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">{columnLetter(index)}</div>
                      <div className="truncate">{col.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheetLoading ? (
                  <tr>
                    <td colSpan={sheetColumns.length + 1} className="px-4 py-8 text-center text-gray-500">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading sheet…
                    </td>
                  </tr>
                ) : responses.length === 0 ? (
                  <tr>
                    <td colSpan={sheetColumns.length + 1} className="px-4 py-8 text-center text-gray-500">
                      No responses yet.
                    </td>
                  </tr>
                ) : (
                  responses.map((row, rowIndex) => (
                    <tr
                      key={row._id}
                      onClick={() => setSelectedResponse(row)}
                      className={`cursor-pointer ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#f8fbfd]'} hover:bg-[#e8f0fe]`}
                    >
                      <td className="sticky left-0 border border-[#e0e0e0] bg-inherit px-2 py-1 text-center text-gray-400">
                        {rowIndex + 1}
                      </td>
                      {sheetColumns.map((col) => (
                        <td key={col.key} className="max-w-[280px] truncate border border-[#e0e0e0] px-3 py-1 text-gray-800">
                          {cellValue(row, col.key)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Response</h3>
              <button type="button" onClick={() => setSelectedResponse(null)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-500">{new Date(selectedResponse.submittedAt).toLocaleString()}</p>
            {selectedResponse.respondentName && <p className="text-sm"><strong>Name:</strong> {selectedResponse.respondentName}</p>}
            {selectedResponse.respondentEmail && (
              <p className="mb-3 text-sm"><strong>Email:</strong> {selectedResponse.respondentEmail}</p>
            )}
            <div className="space-y-3">
              {selectedResponse.answers.map((answer) => (
                <div key={answer.fieldId} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                  <div className="text-xs font-medium text-gray-500">{answer.label}</div>
                  <div className="text-sm text-gray-900 dark:text-white">{formatCell(answer.value) || '—'}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => deleteResponse(selectedResponse._id)}
              className="mt-5 text-sm text-red-600"
            >
              Delete response
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
