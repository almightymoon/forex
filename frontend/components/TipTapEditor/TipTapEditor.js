"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Slash,
  SlashCmdProvider,
  SlashCmd,
  createSuggestionsItems,
  enableKeyboardNavigation,
  renderItems as defaultRenderItems,
} from "@harshtalks/slash-tiptap";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { StoryImage } from "./tiptap-extension/story-image-extension";
import ImageEditBubbleMenu from "./ImageEditBubbleMenu";
import { TableKit } from "@tiptap/extension-table";
import { TableRowResize } from "./tiptap-extension/table-row-resize-extension";
import { NodeBackground } from "./tiptap-extension/node-background-extension";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlock from "@tiptap/extension-code-block";
import Dropcursor from "@tiptap/extension-dropcursor";
import Youtube from "@tiptap/extension-youtube";
import DragHandle from "@tiptap/extension-drag-handle";
import { TextSelection, NodeSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import BlockContextMenu from "./BlockContextMenu";
import NotionInsertBlockMenu from "./NotionInsertBlockMenu";
import NotionTableControls from "./NotionTableControls";
import styles from "./TipTapEditor.module.css";

/**
 * setFontSize / unsetFontSize can collapse the selection. The bubble plugin runs after each
 * dispatch — a second transaction to restore selection runs too late and the menu hides.
 * Run mark change + selection restore in one chain (single transaction).
 */
function appendSelectionRestoreToChain(chain, restoreText, restoreCells) {
  if (restoreText) {
    const { from, to } = restoreText;
    return chain.command(({ tr }) => {
      const mappedFrom = tr.mapping.map(from);
      const mappedTo = tr.mapping.map(to);
      if (mappedFrom >= mappedTo) return true;
      try {
        tr.setSelection(TextSelection.create(tr.doc, mappedFrom, mappedTo));
      } catch {
        /* ignore */
      }
      return true;
    });
  }
  if (restoreCells) {
    const { anchor, head } = restoreCells;
    return chain.command(({ tr }) => {
      const a = tr.mapping.map(anchor);
      const h = tr.mapping.map(head);
      try {
        tr.setSelection(CellSelection.create(tr.doc, a, h));
      } catch {
        /* ignore */
      }
      return true;
    });
  }
  return chain;
}

function runFontSizeCommandPreservingSelection(editor, extendChain) {
  const sel = editor.state.selection;
  let restoreText = null;
  let restoreCells = null;
  if (sel instanceof TextSelection && sel.from !== sel.to) {
    restoreText = { from: sel.from, to: sel.to };
  } else if (sel instanceof CellSelection) {
    restoreCells = { anchor: sel.$anchorCell.pos, head: sel.$headCell.pos };
  }
  /* Focus after font + selection so we don’t run focus() before marks (can reorder selection oddly). */
  let chain = editor.chain();
  chain = extendChain(chain);
  chain = appendSelectionRestoreToChain(chain, restoreText, restoreCells);
  chain.focus().run();
}

function ToolbarBtn({ onClick, active, disabled, title, children, className = "" }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick?.(); }}
      className={`${styles.toolbarBtn} ${className} ${active ? styles.toolbarBtnActive : ""} ${disabled ? styles.toolbarBtnDisabled : ""}`}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <span className={styles.toolbarSep} />;
}

const BUBBLE_TEXT_COLORS = [
  { label: "Default", color: null },
  { label: "Gray", color: "#9ca3af" },
  { label: "Red", color: "#ef4444" },
  { label: "Orange", color: "#f97316" },
  { label: "Yellow", color: "#eab308" },
  { label: "Green", color: "#22c55e" },
  { label: "Blue", color: "#3b82f6" },
  { label: "Purple", color: "#a855f7" },
];

/** Apply text color without collapsing the current selection (works on bold/italic too). */
function TextColorPicker({ editor, onHoldStart, dark }) {
  const current = editor?.getAttributes("textStyle")?.color || "";
  return (
    <span className={styles.textColorPicker} title="Text color">
      {BUBBLE_TEXT_COLORS.map((c) => {
        const active =
          c.color == null
            ? !current
            : String(current).toLowerCase() === String(c.color).toLowerCase();
        return (
          <button
            key={c.label}
            type="button"
            title={c.label}
            aria-label={`Text color ${c.label}`}
            className={`${styles.textColorSwatch} ${active ? styles.textColorSwatchActive : ""}`}
            style={
              c.color == null
                ? { background: dark ? "#e5e5e5" : "#0f172a" }
                : { background: c.color }
            }
            onMouseDown={(e) => {
              e.preventDefault();
              onHoldStart?.();
              if (!editor) return;
              if (c.color == null) {
                runFontSizeCommandPreservingSelection(editor, (chain) =>
                  chain.setMark("textStyle", { color: null }).removeEmptyTextStyle()
                );
              } else {
                runFontSizeCommandPreservingSelection(editor, (chain) =>
                  chain.setMark("textStyle", { color: c.color })
                );
              }
            }}
          />
        );
      })}
    </span>
  );
}

const FONT_SIZE_MIN = 6;
const FONT_SIZE_MAX = 96;
const FONT_SIZE_STEP = 0.5;
/** Shown when selection has no explicit font-size (inherit); also baseline for ± from inherit. */
const FONT_SIZE_INHERIT_DISPLAY = 14;

function roundHalfPx(n) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.round(n * 2) / 2;
}

/** Parse inline font-size (px / rem / em) to px for display; assumes 1rem = 16px for rem/em. */
function fontSizeAttrToPx(attr) {
  if (!attr || typeof attr !== "string") return null;
  const v = attr.trim().toLowerCase();
  let m = /^([\d.]+)\s*px\s*$/i.exec(v);
  if (m) return roundHalfPx(parseFloat(m[1]));
  m = /^([\d.]+)\s*rem\s*$/i.exec(v);
  if (m) return roundHalfPx(parseFloat(m[1]) * 16);
  m = /^([\d.]+)\s*em\s*$/i.exec(v);
  if (m) return roundHalfPx(parseFloat(m[1]) * 16);
  return null;
}

function formatPxDraft(px) {
  if (px == null || Number.isNaN(px)) return String(FONT_SIZE_INHERIT_DISPLAY);
  const r = roundHalfPx(px);
  if (r == null) return String(FONT_SIZE_INHERIT_DISPLAY);
  return Math.abs(r - Math.round(r)) < 1e-6 ? String(Math.round(r)) : r.toFixed(1);
}

function FontSizeStepper({ editor, onHoldStart }) {
  const [draft, setDraft] = useState(String(FONT_SIZE_INHERIT_DISPLAY));
  const inputFocusedRef = useRef(false);
  const draftAtFocusRef = useRef("");

  const readPx = useCallback(() => fontSizeAttrToPx(editor?.getAttributes("textStyle")?.fontSize ?? null), [editor]);

  const syncFromEditor = useCallback(() => {
    if (inputFocusedRef.current) return;
    setDraft(formatPxDraft(readPx()));
  }, [readPx]);

  useEffect(() => {
    if (!editor) return undefined;
    syncFromEditor();
    const h = () => syncFromEditor();
    editor.on("selectionUpdate", h);
    editor.on("transaction", h);
    return () => {
      editor.off("selectionUpdate", h);
      editor.off("transaction", h);
    };
  }, [editor, syncFromEditor]);

  const applyPx = useCallback((px) => {
    onHoldStart?.();
    const r = roundHalfPx(px);
    if (r == null) return;
    const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, r));
    // Don’t call the FontSize extension command here: it does its own `chain().run()` (extra dispatch),
    // which can briefly collapse selection and hide the selection bubble. Keep everything in OUR chain.
    runFontSizeCommandPreservingSelection(editor, (c) => c.setMark("textStyle", { fontSize: `${clamped}px` }));
    setDraft(formatPxDraft(clamped));
  }, [editor, onHoldStart]);

  const commitDraft = useCallback(() => {
    onHoldStart?.();
    const t = draft.trim().toLowerCase();
    if (t === "" || t === "auto" || t === "inherit") {
      runFontSizeCommandPreservingSelection(editor, (c) => c.setMark("textStyle", { fontSize: null }).removeEmptyTextStyle());
      setDraft(String(FONT_SIZE_INHERIT_DISPLAY));
      return;
    }
    const n = parseFloat(draft.replace(/px\s*$/i, "").replace(",", "."));
    if (Number.isNaN(n)) {
      setDraft(formatPxDraft(readPx()));
      return;
    }
    applyPx(n);
  }, [draft, editor, applyPx, readPx, onHoldStart]);

  const bump = useCallback((delta) => {
    onHoldStart?.();
    const markPx = readPx();
    let base = markPx;
    if (base == null) {
      const parsed = parseFloat(String(draft).replace(/px/i, "").replace(",", "."));
      base = Number.isNaN(parsed) ? FONT_SIZE_INHERIT_DISPLAY : parsed;
    }
    const next = roundHalfPx(base + delta);
    if (next == null) return;
    if (next < FONT_SIZE_MIN) {
      runFontSizeCommandPreservingSelection(editor, (c) => c.setMark("textStyle", { fontSize: null }).removeEmptyTextStyle());
      setDraft(String(FONT_SIZE_INHERIT_DISPLAY));
      return;
    }
    applyPx(next);
  }, [readPx, draft, editor, applyPx, onHoldStart]);

  return (
    <span
      className={styles.fontSizeStepper}
      title="Font size (px). Use − / + or type a value; Enter or click outside to apply."
    >
      <button
        type="button"
        className={styles.fontSizeStepperBtn}
        aria-label="Decrease font size"
        onMouseDown={(e) => {
          e.preventDefault();
          onHoldStart?.();
          bump(-FONT_SIZE_STEP);
        }}
      >
        −
      </button>
      <input
        className={styles.fontSizeStepperInput}
        value={draft}
        aria-label="Font size in pixels"
        onFocus={() => {
          inputFocusedRef.current = true;
          const next = formatPxDraft(readPx());
          draftAtFocusRef.current = next;
          setDraft(next);
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          inputFocusedRef.current = false;
          if (readPx() == null && draft === draftAtFocusRef.current) return;
          commitDraft();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      <button
        type="button"
        className={styles.fontSizeStepperBtn}
        aria-label="Increase font size"
        onMouseDown={(e) => {
          e.preventDefault();
          onHoldStart?.();
          bump(FONT_SIZE_STEP);
        }}
      >
        +
      </button>
    </span>
  );
}

function createDragHandleRender(editorRef, isNotion, openBlockMenu, openInsertBlockMenu, getAddBlockContext) {
  return () => {
    const wrapper = document.createElement("div");
    wrapper.className = isNotion ? styles.notionDragHandleWrapper : styles.dragHandleWrapper;
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = isNotion ? "5px" : "2px";

    const dots = document.createElement("div");
    dots.className = isNotion ? styles.notionDragHandle : styles.dragHandle;
    dots.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="4" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/><circle cx="4" cy="7" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="4" cy="11" r="1.2"/><circle cx="10" cy="11" r="1.2"/></svg>';
    dots.title = "Drag to move · Click for options";
    dots.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ed = editorRef?.current;
      if (!ed) return;
      // Select the hovered block so Color / Turn-into apply to real content, not a collapsed caret.
      const ctx = getAddBlockContext?.();
      if (ctx && typeof ctx.pos === "number" && ctx.nodeSize > 2) {
        try {
          const from = ctx.pos + 1;
          const to = ctx.pos + ctx.nodeSize - 1;
          if (to > from) {
            ed.chain().setTextSelection({ from, to }).run();
          }
        } catch {
          /* ignore invalid range */
        }
      }
      if (typeof ed.commands.lockDragHandle === "function") ed.commands.lockDragHandle();
      const rect = dots.getBoundingClientRect();
      openBlockMenu?.({ x: rect.right + 4, y: rect.top });
    });

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.setAttribute("draggable", "false");
    plusBtn.className = isNotion ? styles.notionAddBlockBtn : styles.addBlockBtn;
    plusBtn.innerHTML = "+";
    plusBtn.title = "Add block — headings, lists, image, video…";
    plusBtn.addEventListener("mousedown", (e) => e.stopPropagation());
    plusBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ed = editorRef?.current;
      const ctx = getAddBlockContext?.();
      if (!ed || !ctx) return;
      const insertPos = ctx.pos + ctx.nodeSize;
      if (isNotion && typeof openInsertBlockMenu === "function") {
        const rect = plusBtn.getBoundingClientRect();
        openInsertBlockMenu({ x: rect.right + 4, y: rect.top, insertPos });
        return;
      }
      const { state, view } = ed;
      const node = state.schema.nodes.paragraph.create();
      const tr = state.tr.insert(insertPos, node);
      tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
      view.dispatch(tr);
      view.focus();
    });

    wrapper.appendChild(plusBtn);
    wrapper.appendChild(dots);
    return wrapper;
  };
}

const TABLE_COLOR_PRESETS = [
  { name: "Default dark", bg: "rgba(24, 24, 27, 0.85)", headerBg: "rgba(39, 39, 42, 0.95)", headerText: "#d4d4d8" },
  { name: "Transparent", bg: "transparent", headerBg: "transparent", headerText: "#e5e5e5" },
  { name: "Slate", bg: "rgba(30, 41, 59, 0.9)", headerBg: "rgba(51, 65, 85, 1)", headerText: "#e2e8f0" },
  { name: "Navy", bg: "rgba(15, 23, 42, 0.95)", headerBg: "rgba(30, 58, 138, 0.95)", headerText: "#bfdbfe" },
  { name: "Purple tint", bg: "rgba(30, 27, 75, 0.9)", headerBg: "rgba(67, 56, 202, 0.9)", headerText: "#c7d2fe" },
  { name: "Muted lavender", bg: "rgba(55, 48, 163, 0.25)", headerBg: "rgba(107, 110, 142, 1)", headerText: "#e0e7ff" },
  { name: "Charcoal", bg: "rgba(23, 23, 23, 0.95)", headerBg: "rgba(64, 64, 64, 1)", headerText: "#fafafa" },
];

/**
 * Repair HTML before TipTap parses it:
 * - Fully entity-encoded fragments (&lt;table … with no real tags)
 * - Escaped table markup inside &lt;p&gt;…&lt;/p&gt; (our old decoder skipped these)
 * - One paragraph whose text is a whole &lt;table&gt;…&lt;/table&gt; string (paste / bad save)
 * - Table HTML trapped in &lt;pre&gt;&lt;code&gt;
 * - colgroup / thead|tbody split for ProseMirror table parsing
 */
function normalizeHtmlForTiptap(html) {
  if (typeof window === "undefined" || !html || typeof html !== "string") return html || "";
  let s = html.trim();
  if (!s) return s;

  // Entire value is entity-encoded (no real tag openers)
  if ((s.includes("&lt;") || s.includes("&#60;") || s.includes("&#x3c;")) && !/<\s*[a-z]/i.test(s)) {
    try {
      const ta = document.createElement("textarea");
      ta.innerHTML = s;
      s = ta.value;
    } catch {
      /* keep s */
    }
  }

  /* Substring match like /table/i would fire on "stable", "tablet", etc. and run destructive cleanup. */
  if (!/<\s*table[\s>]/i.test(s) && !/&lt;\s*table/i.test(s) && !/&#60;\s*table/i.test(s) && !/&#x3c;\s*table/i.test(s)) {
    return s;
  }

  try {
    const doc = new DOMParser().parseFromString(s, "text/html");
    const body = doc.body;

    body.querySelectorAll("p, blockquote").forEach((el) => {
      const inner = el.innerHTML;
      if (!/&lt;\s*table|&#60;\s*table|&#x3c;\s*table/i.test(inner)) return;
      const ta = document.createElement("textarea");
      ta.innerHTML = inner.trim();
      const decoded = ta.value;
      if (/<\s*table[\s>]/i.test(decoded) && decoded.length > 50) {
        el.innerHTML = decoded;
      }
    });

    body.querySelectorAll("p").forEach((p) => {
      const raw = (p.textContent || "").trim();
      if (raw.length < 80) return;
      if (!/^\s*<\s*table[\s>]/i.test(raw) || !/<\/\s*table\s*>/i.test(raw)) return;
      const sub = new DOMParser().parseFromString(raw, "text/html");
      const t = sub.body.querySelector(":scope > table");
      if (t) p.replaceWith(doc.importNode(t, true));
    });

    body.querySelectorAll("pre code").forEach((code) => {
      const raw = (code.textContent || "").trim();
      if (raw.length < 80 || !/^\s*<\s*table[\s>]/i.test(raw) || !/<\/\s*table\s*>/i.test(raw)) return;
      const sub = new DOMParser().parseFromString(raw, "text/html");
      const t = sub.body.querySelector(":scope > table");
      const pre = code.closest("pre");
      if (t && pre?.parentNode) pre.replaceWith(doc.importNode(t, true));
    });

    body.querySelectorAll("p").forEach((p) => {
      const tbl = p.querySelector(":scope > table");
      if (tbl) p.replaceWith(tbl);
    });

    body.querySelectorAll("table").forEach((table) => {
      table.querySelectorAll("colgroup").forEach((cg) => cg.remove());

      const allRows = [];
      Array.from(table.children).forEach((child) => {
        const tag = child.tagName.toLowerCase();
        if (tag === "thead" || tag === "tbody" || tag === "tfoot") {
          child.querySelectorAll(":scope > tr").forEach((tr) => {
            allRows.push(tr);
          });
          child.remove();
        } else if (tag === "tr") {
          allRows.push(child);
          child.remove();
        }
      });

      if (allRows.length === 0) return;

      const tbody = doc.createElement("tbody");
      allRows.forEach((tr) => tbody.appendChild(tr));
      table.appendChild(tbody);
    });

    return body.innerHTML;
  } catch {
    return s;
  }
}

export default function TipTapEditor({ value, onChange, placeholder = "Type / for commands…", variant = "default", tableColors: tableColorsProp, onTableColorsChange }) {
  const isNotion = variant === "notion";
  const [tableColorPreset, setTableColorPreset] = useState(0);
  const [tableColorCustom, setTableColorCustom] = useState(null);
  const editorRef = useRef(null);
  const addBlockContextRef = useRef(null); // { pos, nodeSize } for add-block-after
  /** Last HTML we emitted via onChange — skip setContent for echo updates from the parent. */
  const lastEmittedHtmlRef = useRef(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [blockMenuPos, setBlockMenuPos] = useState(null);
  /** Notion + menu: { x, y, insertPos } */
  const [insertBlockMenu, setInsertBlockMenu] = useState(null);
  const [slashHoveredItem, setSlashHoveredItem] = useState(null);
  const linkInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const youtubeInputRef = useRef(null);
  const pendingInsertRangeRef = useRef(null);
  /** When inserting from the Notion + menu, image/YouTube dialogs insert at this doc position. */
  const pendingInsertGapPosRef = useRef(null);
  const slashContextRef = useRef({ editor: null, range: null });
  /** While true, selection bubble stays visible (pointer down inside menu). Cleared on window pointerup. */
  const selectionBubbleHoldRef = useRef(false);
  /** Used to avoid clearing `selectionBubbleHoldRef` if the mouse is still inside the bubble menu. */
  const bubbleMenuHoverRef = useRef(false);

  const startBubbleHold = useCallback(() => {
    selectionBubbleHoldRef.current = true;
  }, []);
  const openImageDialog = useCallback(() => setImageDialogOpen(true), []);
  const openYoutubeDialog = useCallback(() => setYoutubeDialogOpen(true), []);
  const openLinkDialog = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const attrs = ed.getAttributes?.("link");
    setLinkUrl(attrs?.href ?? "");
    setLinkDialogOpen(true);
  }, []);

  const openBlockMenu = useCallback((pos) => {
    setInsertBlockMenu(null);
    setBlockMenuPos(pos);
  }, []);

  const openInsertBlockMenu = useCallback((payload) => {
    setBlockMenuPos(null);
    setInsertBlockMenu(payload);
  }, []);

  const closeInsertBlockMenu = useCallback(() => {
    setInsertBlockMenu(null);
    try {
      editorRef.current?.commands?.focus?.();
    } catch {
      /* ignore */
    }
  }, []);

  const handleRequestLinkAtGap = useCallback((insertPos) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.chain()
      .focus()
      .insertContentAt(insertPos, { type: "paragraph", content: [{ type: "text", text: "link" }] })
      .setTextSelection({ from: insertPos + 1, to: insertPos + 5 })
      .run();
    setLinkUrl("");
    setLinkDialogOpen(true);
  }, []);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let t = 0;
    /** Defer clearing so BubbleMenu’s post-transaction update still sees hold === true after pointerup. */
    const clearHold = () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (t) window.clearTimeout(t);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          // Delay slightly: BubbleMenu hides based on transactions + blur timing.
          // If the pointer is still over the bubble menu, keep it open.
          t = window.setTimeout(() => {
            if (!bubbleMenuHoverRef.current) selectionBubbleHoldRef.current = false;
          }, 60);
        });
      });
    };
    window.addEventListener("pointerup", clearHold, true);
    window.addEventListener("pointercancel", clearHold, true);
    window.addEventListener("mouseup", clearHold, true);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (t) window.clearTimeout(t);
      window.removeEventListener("pointerup", clearHold, true);
      window.removeEventListener("pointercancel", clearHold, true);
      window.removeEventListener("mouseup", clearHold, true);
    };
  }, []);

  const selectionBubbleShouldShow = useCallback(({ editor: ed, state, from, to }) => {
    if (!ed.isEditable) return false;
    if (ed.isActive("codeBlock")) return false;
    if (selectionBubbleHoldRef.current) return true;
    if (state.selection instanceof CellSelection) return true;
    if (state.selection instanceof NodeSelection && state.selection.node?.type?.name === "image") return false;
    if (!state.selection.empty) return true;
    if (from !== to) return true;
    if (typeof document !== "undefined") {
      const a = document.activeElement;
      if (a instanceof Element && a.closest("[data-tiptap-selection-bubble]")) return true;
    }
    return false;
  }, []);

  const runSlashCommand = useCallback((item, ctx) => {
    const c = slashContextRef.current;
    const useCtx = (c?.editor && c?.range) ? { editor: c.editor, range: c.range } : ctx;
    item.command(useCtx);
  }, []);

  const slashSuggestions = useMemo(() => createSuggestionsItems([
    { title: "Text", searchTerms: ["paragraph", "p"], description: "Plain text paragraph", icon: "¶", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).setParagraph().run() },
    { title: "Heading 1", searchTerms: ["h1", "title", "big"], description: "Large section heading", icon: "H1", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).setHeading({ level: 1 }).run() },
    { title: "Heading 2", searchTerms: ["h2", "subtitle"], description: "Medium section heading", icon: "H2", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).setHeading({ level: 2 }).run() },
    { title: "Heading 3", searchTerms: ["h3"], description: "Small section heading", icon: "H3", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).setHeading({ level: 3 }).run() },
    { title: "Bullet list", searchTerms: ["ul", "unordered", "point"], description: "Create a bulleted list", icon: "•", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).toggleBulletList().run() },
    { title: "Numbered list", searchTerms: ["ol", "ordered", "numbers"], description: "Create a list with numbering", icon: "1.", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).toggleOrderedList().run() },
    { title: "To-do list", searchTerms: ["task", "checkbox", "todo"], description: "Track tasks with checkboxes", icon: "☑", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).toggleTaskList().run() },
    { title: "Toggle list", searchTerms: ["toggle", "collapse"], description: "Collapsible content block", icon: "▸", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).toggleBlockquote().run() },
    { title: "Quote", searchTerms: ["blockquote", "callout"], description: "Capture a quote", icon: "″", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).toggleBlockquote().run() },
    { title: "Callout", searchTerms: ["callout", "banner", "highlight"], description: "Emphasize important text", icon: "◻", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).toggleBlockquote().run() },
    { title: "Code", searchTerms: ["codeblock", "pre"], description: "Code block with syntax", icon: "</>", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).toggleCodeBlock().run() },
    { title: "Divider", searchTerms: ["hr", "line", "separator"], description: "Visually divide blocks", icon: "—", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).setHorizontalRule().run() },
    { title: "Table", searchTerms: ["grid", "table", "tabel"], description: "Insert a table", icon: "▦", command: ({ editor, range }) => editor.chain().focus().setTextSelection(range.from).deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { title: "Link to page", searchTerms: ["link", "page"], description: "Insert or edit a link", icon: "↗", command: ({ editor, range }) => { editor.chain().focus().setTextSelection(range.from).deleteRange(range).insertContent("link").run(); editor.chain().focus().setTextSelection({ from: range.from, to: range.from + 4 }).run(); openLinkDialog(); } },
    { title: "Image", searchTerms: ["img", "picture", "photo"], description: "Upload or embed an image", icon: "🖼", command: ({ editor, range }) => { pendingInsertGapPosRef.current = null; pendingInsertRangeRef.current = range; openImageDialog(); } },
    { title: "YouTube", searchTerms: ["video", "embed", "youtube"], description: "Embed a YouTube video", icon: "▶", command: ({ editor, range }) => { pendingInsertGapPosRef.current = null; pendingInsertRangeRef.current = range; openYoutubeDialog(); } },
  ]), [openImageDialog, openYoutubeDialog, openLinkDialog]);

  const slashRender = useCallback((elementRef) => {
    const renderer = defaultRenderItems(elementRef);
    return {
      ...renderer,
      onStart: (props) => {
        if (props?.editor && props?.range != null) {
          slashContextRef.current = { editor: props.editor, range: props.range };
        }
        return renderer.onStart(props);
      },
      onUpdate: (props) => {
        if (props?.editor && props?.range != null) {
          slashContextRef.current = { editor: props.editor, range: props.range };
        }
        return renderer.onUpdate(props);
      },
      onExit: () => {
        slashContextRef.current = { editor: null, range: null };
        return renderer.onExit();
      },
    };
  }, []);

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
    }),
    Underline,
    Placeholder.configure({ placeholder }),
    TextAlign.configure({ types: ["heading", "paragraph", "tableCell", "tableHeader"] }),
    Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
    StoryImage.configure({
      inline: false,
      allowBase64: false,
    }),
    TableKit.configure({
      table: {
        resizable: true, /* Notion: drag column borders to resize */
        cellMinWidth: 80,
        HTMLAttributes: { class: "notion-table" },
      },
      tableCell: {
        HTMLAttributes: { class: "notion-table-cell" },
      },
      tableHeader: {
        HTMLAttributes: { class: "notion-table-header" },
      },
      tableRow: false,
    }),
    TableRowResize,
    NodeBackground,
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    FontSize,
    Typography,
    TaskList,
    TaskItem.configure({ nested: true }),
    CodeBlock,
    Dropcursor.configure({ width: 2, color: isNotion ? "#6b7280" : "#3b82f6" }),
    Youtube.configure({ width: 640, height: 360 }),
    Slash.configure({
      suggestion: {
        char: "/",
        // Allow "/" anywhere in a block (Notion-style). startOfLine made Image/Video
        // feel "missing" because few users type / only at column 0.
        startOfLine: false,
        items: ({ query }) => {
          const q = (query || "").toLowerCase();
          if (!q) return slashSuggestions;
          return slashSuggestions.filter(
            (s) =>
              s.title.toLowerCase().includes(q) ||
              (s.searchTerms && s.searchTerms.some((t) => t.toLowerCase().includes(q)))
          );
        },
        render: slashRender,
      },
      }),
  ], [slashSuggestions, slashRender, isNotion, placeholder]);

  const extensionsWithHandle = useMemo(() => {
    const ext = [...extensions];
    if (isNotion) {
      ext.push(DragHandle.configure({
        render: createDragHandleRender(
          editorRef,
          true,
          openBlockMenu,
          openInsertBlockMenu,
          () => addBlockContextRef.current
        ),
        computePositionConfig: { placement: "left-start", strategy: "fixed" },
        onNodeChange: ({ node, pos }) => {
          addBlockContextRef.current = node ? { pos, nodeSize: node.nodeSize } : null;
        },
      }));
    }
    return ext;
  }, [isNotion, extensions, openBlockMenu, openInsertBlockMenu]);

  const preparedContent = useMemo(() => normalizeHtmlForTiptap(value || ""), [value]);

  const [bootError, setBootError] = useState(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: extensionsWithHandle,
    content: preparedContent,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: `${styles.editorContent} ${isNotion ? styles.editorContentNotion : ""}`,
        spellcheck: "true",
      },
      handleDOMEvents: {
        keydown: (view, event) => enableKeyboardNavigation(event),
      },
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    const onErr = (event) => {
      const msg = event?.reason?.stack || event?.reason?.message || event?.message || String(event?.reason || "");
      if (msg) setBootError(String(msg).slice(0, 800));
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onErr);
    const t = setTimeout(() => {
      if (!editorRef.current) {
        setBootError((prev) => prev || "Editor did not start.");
      }
    }, 2500);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onErr);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!editor) return;
    // Only apply external value changes (story load / reset). Do not fight live typing
    // when TipTap's getHTML() serialization differs slightly from the prop.
    if (preparedContent === lastEmittedHtmlRef.current) return;
    if (editor.isFocused) return;
    const current = editor.getHTML();
    if (current === preparedContent) {
      lastEmittedHtmlRef.current = preparedContent;
      return;
    }
    editor.commands.setContent(preparedContent, { emitUpdate: false });
    lastEmittedHtmlRef.current = preparedContent;
  }, [preparedContent, editor]);

  const tableColorVars = tableColorsProp ?? tableColorCustom ?? (TABLE_COLOR_PRESETS[tableColorPreset] ?? TABLE_COLOR_PRESETS[0]);

  const tableColorsPropSig = useMemo(
    () =>
      tableColorsProp && typeof tableColorsProp === "object"
        ? `${tableColorsProp.bg}|${tableColorsProp.headerBg}|${tableColorsProp.headerText}`
        : "",
    [tableColorsProp]
  );

  useEffect(() => {
    if (!isNotion) return;
    if (!tableColorsProp || typeof tableColorsProp !== "object") {
      setTableColorPreset(0);
      setTableColorCustom(null);
      return;
    }
    const idx = TABLE_COLOR_PRESETS.findIndex(
      (p) =>
        p.bg === tableColorsProp.bg &&
        p.headerBg === tableColorsProp.headerBg &&
        p.headerText === tableColorsProp.headerText
    );
    if (idx >= 0) {
      setTableColorPreset(idx);
      setTableColorCustom(null);
    } else {
      setTableColorCustom({
        bg: tableColorsProp.bg,
        headerBg: tableColorsProp.headerBg,
        headerText: tableColorsProp.headerText,
      });
    }
  }, [isNotion, tableColorsPropSig, tableColorsProp]);

  useEffect(() => {
    if (!editor || !isNotion) return;
    const dom = editor.view?.dom;
    if (dom) {
      dom.style.setProperty("--notion-table-bg", tableColorVars.bg);
      dom.style.setProperty("--notion-table-header-bg", tableColorVars.headerBg);
      dom.style.setProperty("--notion-table-header-text", tableColorVars.headerText);
      dom.style.setProperty("--notion-table-text", tableColorVars.headerText);
    }
  }, [editor, isNotion, tableColorPreset, tableColorCustom, tableColorsProp, tableColorVars.bg, tableColorVars.headerBg, tableColorVars.headerText]);

  useEffect(() => { if (linkDialogOpen) setTimeout(() => linkInputRef.current?.focus(), 50); }, [linkDialogOpen]);
  useEffect(() => { if (imageDialogOpen) setTimeout(() => imageInputRef.current?.focus(), 50); }, [imageDialogOpen]);
  useEffect(() => { if (youtubeDialogOpen) setTimeout(() => youtubeInputRef.current?.focus(), 50); }, [youtubeDialogOpen]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl.trim()) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    setLinkDialogOpen(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const insertImage = useCallback(() => {
    if (!editor || !imageUrl.trim()) return;
    const gap = pendingInsertGapPosRef.current;
    const range = pendingInsertRangeRef.current;
    const chain = editor.chain().focus();
    if (gap != null) {
      pendingInsertGapPosRef.current = null;
      chain.setTextSelection(gap).setImage({ src: imageUrl.trim() }).run();
      setImageDialogOpen(false);
      setImageUrl("");
      return;
    }
    if (range) {
      chain.setTextSelection(range.from).deleteRange(range);
      pendingInsertRangeRef.current = null;
    }
    chain.setImage({ src: imageUrl.trim() }).run();
    setImageDialogOpen(false);
    setImageUrl("");
  }, [editor, imageUrl]);

  const insertYoutube = useCallback(() => {
    if (!editor || !youtubeUrl.trim()) return;
    const gap = pendingInsertGapPosRef.current;
    const range = pendingInsertRangeRef.current;
    const chain = editor.chain().focus();
    if (gap != null) {
      pendingInsertGapPosRef.current = null;
      chain.setTextSelection(gap).setYoutubeVideo({ src: youtubeUrl.trim() }).run();
      setYoutubeDialogOpen(false);
      setYoutubeUrl("");
      return;
    }
    if (range) {
      chain.setTextSelection(range.from).deleteRange(range);
      pendingInsertRangeRef.current = null;
    }
    chain.setYoutubeVideo({ src: youtubeUrl.trim() }).run();
    setYoutubeDialogOpen(false);
    setYoutubeUrl("");
  }, [editor, youtubeUrl]);

  if (!editor) {
    return (
      <div style={{ padding: 24, color: '#a1a1aa', fontSize: 14 }}>
        {bootError || 'Loading editor…'}
      </div>
    );
  }
  const can = editor.can().chain().focus();

  const dialogClass = isNotion ? styles.dialogNotion : "";

  const wrapperStyle = isNotion ? {
    "--notion-table-bg": tableColorVars.bg,
    "--notion-table-header-bg": tableColorVars.headerBg,
    "--notion-table-header-text": tableColorVars.headerText,
  } : undefined;

  return (
    <SlashCmdProvider>
      <div className={`${styles.wrapper} ${isNotion ? styles.wrapperNotion : ""}`} style={wrapperStyle}>
        {!isNotion && (
          <div className={styles.toolbar}>
            <ToolbarBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Paragraph">P</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1">H1</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">H2</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3">H3</ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><b>B</b></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><i>I</i></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><u>U</u></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough"><s>S</s></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Code">{"`"}</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">✦</ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">⬅</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">↔</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">➡</ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">•</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">1.</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="To-do">☑</ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">"</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block">{"</>"}</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">—</ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn onClick={openLinkDialog} active={editor.isActive("link")} title="Link">🔗</ToolbarBtn>
            <ToolbarBtn onClick={() => setImageDialogOpen(true)} title="Image">🖼</ToolbarBtn>
            <ToolbarBtn onClick={() => setYoutubeDialogOpen(true)} title="YouTube">▶</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Table">⊞</ToolbarBtn>
            {editor.isActive("table") && (
              <>
                <ToolbarSep />
                <ToolbarBtn onClick={() => editor.chain().focus().addColumnBefore().run()} title="+Col">+Col</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="+Col">+Col→</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="−Col">−Col</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().addRowBefore().run()} title="+Row">+Row↑</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="+Row">+Row↓</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().deleteRow().run()} title="−Row">−Row</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table">✕</ToolbarBtn>
              </>
            )}
            <ToolbarSep />
            <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!can.undo().run()} title="Undo">↩</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!can.redo().run()} title="Redo">↪</ToolbarBtn>
          </div>
        )}

        <BubbleMenu
          editor={editor}
          updateDelay={0}
          appendTo={() => (typeof document !== "undefined" ? document.body : undefined)}
          options={{ hide: false }}
          data-tiptap-selection-bubble=""
          tippyOptions={{ duration: 150, interactive: true }}
          className={isNotion ? styles.bubbleMenuNotion : styles.bubbleMenu}
          shouldShow={selectionBubbleShouldShow}
        >
          <div
            className={styles.bubbleMenuInner}
            onPointerDownCapture={() => {
              selectionBubbleHoldRef.current = true;
            }}
            onMouseDownCapture={() => {
              selectionBubbleHoldRef.current = true;
            }}
            onPointerEnter={() => {
              bubbleMenuHoverRef.current = true;
            }}
            onPointerLeave={() => {
              bubbleMenuHoverRef.current = false;
            }}
            onMouseEnter={() => {
              bubbleMenuHoverRef.current = true;
            }}
            onMouseLeave={() => {
              bubbleMenuHoverRef.current = false;
            }}
          >
            <ToolbarBtn
              onClick={() => {
                startBubbleHold();
                runFontSizeCommandPreservingSelection(editor, (c) => c.toggleBold());
              }}
              active={editor.isActive("bold")}
            >
              <b>B</b>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => {
                startBubbleHold();
                runFontSizeCommandPreservingSelection(editor, (c) => c.toggleItalic());
              }}
              active={editor.isActive("italic")}
            >
              <i>I</i>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => {
                startBubbleHold();
                runFontSizeCommandPreservingSelection(editor, (c) => c.toggleUnderline());
              }}
              active={editor.isActive("underline")}
            >
              <u>U</u>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => {
                startBubbleHold();
                runFontSizeCommandPreservingSelection(editor, (c) => c.toggleStrike());
              }}
              active={editor.isActive("strike")}
            >
              <s>S</s>
            </ToolbarBtn>
            <ToolbarBtn onClick={openLinkDialog} active={editor.isActive("link")}>🔗</ToolbarBtn>
            <ToolbarBtn
              onClick={() => {
                startBubbleHold();
                runFontSizeCommandPreservingSelection(editor, (c) => c.toggleHighlight());
              }}
              active={editor.isActive("highlight")}
            >
              ✦
            </ToolbarBtn>
            <ToolbarSep />
            <TextColorPicker editor={editor} onHoldStart={startBubbleHold} dark={isNotion} />
            <ToolbarSep />
            <FontSizeStepper editor={editor} onHoldStart={startBubbleHold} />
          </div>
        </BubbleMenu>

        <ImageEditBubbleMenu editor={editor} dark={isNotion} />

        {!isNotion && (
          <BubbleMenu editor={editor} pluginKey="tableBubbleMenu" tippyOptions={{ duration: 150, placement: "top", offset: [0, 8] }} shouldShow={({ editor: ed }) => ed.isActive("table")} className={styles.tableBubbleMenu}>
            <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">⬅</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">↔</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">➡</ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add column before">+ Col ←</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column after">+ Col →</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete column">− Col</ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn onClick={() => editor.chain().focus().addRowBefore().run()} title="Add row above">+ Row ↑</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row below">+ Row ↓</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row">− Row</ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table">Delete table</ToolbarBtn>
          </BubbleMenu>
        )}
        {/* Notion mode: table controls are contextual (NotionTableControls at edges/handles) - no floating bar */}
        <div
          className={`${styles.editorArea} ${isNotion ? styles.editorAreaNotion : ""}`}
          data-tiptap-editor-container
          style={isNotion ? {
            "--notion-table-bg": tableColorVars.bg,
            "--notion-table-header-bg": tableColorVars.headerBg,
            "--notion-table-header-text": tableColorVars.headerText,
          } : undefined}
        >
          <EditorContent editor={editor} />
          {isNotion && <NotionTableControls editor={editor} />}
          {isNotion && blockMenuPos && typeof document !== "undefined" && createPortal(
            <BlockContextMenu
              editor={editor}
              position={blockMenuPos}
              onClose={() => { setBlockMenuPos(null); setInsertBlockMenu(null); editor?.commands?.focus?.(); }}
              unlockDragHandle={() => { try { editor.commands.unlockDragHandle?.(); } catch (_) {} }}
              tableColorPresets={TABLE_COLOR_PRESETS}
              tableColorPresetIndex={tableColorPreset}
              tableColorCustom={tableColorCustom}
              onTableColorPresetChange={(idx) => {
                setTableColorPreset(idx);
                setTableColorCustom(null);
                const p = TABLE_COLOR_PRESETS[idx];
                if (p) onTableColorsChange?.({ bg: p.bg, headerBg: p.headerBg, headerText: p.headerText });
              }}
              onTableColorCustomChange={(c) => {
                setTableColorCustom(c);
                onTableColorsChange?.(c);
              }}
            />,
            document.body
          )}
          {isNotion && insertBlockMenu && typeof document !== "undefined" && createPortal(
            <NotionInsertBlockMenu
              editor={editor}
              position={{ x: insertBlockMenu.x, y: insertBlockMenu.y }}
              insertPos={insertBlockMenu.insertPos}
              onClose={closeInsertBlockMenu}
              onRequestImage={(pos) => {
                pendingInsertRangeRef.current = null;
                pendingInsertGapPosRef.current = pos;
                setImageDialogOpen(true);
              }}
              onRequestYoutube={(pos) => {
                pendingInsertRangeRef.current = null;
                pendingInsertGapPosRef.current = pos;
                setYoutubeDialogOpen(true);
              }}
              onRequestLink={handleRequestLinkAtGap}
            />,
            document.body
          )}
          <SlashCmd.Root editor={editor}>
            <SlashCmd.Cmd className={isNotion ? styles.slashCmdNotion : styles.slashCmd}>
              <div className={styles.slashCmdSearchBar}>
                <span className={styles.slashCmdSearchPlaceholder}>Type to filter…</span>
              </div>
              <SlashCmd.Empty>No results</SlashCmd.Empty>
              <div className={styles.slashCmdContent}>
                <SlashCmd.List className={styles.slashCmdList}>
                  {slashSuggestions.map((item) => (
                    <SlashCmd.Item
                      key={item.title}
                      value={item.title}
                      keywords={item.searchTerms}
                      onCommand={(ctx) => runSlashCommand(item, ctx)}
                      onMouseEnter={() => setSlashHoveredItem(item)}
                      onMouseLeave={() => setSlashHoveredItem(null)}
                      className={styles.slashCmdItem}
                    >
                      <span className={styles.slashCmdIcon}>{item.icon ?? "•"}</span>
                      {item.title}
                    </SlashCmd.Item>
                  ))}
                </SlashCmd.List>
                {isNotion && slashHoveredItem && (
                  <div className={styles.slashCmdPreview}>
                    <div className={styles.slashCmdPreviewBox}>
                      {slashHoveredItem.title === "Divider" && <div className={styles.slashCmdPreviewDivider} />}
                      {slashHoveredItem.title === "Table" && <div className={styles.slashCmdPreviewTable}><div /><div /><div /><div /></div>}
                      {!["Divider", "Table"].includes(slashHoveredItem.title) && <span className={styles.slashCmdPreviewIcon}>{slashHoveredItem.icon}</span>}
                    </div>
                    <span className={styles.slashCmdPreviewCaption}>{slashHoveredItem.description ?? slashHoveredItem.title}</span>
                  </div>
                )}
              </div>
              <div className={styles.slashCmdFooter}>Close menu <kbd>esc</kbd></div>
            </SlashCmd.Cmd>
          </SlashCmd.Root>
        </div>

        {linkDialogOpen && (
          <div className={`${styles.dialogOverlay} ${dialogClass}`} onClick={() => setLinkDialogOpen(false)}>
            <div className={`${styles.dialog} ${isNotion ? styles.dialogDark : ""}`} onClick={(e) => e.stopPropagation()}>
              <p className={styles.dialogTitle}>Insert / Edit Link</p>
              <input ref={linkInputRef} className={styles.dialogInput} type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setLinkDialogOpen(false); }} />
              <div className={styles.dialogActions}>
                <button type="button" className={styles.dialogBtn} onClick={applyLink}>Apply</button>
                {editor.isActive("link") && <button type="button" className={`${styles.dialogBtn} ${styles.dialogBtnDanger}`} onClick={() => { editor.chain().focus().unsetLink().run(); setLinkDialogOpen(false); }}>Remove</button>}
                <button type="button" className={`${styles.dialogBtn} ${styles.dialogBtnGhost}`} onClick={() => setLinkDialogOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {imageDialogOpen && (
          <div className={`${styles.dialogOverlay} ${dialogClass}`} onClick={() => { pendingInsertRangeRef.current = null; pendingInsertGapPosRef.current = null; setImageDialogOpen(false); }}>
            <div className={`${styles.dialog} ${isNotion ? styles.dialogDark : ""}`} onClick={(e) => e.stopPropagation()}>
              <p className={styles.dialogTitle}>Insert Image URL</p>
              {isNotion && (
                <p className={styles.dialogHint}>
                  Paste a public image URL (Cloudinary, CDN, etc.). For MP4 video in the article body, use <strong>Video</strong> only for YouTube; otherwise add the story <strong>Video URL</strong> field above or link to the clip.
                </p>
              )}
              <input ref={imageInputRef} className={styles.dialogInput} type="url" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") insertImage(); if (e.key === "Escape") { pendingInsertRangeRef.current = null; pendingInsertGapPosRef.current = null; setImageDialogOpen(false); } }} />
              <div className={styles.dialogActions}>
                <button type="button" className={styles.dialogBtn} onClick={insertImage}>Insert</button>
                <button type="button" className={`${styles.dialogBtn} ${styles.dialogBtnGhost}`} onClick={() => { pendingInsertRangeRef.current = null; pendingInsertGapPosRef.current = null; setImageDialogOpen(false); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {youtubeDialogOpen && (
          <div className={`${styles.dialogOverlay} ${dialogClass}`} onClick={() => { pendingInsertRangeRef.current = null; pendingInsertGapPosRef.current = null; setYoutubeDialogOpen(false); }}>
            <div className={`${styles.dialog} ${isNotion ? styles.dialogDark : ""}`} onClick={(e) => e.stopPropagation()}>
              <p className={styles.dialogTitle}>Insert YouTube Video</p>
              {isNotion && (
                <p className={styles.dialogHint}>
                  Supports youtube.com, youtu.be, Shorts, and /live/ URLs. Other hosts are not embedded here — use a <strong>Link</strong> instead.
                </p>
              )}
              <input ref={youtubeInputRef} className={styles.dialogInput} type="url" placeholder="https://youtube.com/watch?v=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") insertYoutube(); if (e.key === "Escape") { pendingInsertRangeRef.current = null; pendingInsertGapPosRef.current = null; setYoutubeDialogOpen(false); } }} />
              <div className={styles.dialogActions}>
                <button type="button" className={styles.dialogBtn} onClick={insertYoutube}>Insert</button>
                <button type="button" className={`${styles.dialogBtn} ${styles.dialogBtnGhost}`} onClick={() => { pendingInsertRangeRef.current = null; pendingInsertGapPosRef.current = null; setYoutubeDialogOpen(false); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SlashCmdProvider>
  );
}
