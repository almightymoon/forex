"use client";

import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import styles from "./TipTapEditor.module.css";

const PADDING = 8;

function clampToViewport(x, y, width, height) {
  if (typeof window === "undefined") return { x, y };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let nx = x;
  let ny = y;
  if (nx + width > vw - PADDING) nx = vw - width - PADDING;
  if (nx < PADDING) nx = PADDING;
  if (ny + height > vh - PADDING) ny = vh - height - PADDING;
  if (ny < PADDING) ny = PADDING;
  return { x: nx, y: ny };
}

function getInsertItems() {
  return [
    {
      id: "text",
      title: "Text",
      description: "Plain paragraph",
      icon: "¶",
      keywords: ["paragraph", "text", "p"],
      run: (editor, insertPos) => {
        editor.chain().focus().insertContentAt(insertPos, { type: "paragraph" }).run();
      },
    },
    {
      id: "h1",
      title: "Heading 1",
      description: "Large section heading",
      icon: "H1",
      keywords: ["h1", "title", "big"],
      run: (editor, insertPos) => {
        editor.chain().focus().insertContentAt(insertPos, { type: "heading", attrs: { level: 1 }, content: [] }).run();
      },
    },
    {
      id: "h2",
      title: "Heading 2",
      description: "Medium section heading",
      icon: "H2",
      keywords: ["h2", "subtitle"],
      run: (editor, insertPos) => {
        editor.chain().focus().insertContentAt(insertPos, { type: "heading", attrs: { level: 2 }, content: [] }).run();
      },
    },
    {
      id: "h3",
      title: "Heading 3",
      description: "Small section heading",
      icon: "H3",
      keywords: ["h3"],
      run: (editor, insertPos) => {
        editor.chain().focus().insertContentAt(insertPos, { type: "heading", attrs: { level: 3 }, content: [] }).run();
      },
    },
    {
      id: "bullet",
      title: "Bullet list",
      description: "Bulleted list",
      icon: "•",
      keywords: ["ul", "unordered", "point"],
      run: (editor, insertPos) => {
        editor
          .chain()
          .focus()
          .insertContentAt(insertPos, {
            type: "bulletList",
            content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
          })
          .run();
      },
    },
    {
      id: "ordered",
      title: "Numbered list",
      description: "Numbered list",
      icon: "1.",
      keywords: ["ol", "ordered", "numbers"],
      run: (editor, insertPos) => {
        editor
          .chain()
          .focus()
          .insertContentAt(insertPos, {
            type: "orderedList",
            content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
          })
          .run();
      },
    },
    {
      id: "todo",
      title: "To-do list",
      description: "Checklist",
      icon: "☑",
      keywords: ["task", "checkbox", "todo"],
      run: (editor, insertPos) => {
        editor
          .chain()
          .focus()
          .insertContentAt(insertPos, {
            type: "taskList",
            content: [
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [{ type: "paragraph" }],
              },
            ],
          })
          .run();
      },
    },
    {
      id: "quote",
      title: "Quote",
      description: "Blockquote",
      icon: "″",
      keywords: ["blockquote", "callout"],
      run: (editor, insertPos) => {
        editor.chain().focus().insertContentAt(insertPos, { type: "blockquote", content: [{ type: "paragraph" }] }).run();
      },
    },
    {
      id: "code",
      title: "Code",
      description: "Code block",
      icon: "</>",
      keywords: ["codeblock", "pre"],
      run: (editor, insertPos) => {
        editor.chain().focus().insertContentAt(insertPos, { type: "codeBlock" }).run();
      },
    },
    {
      id: "divider",
      title: "Divider",
      description: "Horizontal rule",
      icon: "—",
      keywords: ["hr", "line", "separator"],
      run: (editor, insertPos) => {
        editor.chain().focus().insertContentAt(insertPos, { type: "horizontalRule" }).run();
      },
    },
    {
      id: "table",
      title: "Table",
      description: "3×3 with header",
      icon: "▦",
      keywords: ["grid", "table"],
      run: (editor, insertPos) => {
        editor.chain().focus().setTextSelection(insertPos).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      },
    },
    {
      id: "image",
      title: "Image",
      description: "Embed from URL",
      icon: "🖼",
      keywords: ["img", "picture", "photo"],
      kind: "image",
    },
    {
      id: "youtube",
      title: "YouTube",
      description: "Embed a video",
      icon: "▶",
      keywords: ["video", "embed", "youtube"],
      kind: "youtube",
    },
    {
      id: "link",
      title: "Link",
      description: "Insert a link",
      icon: "↗",
      keywords: ["url", "href", "page"],
      kind: "link",
    },
  ];
}

export default function NotionInsertBlockMenu({ editor, position, insertPos, onClose, onRequestImage, onRequestYoutube, onRequestLink }) {
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [adjustedPos, setAdjustedPos] = useState(position);
  const [query, setQuery] = useState("");

  const items = useMemo(() => getInsertItems(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        (it.description && it.description.toLowerCase().includes(q)) ||
        (it.keywords && it.keywords.some((k) => k.toLowerCase().includes(q)))
    );
  }, [items, query]);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    setAdjustedPos(clampToViewport(position.x, position.y, rect.width, rect.height));
  }, [position.x, position.y]);

  useEffect(() => {
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  useEffect(() => {
    const onPointerDownCapture = (e) => {
      if (!menuRef.current) return;
      const t = e.target;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      const inside =
        (t instanceof Node && menuRef.current.contains(t)) ||
        path.some((n) => n instanceof Node && menuRef.current.contains(n));
      if (!inside) onClose();
    };
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDownCapture, true);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
    };
  }, [onClose]);

  if (!editor || insertPos == null) return null;

  const pick = (item) => {
    if (item.kind === "image") {
      onRequestImage?.(insertPos);
      onClose();
      return;
    }
    if (item.kind === "youtube") {
      onRequestYoutube?.(insertPos);
      onClose();
      return;
    }
    if (item.kind === "link") {
      onRequestLink?.(insertPos);
      onClose();
      return;
    }
    try {
      item.run?.(editor, insertPos);
    } catch {
      /* ignore */
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className={styles.blockContextMenu}
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
      role="menu"
      aria-label="Insert block"
    >
      <input
        ref={searchRef}
        type="search"
        className={styles.blockContextSearch}
        placeholder="Search blocks…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && filtered.length === 1) {
            e.preventDefault();
            pick(filtered[0]);
          }
        }}
      />
      {filtered.length === 0 ? (
        <div className={styles.blockContextFooter}>No results</div>
      ) : (
        filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={styles.blockContextItem}
            onClick={() => pick(item)}
          >
            <span style={{ marginRight: 8, opacity: 0.85 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>
              {item.title}
              {item.description ? <span style={{ display: "block", fontSize: "0.75rem", color: "#a1a1aa", fontWeight: 400 }}>{item.description}</span> : null}
            </span>
          </button>
        ))
      )}
      <div className={styles.blockContextFooter}>
        <kbd>/</kbd> for the same commands in text
      </div>
    </div>
  );
}
