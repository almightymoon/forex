'use client';

import { Component, type ReactNode } from 'react';
import TipTapEditor from '@/components/TipTapEditor/TipTapEditor';

type CourseRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

class EditorErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error?.stack || error?.message || String(error) };
  }

  render() {
    if (this.state.error) {
      return (
        <pre className="whitespace-pre-wrap p-4 text-sm text-red-700 dark:text-red-400">
          {this.state.error}
        </pre>
      );
    }
    return this.props.children;
  }
}

export default function CourseRichTextEditor({
  value,
  onChange,
  placeholder = 'Type / for commands…',
}: CourseRichTextEditorProps) {
  return (
    <div className="course-notion-editor overflow-visible rounded-xl border border-gray-200 dark:border-zinc-700">
      <EditorErrorBoundary>
        <TipTapEditor
          variant="notion"
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
        />
      </EditorErrorBoundary>
    </div>
  );
}
