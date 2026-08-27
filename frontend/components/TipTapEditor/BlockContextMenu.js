"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const TURN_INTO = [
  { label: "Text", run: (ed) => ed.chain().focus().setParagraph().run() },
  { label: "Heading 1", run: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2", run: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", run: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Bullet list", run: (ed) => ed.chain().focus().toggleBulletList().run() },
  { label: "Numbered list", run: (ed) => ed.chain().focus().toggleOrderedList().run() },
  { label: "To-do list", run: (ed) => ed.chain().focus().toggleTaskList().run() },
  { label: "Quote", run: (ed) => ed.chain().focus().toggleBlockquote().run() },
  { label: "Code", run: (ed) => ed.chain().focus().toggleCodeBlock().run() },
  { label: "Table", run: (ed) => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
];

const TABLE_ACTIONS = [
  { label: "Align left", run: (ed) => ed.chain().focus().setTextAlign("left").run() },
  { label: "Align center", run: (ed) => ed.chain().focus().setTextAlign("center").run() },
  { label: "Align right", run: (ed) => ed.chain().focus().setTextAlign("right").run() },
  { label: "Add row above", run: (ed) => ed.chain().focus().addRowBefore().run() },
  { label: "Add row below", run: (ed) => ed.chain().focus().addRowAfter().run() },
  { label: "Add column before", run: (ed) => ed.chain().focus().addColumnBefore().run() },
  { label: "Add column after", run: (ed) => ed.chain().focus().addColumnAfter().run() },
  { label: "Merge cells", run: (ed) => ed.chain().focus().mergeCells().run() },
  { label: "Split cell", run: (ed) => ed.chain().focus().splitCell().run() },
  { label: "Delete row", run: (ed) => ed.chain().focus().deleteRow().run() },
  { label: "Delete column", run: (ed) => ed.chain().focus().deleteColumn().run() },
  { label: "Delete table", run: (ed) => ed.chain().focus().deleteTable().run() },
];

const COLORS = [
  { label: "Default", color: null },
  { label: "Gray", color: "#9ca3af" },
  { label: "Red", color: "#ef4444" },
  { label: "Orange", color: "#f97316" },
  { label: "Yellow", color: "#eab308" },
  { label: "Green", color: "#22c55e" },
  { label: "Blue", color: "#3b82f6" },
  { label: "Purple", color: "#a855f7" },
];

function hexToRgba(hex, alpha = 1) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function darkenHex(hex, factor = 0.7) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = Math.round(parseInt(m[1], 16) * factor);
  const g = Math.round(parseInt(m[2], 16) * factor);
  const b = Math.round(parseInt(m[3], 16) * factor);
  return `#${Math.min(255, r).toString(16).padStart(2, "0")}${Math.min(255, g).toString(16).padStart(2, "0")}${Math.min(255, b).toString(16).padStart(2, "0")}`;
}

function normalizeHex6(input) {
  let hex = String(input || "").trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : null;
}

export default function BlockContextMenu({ editor, position, onClose, unlockDragHandle, tableColorPresets, tableColorPresetIndex, tableColorCustom, onTableColorPresetChange, onTableColorCustomChange }) {
  const menuRef = useRef(null);
  const submenuRef = useRef(null);
  const submenuLeaveTimerRef = useRef(null);
  /** Native `<input type="color">` UI is outside our DOM; ignore outside-close while it may be open. */
  const nativeColorPickerOpenRef = useRef(false);
  const nativeColorPickerCloseTimerRef = useRef(null);
  const [adjustedPos, setAdjustedPos] = useState(position);
  const [submenu, setSubmenu] = useState(null);
  const [submenuPos, setSubmenuPos] = useState({ top: 0, left: 0 });
  const [adjustedSubmenuPos, setAdjustedSubmenuPos] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const clamped = clampToViewport(position.x, position.y, rect.width, rect.height);
    setAdjustedPos(clamped);
  }, [position.x, position.y]);

  useLayoutEffect(() => {
    if (!submenu || !submenuRef.current) return;
    const rect = submenuRef.current.getBoundingClientRect();
    const clamped = clampToViewport(submenuPos.left, submenuPos.top, rect.width, rect.height);
    setAdjustedSubmenuPos(clamped);
  }, [submenu, submenuPos.left, submenuPos.top]);

  const markNativeColorPickerOpen = () => {
    nativeColorPickerOpenRef.current = true;
    if (nativeColorPickerCloseTimerRef.current) {
      window.clearTimeout(nativeColorPickerCloseTimerRef.current);
      nativeColorPickerCloseTimerRef.current = null;
    }
  };

  const scheduleNativeColorPickerClosed = () => {
    if (nativeColorPickerCloseTimerRef.current) window.clearTimeout(nativeColorPickerCloseTimerRef.current);
    nativeColorPickerCloseTimerRef.current = window.setTimeout(() => {
      nativeColorPickerOpenRef.current = false;
      nativeColorPickerCloseTimerRef.current = null;
    }, 900);
  };

  const cancelSubmenuLeave = () => {
    if (submenuLeaveTimerRef.current) {
      window.clearTimeout(submenuLeaveTimerRef.current);
      submenuLeaveTimerRef.current = null;
    }
  };

  const scheduleSubmenuClose = () => {
    cancelSubmenuLeave();
    submenuLeaveTimerRef.current = window.setTimeout(() => {
      submenuLeaveTimerRef.current = null;
      setSubmenu(null);
    }, 240);
  };

  useEffect(() => {
    if (submenuLeaveTimerRef.current) {
      window.clearTimeout(submenuLeaveTimerRef.current);
      submenuLeaveTimerRef.current = null;
    }
  }, [submenu]);

  useEffect(() => {
    const onPointerDownCapture = (e) => {
      if (!menuRef.current) return;
      if (nativeColorPickerOpenRef.current) return;
      const t = e.target;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      const inside =
        (t instanceof Node && menuRef.current.contains(t)) ||
        path.some((n) => n instanceof Node && menuRef.current.contains(n));
      if (inside) return;
      if (submenu) setSubmenu(null);
      else {
        onClose();
        unlockDragHandle?.();
      }
    };
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDownCapture, true);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
    };
  }, [onClose, unlockDragHandle, submenu]);

  useEffect(
    () => () => {
      cancelSubmenuLeave();
      if (nativeColorPickerCloseTimerRef.current) window.clearTimeout(nativeColorPickerCloseTimerRef.current);
    },
    []
  );

  if (!editor) return null;

  function duplicateBlock() {
    const { state } = editor;
    const { from } = state.selection;
    const $pos = state.doc.resolve(from);
    const depth = $pos.depth;
    for (let d = depth; d > 0; d--) {
      const node = $pos.node(d);
      if (node.type.name !== "doc") {
        const pos = $pos.before(d);
        const end = pos + node.nodeSize;
        const slice = state.doc.slice(pos, end);
        editor.chain().focus().insertContentAt(from + ($pos.parentOffset > 0 ? $pos.parent.content.size : 0), slice.content).run();
        break;
      }
    }
    onClose();
    unlockDragHandle?.();
  }

  function deleteBlock() {
    const { state } = editor;
    const { from } = state.selection;
    const $pos = state.doc.resolve(from);
    const depth = $pos.depth;
    for (let d = depth; d > 0; d--) {
      const node = $pos.node(d);
      if (node.type.name !== "doc") {
        const pos = $pos.before(d);
        const end = pos + node.nodeSize;
        editor.chain().focus().deleteRange({ from: pos, to: end }).run();
        break;
      }
    }
    onClose();
    unlockDragHandle?.();
  }

  function runAndClose(fn) {
    fn(editor);
    setSubmenu(null);
    onClose();
    unlockDragHandle?.();
  }

  return (
    <div
      ref={menuRef}
      data-block-context-menu
      className={styles.blockContextMenu}
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      <input
        type="text"
        placeholder="Search actions..."
        className={styles.blockContextSearch}
        autoFocus
        onKeyDown={(e) => e.key === "Escape" && (submenu ? setSubmenu(null) : (onClose(), unlockDragHandle?.()))}
      />
      <div className={styles.blockContextDivider} />
      <button
        type="button"
        className={styles.blockContextItem}
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const pos = { top: r.top, left: r.right + 4 };
          setSubmenu("turninto");
          setSubmenuPos(pos);
          setAdjustedSubmenuPos({ x: pos.left, y: pos.top });
        }}
      >
        <span>Turn into</span>
        <span className={styles.blockContextArrow}>→</span>
      </button>
      <button
        type="button"
        className={styles.blockContextItem}
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const pos = { top: r.top, left: r.right + 4 };
          setSubmenu("color");
          setSubmenuPos(pos);
          setAdjustedSubmenuPos({ x: pos.left, y: pos.top });
        }}
      >
        <span>Color</span>
        <span className={styles.blockContextArrow}>→</span>
      </button>
      <div className={styles.blockContextDivider} />
      <button type="button" className={styles.blockContextItem} onClick={duplicateBlock}>
        Duplicate <kbd>⌘D</kbd>
      </button>
      <button type="button" className={styles.blockContextItem} onClick={deleteBlock}>
        Delete <kbd>Del</kbd>
      </button>
      {editor.isActive("table") && (
        <>
          <div className={styles.blockContextDivider} />
          {tableColorPresets?.length > 0 && onTableColorPresetChange && (
            <button
              type="button"
              className={styles.blockContextItem}
              onMouseEnter={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setSubmenu("tablecolors");
                setSubmenuPos({ top: r.top, left: r.right + 4 });
                setAdjustedSubmenuPos({ x: r.right + 4, y: r.top });
              }}
            >
              <span>Table colors</span>
              <span className={styles.blockContextArrow}>→</span>
            </button>
          )}
          <div className={styles.blockContextSection}>Table</div>
          {TABLE_ACTIONS.map((a) => (
            <button key={a.label} type="button" className={styles.blockContextItem} onClick={() => runAndClose(a.run)}>
              {a.label}
            </button>
          ))}
        </>
      )}
      <div className={styles.blockContextFooter}>Close menu <kbd>esc</kbd></div>

      {submenu === "turninto" && (
        <div
          ref={submenuRef}
          className={styles.blockContextSubmenu}
          style={{ left: adjustedSubmenuPos.x, top: adjustedSubmenuPos.y }}
          onMouseEnter={cancelSubmenuLeave}
          onMouseLeave={scheduleSubmenuClose}
        >
          {TURN_INTO.map((opt) => (
            <button
              key={opt.label}
              type="button"
              className={styles.blockContextSubItem}
              onClick={() => runAndClose(opt.run)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {submenu === "color" && (
        <div
          ref={submenuRef}
          className={`${styles.blockContextSubmenu} ${styles.blockContextSubmenuTableColors}`}
          style={{ left: adjustedSubmenuPos.x, top: adjustedSubmenuPos.y }}
          onMouseEnter={cancelSubmenuLeave}
          onMouseLeave={scheduleSubmenuClose}
        >
          {COLORS.map((c) => (
            <button
              key={c.label}
              type="button"
              className={styles.blockContextSubItem}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const { from, to } = editor.state.selection;
                let chain = editor.chain().focus();
                if (from !== to) chain = chain.setTextSelection({ from, to });
                if (c.color == null) chain.setMark("textStyle", { color: null }).removeEmptyTextStyle().run();
                else chain.setMark("textStyle", { color: c.color }).run();
                runAndClose(() => {});
              }}
            >
              {c.color == null ? null : (
                <span className={styles.colorDot} style={{ background: c.color }} />
              )}
              {c.label}
            </button>
          ))}
          <div className={styles.blockContextDivider} />
          <div className={styles.blockContextSection}>Custom text color</div>
          <div className={styles.tableColorPickerRow}>
            <label className={styles.tableColorPickerLabel}>
              <span>Pick</span>
              <input
                type="color"
                className={styles.tableColorPickerInput}
                defaultValue="#e5e5e5"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={() => markNativeColorPickerOpen()}
                onBlur={() => scheduleNativeColorPickerClosed()}
                onChange={(e) => {
                  const hex = normalizeHex6(e.target.value);
                  if (!hex) return;
                  const { from, to } = editor.state.selection;
                  let chain = editor.chain().focus();
                  if (from !== to) chain = chain.setTextSelection({ from, to });
                  chain.setMark("textStyle", { color: hex }).run();
                }}
              />
            </label>
            <input
              type="text"
              placeholder="#e5e5e5"
              className={styles.tableColorHexInput}
              maxLength={7}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                const hex = normalizeHex6(e.target.value);
                if (!hex) return;
                const { from, to } = editor.state.selection;
                let chain = editor.chain().focus();
                if (from !== to) chain = chain.setTextSelection({ from, to });
                chain.setMark("textStyle", { color: hex }).run();
              }}
            />
          </div>
          {editor.isActive("table") && editor.commands?.setNodeBackgroundColor && (
            <>
              <div className={styles.blockContextDivider} />
              <div className={styles.blockContextSection}>Cell background</div>
              <div className={styles.tableColorPickerRow}>
                <label className={styles.tableColorPickerLabel}>
                  <span>Pick</span>
                  <input
                    type="color"
                    className={styles.tableColorPickerInput}
                    defaultValue="#27272a"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={() => markNativeColorPickerOpen()}
                    onBlur={() => scheduleNativeColorPickerClosed()}
                    onChange={(e) => {
                      const hex = normalizeHex6(e.target.value);
                      if (hex) editor.chain().focus().setNodeBackgroundColor(hex).run();
                    }}
                  />
                </label>
                <input
                  type="text"
                  placeholder="#27272a"
                  className={styles.tableColorHexInput}
                  maxLength={7}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const hex = normalizeHex6(e.target.value);
                    if (hex) editor.chain().focus().setNodeBackgroundColor(hex).run();
                  }}
                />
              </div>
              <button
                type="button"
                className={styles.blockContextSubItem}
                onClick={() => {
                  editor.chain().focus().unsetNodeBackgroundColor().run();
                }}
              >
                Clear cell background
              </button>
            </>
          )}
        </div>
      )}
      {submenu === "tablecolors" && tableColorPresets?.length > 0 && (
        <div
          ref={submenuRef}
          className={`${styles.blockContextSubmenu} ${styles.blockContextSubmenuTableColors}`}
          style={{ left: adjustedSubmenuPos.x, top: adjustedSubmenuPos.y }}
          onMouseEnter={cancelSubmenuLeave}
          onMouseLeave={scheduleSubmenuClose}
        >
          {tableColorPresets.map((preset, idx) => (
            <button
              key={preset.name}
              type="button"
              className={styles.blockContextSubItem}
              onClick={() => {
                onTableColorPresetChange?.(idx);
                setSubmenu(null);
                onClose();
                unlockDragHandle?.();
              }}
            >
              {preset.name === "Transparent" || preset.bg === "transparent" ? (
                <span className={`${styles.colorDot} ${styles.colorDotTransparent}`} aria-hidden />
              ) : (
                <span className={styles.colorDot} style={{ background: preset.headerBg }} />
              )}
              {preset.name}
              {tableColorPresetIndex === idx && !tableColorCustom ? " ✓" : ""}
            </button>
          ))}
          {onTableColorCustomChange && (
            <>
              <div className={styles.blockContextDivider} />
              <div className={styles.blockContextSection}>Custom color</div>
              <div className={styles.tableColorPickerRow}>
                <label className={styles.tableColorPickerLabel}>
                  <span>Pick color</span>
                  <input
                    type="color"
                    className={styles.tableColorPickerInput}
                    defaultValue="#1e293b"
                    onFocus={() => markNativeColorPickerOpen()}
                    onBlur={() => scheduleNativeColorPickerClosed()}
                    onChange={(e) => {
                      const hex = e.target.value;
                      const bg = hexToRgba(hex, 0.9);
                      const headerBg = hexToRgba(darkenHex(hex, 0.75), 0.95);
                      const headerText = "#e2e8f0";
                      onTableColorCustomChange({ bg, headerBg, headerText });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </label>
                <input
                  type="text"
                  placeholder="#1e293b"
                  className={styles.tableColorHexInput}
                  maxLength={7}
                  onChange={(e) => {
                    let hex = e.target.value.trim();
                    if (!hex.startsWith("#")) hex = "#" + hex;
                    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                      const bg = hexToRgba(hex, 0.9);
                      const headerBg = hexToRgba(darkenHex(hex, 0.75), 0.95);
                      onTableColorCustomChange({ bg, headerBg, headerText: "#e2e8f0" });
                    }
                  }}
                  onFocus={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
