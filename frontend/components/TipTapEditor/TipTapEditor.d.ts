import type { ReactElement } from 'react';

export type TipTapTableColors = {
  bg: string;
  headerBg: string;
  headerText: string;
};

export type TipTapEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  variant?: 'default' | 'notion';
  tableColors?: TipTapTableColors | null;
  onTableColorsChange?: (colors: TipTapTableColors) => void;
};

export default function TipTapEditor(props: TipTapEditorProps): ReactElement | null;
