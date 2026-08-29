'use client';

import { Component, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Highlighter,
} from 'lucide-react';

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor/TipTapEditor'), {
  ssr: false,
  loading: () => (
    <div className="assignment-submit-editor__loading">
      <div className="assignment-submit-editor__spinner" />
      <span>Loading editor…</span>
    </div>
  ),
});

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

class EditorErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error?.message || String(error) };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="assignment-submit-editor__error">
          Editor failed to load. Please refresh and try again.
        </div>
      );
    }
    return this.props.children;
  }
}

const FORMAT_HINTS = [
  { icon: Bold, label: 'Bold' },
  { icon: Italic, label: 'Italic' },
  { icon: Heading2, label: 'Headings' },
  { icon: List, label: 'Bullet list' },
  { icon: ListOrdered, label: 'Numbered list' },
  { icon: Link2, label: 'Link' },
  { icon: Highlighter, label: 'Highlight' },
] as const;

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

/**
 * Student assignment editor — TipTap default variant with a always-visible
 * formatting toolbar (not the hidden Notion / slash-only UI teachers use).
 */
export default function AssignmentSubmissionEditor({
  value,
  onChange,
  placeholder = 'Write your answer here. Use the toolbar above to format text.',
}: Props) {
  const isDark = useIsDarkMode();

  return (
    <div
      className={`assignment-submit-editor assignment-submit-editor--student${
        isDark ? ' assignment-submit-editor--dark' : ' assignment-submit-editor--light'
      }`}
      data-theme={isDark ? 'dark' : 'light'}
    >
      <div className="assignment-submit-editor__guide" role="note">
        <span className="assignment-submit-editor__guide-title">Formatting toolbar</span>
        <span className="assignment-submit-editor__guide-text">
          Use the buttons below to style your work. Select text to see extra options.
        </span>
        <div className="assignment-submit-editor__guide-chips" aria-hidden>
          {FORMAT_HINTS.map(({ icon: Icon, label }) => (
            <span key={label} className="assignment-submit-editor__guide-chip">
              <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <EditorErrorBoundary>
        <TipTapEditor
          key={isDark ? 'dark-default' : 'light-default'}
          variant="default"
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
        />
      </EditorErrorBoundary>
    </div>
  );
}

export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(html: string): number {
  const text = htmlToPlainText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function countCharacters(html: string): number {
  return htmlToPlainText(html).length;
}

type PortalProps = {
  children: React.ReactNode;
};

export function AssignmentSubmitPortal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
