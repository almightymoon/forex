'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';

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
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
};

type PublicForm = {
  title: string;
  description: string;
  slug: string;
  status: 'draft' | 'published' | 'closed';
  fields: FormField[];
  collectEmail: boolean;
  collectName: boolean;
  confirmationMessage?: string;
};

export default function PublicFormPage() {
  const params = useParams();
  const slug = String(params?.slug || '');
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!slug) {
      setError('Form not found');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(buildApiUrl(`api/public/forms/${slug}`));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Form not found');
        }
        if (!cancelled) setForm(data.form);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Form not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const setAnswer = (fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const toggleCheckbox = (fieldId: string, option: string) => {
    const current = Array.isArray(answers[fieldId]) ? (answers[fieldId] as string[]) : [];
    setAnswer(
      fieldId,
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    const formEl = event.currentTarget;
    const merged: Record<string, unknown> = { ...answers };
    for (const field of form.fields) {
      if (field.type === 'checkboxes') {
        const boxes = formEl.querySelectorAll<HTMLInputElement>(`input[name="${field.id}"]:checked`);
        merged[field.id] = Array.from(boxes).map((box) => box.value);
      } else {
        const selected = formEl.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          `[name="${field.id}"]`
        );
        if (field.type === 'multiple_choice' || field.type === 'yes_no') {
          const radio = formEl.querySelector<HTMLInputElement>(`input[name="${field.id}"]:checked`);
          if (radio?.value) merged[field.id] = radio.value;
        } else if (selected && 'value' in selected && selected.value !== '') {
          merged[field.id] = selected.value;
        }
      }
    }
    const nameInput = formEl.querySelector<HTMLInputElement>('input[name="respondentName"]');
    const emailInput = formEl.querySelector<HTMLInputElement>('input[name="respondentEmail"]');
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl(`api/public/forms/${form.slug}/submit`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respondentName: nameInput?.value || respondentName,
          respondentEmail: emailInput?.value || respondentEmail,
          answers: merged,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not submit');
      setDone(data.message || form.confirmationMessage || 'Thanks for your response.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:bg-white dark:text-gray-900';
  const labelClass = 'mb-2 block font-medium text-gray-900 dark:text-gray-900';
  const optionClass = 'flex cursor-pointer items-center gap-2 text-base text-gray-900 dark:text-gray-900';
  const cardClass = 'rounded-2xl bg-white p-6 text-gray-900 shadow-sm dark:bg-white dark:text-gray-900';

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0ebf8] text-gray-900">
        <Loader2 className="h-6 w-6 animate-spin text-red-600" />
      </main>
    );
  }

  if (error && !form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0ebf8] p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center text-gray-900 shadow">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900">Form unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#f0ebf8] px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border-t-8 border-red-600 bg-white p-8 text-gray-900 shadow">
          <CheckCircle className="mb-3 h-8 w-8 text-green-600" />
          <h1 className="text-2xl font-semibold text-gray-900">{form?.title}</h1>
          <p className="mt-3 text-gray-700">{done}</p>
        </div>
      </main>
    );
  }

  if (!form) return null;

  if (form.status === 'closed') {
    return (
      <main className="min-h-screen bg-[#f0ebf8] px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border-t-8 border-gray-400 bg-white p-8 text-gray-900 shadow">
          <h1 className="text-2xl font-semibold text-gray-900">{form.title}</h1>
          <p className="mt-3 text-gray-700">This form is no longer accepting responses.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f0ebf8] px-4 py-10 text-gray-900 dark:bg-[#f0ebf8] dark:text-gray-900" style={{ colorScheme: 'light' }}>
      <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4 text-gray-900">
        <section className={`${cardClass} border-t-8 border-red-600`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Forex Navigators</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{form.title}</h1>
          {form.description && <p className="mt-3 whitespace-pre-wrap text-gray-700">{form.description}</p>}
          <p className="mt-4 text-sm text-red-600">* Required</p>
        </section>

        {form.collectName && (
          <label className={`block ${cardClass}`}>
            <span className={labelClass}>Name *</span>
            <input
              required
              name="respondentName"
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              className={inputClass}
            />
          </label>
        )}

        {form.collectEmail && (
          <label className={`block ${cardClass}`}>
            <span className={labelClass}>Email *</span>
            <input
              required
              name="respondentEmail"
              type="email"
              value={respondentEmail}
              onChange={(e) => setRespondentEmail(e.target.value)}
              className={inputClass}
            />
          </label>
        )}

        {form.fields.map((field) => (
          <div key={field.id} className={cardClass}>
            <div className="mb-3 font-medium text-gray-900">
              {field.label} {field.required && <span className="text-red-600">*</span>}
            </div>
            {field.description && <p className="mb-3 text-sm text-gray-600">{field.description}</p>}

            {field.type === 'long_text' && (
              <textarea
                name={field.id}
                required={field.required}
                rows={4}
                placeholder={field.placeholder}
                className={inputClass}
                onChange={(e) => setAnswer(field.id, e.target.value)}
              />
            )}
            {['short_text', 'email', 'phone', 'number', 'date', 'time'].includes(field.type) && (
              <input
                name={field.id}
                required={field.required}
                type={
                  field.type === 'email'
                    ? 'email'
                    : field.type === 'number'
                      ? 'number'
                      : field.type === 'date'
                        ? 'date'
                        : field.type === 'time'
                          ? 'time'
                          : field.type === 'phone'
                            ? 'tel'
                            : 'text'
                }
                placeholder={field.placeholder}
                className={inputClass}
                onChange={(e) => setAnswer(field.id, e.target.value)}
              />
            )}
            {field.type === 'dropdown' && (
              <select
                name={field.id}
                required={field.required}
                className={inputClass}
                defaultValue=""
                onChange={(e) => setAnswer(field.id, e.target.value)}
              >
                <option value="" disabled>
                  Choose
                </option>
                {(field.options || []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
            {field.type === 'multiple_choice' && (
              <div className="space-y-2">
                {(field.options || []).map((option) => (
                  <label key={option} className={optionClass}>
                    <input
                      type="radio"
                      name={field.id}
                      value={option}
                      required={field.required}
                      onChange={() => setAnswer(field.id, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}
            {field.type === 'checkboxes' && (
              <div className="space-y-2">
                {(field.options || []).map((option) => (
                  <label key={option} className={optionClass}>
                    <input
                      type="checkbox"
                      name={field.id}
                      value={option}
                      onChange={() => toggleCheckbox(field.id, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}
            {field.type === 'yes_no' && (
              <div className="flex gap-4">
                {['Yes', 'No'].map((option) => (
                  <label key={option} className={optionClass}>
                    <input
                      type="radio"
                      name={field.id}
                      value={option}
                      required={field.required}
                      onChange={() => setAnswer(field.id, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-red-600 px-6 py-2.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </form>
    </main>
  );
}
