"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import { NodeSelection } from "@tiptap/pm/state";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./TipTapEditor.module.css";

/* ─── Icons ─────────────────────────────────────────────────── */
function IcoLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="1.5" width="12" height="1.1" rx="0.55" fill="currentColor" />
      <rect x="1" y="4.6" width="7.5" height="1.1" rx="0.55" fill="currentColor" />
      <rect x="1" y="7.7" width="12" height="1.1" rx="0.55" fill="currentColor" />
      <rect x="1" y="10.8" width="5.5" height="1.1" rx="0.55" fill="currentColor" />
    </svg>
  );
}
function IcoCenter() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="1.5" width="12" height="1.1" rx="0.55" fill="currentColor" />
      <rect x="3" y="4.6" width="8" height="1.1" rx="0.55" fill="currentColor" />
      <rect x="1" y="7.7" width="12" height="1.1" rx="0.55" fill="currentColor" />
      <rect x="3.5" y="10.8" width="7" height="1.1" rx="0.55" fill="currentColor" />
    </svg>
  );
}
function IcoRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="1.5" width="12" height="1.1" rx="0.55" fill="currentColor" />
      <rect x="5.5" y="4.6" width="7.5" height="1.1" rx="0.55" fill="currentColor" />
      <rect x="1" y="7.7" width="12" height="1.1" rx="0.55" fill="currentColor" />
      <rect x="7.5" y="10.8" width="5.5" height="1.1" rx="0.55" fill="currentColor" />
    </svg>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function parseRadius(val) {
  if (!val) return 0;
  const n = parseFloat(val);
  if (!Number.isFinite(n)) return 0;
  return n >= 999 ? 999 : n;
}

function patchImageAt(editor, pos, attrs) {
  const { state, view } = editor;
  const node = state.doc.nodeAt(pos);
  if (!node || node.type.name !== "image") return;
  view.dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
}

function Pill({ active, onClick, children, title, dark }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`${styles.imgPill} ${active ? (dark ? styles.imgPillOnDark : styles.imgPillOnLight) : ""}`}
    >
      {children}
    </button>
  );
}

/* ─── Main ───────────────────────────────────────────────────── */

export default function ImageEditBubbleMenu({ editor, dark }) {
  /** Doc position of the image being edited — survives focus moving to the slider / buttons */
  const [stickyPos, setStickyPos] = useState(null);
  const panelRef = useRef(null);
  const [, bump] = useState(0);

  const resolveImagePos = () => {
    if (!editor) return null;
    const sel = editor.state.selection;
    if (sel instanceof NodeSelection && sel.node?.type?.name === "image") return sel.from;
    if (stickyPos != null && editor.state.doc.nodeAt(stickyPos)?.type?.name === "image") return stickyPos;
    return null;
  };

  const shouldShow = useCallback(
    ({ state }) => {
      if (!editor?.isEditable) return false;
      const sel = state.selection;
      if (sel instanceof NodeSelection && sel.node?.type?.name === "image") return true;
      if (stickyPos != null && state.doc.nodeAt(stickyPos)?.type?.name === "image") return true;
      return false;
    },
    [editor, stickyPos]
  );

  const getReferencedVirtualElement = useCallback(() => {
    if (!editor) return null;
    const sel = editor.state.selection;
    let pos = null;
    if (sel instanceof NodeSelection && sel.node?.type?.name === "image") pos = sel.from;
    else if (stickyPos != null && editor.state.doc.nodeAt(stickyPos)?.type?.name === "image") pos = stickyPos;
    if (pos == null) return null;
    const el = editor.view.nodeDOM(pos);
    if (!(el instanceof HTMLElement)) return null;
    return {
      getBoundingClientRect: () => el.getBoundingClientRect(),
      getClientRects: () => {
        const r = el.getBoundingClientRect();
        return r.width || r.height ? [r] : [];
      },
    };
  }, [editor, stickyPos]);

  useEffect(() => {
    if (!editor) return undefined;
    const syncSticky = () => {
      const sel = editor.state.selection;
      if (sel instanceof NodeSelection && sel.node?.type?.name === "image") {
        setStickyPos(sel.from);
      }
    };
    editor.on("selectionUpdate", syncSticky);
    editor.on("transaction", syncSticky);
    return () => {
      editor.off("selectionUpdate", syncSticky);
      editor.off("transaction", syncSticky);
    };
  }, [editor]);

  /** Dismiss when clicking elsewhere (not on panel, not on a story image) */
  useEffect(() => {
    const onPointerDownCapture = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (panelRef.current?.contains(t)) return;
      if (t.closest?.("[data-story-image]")) return;
      setStickyPos(null);
    };
    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, []);

  useEffect(() => {
    if (!editor || stickyPos == null) return undefined;
    const check = () => {
      if (!editor.state.doc.nodeAt(stickyPos)) setStickyPos(null);
    };
    editor.on("transaction", check);
    return () => editor.off("transaction", check);
  }, [editor, stickyPos]);

  if (!editor) return null;

  const pos = resolveImagePos();
  const a = pos != null ? editor.state.doc.nodeAt(pos)?.attrs ?? {} : {};

  const patch = (attrs) => {
    if (pos == null) return;
    patchImageAt(editor, pos, attrs);
    bump((n) => n + 1);
  };

  const isFull = parseRadius(a.borderRadius) >= 999;
  const radiusPx = isFull ? 48 : parseRadius(a.borderRadius);

  const setRadius = (val) => {
    patch({ borderRadius: val === 0 ? null : `${val}px` });
  };

  const widthMin = 120;
  const edW = editor?.view?.dom?.clientWidth ?? 800;
  const widthMax = Math.min(1400, Math.max(400, edW + 160));
  const hasExplicitWidth = a.width != null && Number.isFinite(Number(a.width));
  const widthSliderVal = hasExplicitWidth
    ? Math.max(widthMin, Math.min(widthMax, Math.round(Number(a.width))))
    : Math.min(widthMax, Math.max(widthMin, Math.round(edW * 0.92)));

  const setWidthPx = (val) => {
    const n = Math.max(widthMin, Math.min(widthMax, Math.round(Number(val))));
    patch({ width: n, height: null });
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="imageStyleBubble"
      updateDelay={0}
      appendTo={() => (typeof document !== "undefined" ? document.body : undefined)}
      shouldShow={shouldShow}
      getReferencedVirtualElement={getReferencedVirtualElement}
      tippyOptions={{
        duration: [120, 80],
        interactive: true,
        placement: "top",
        offset: [0, 12],
        zIndex: 10002,
        maxWidth: "none",
      }}
      className={styles.imageEditBubble}
    >
      <div
        ref={panelRef}
        data-image-edit-panel=""
        className={`${styles.imgPanel} ${dark ? styles.imgPanelDark : styles.imgPanelLight}`}
      >
        <div className={styles.imgHeader}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={styles.imgHeaderIcon}>
            <rect x="0.5" y="0.5" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1" />
            <circle cx="4" cy="4.2" r="1.15" fill="currentColor" />
            <path d="M0.5 8.5l3-3 2.5 2.5 2.5-2.5 3.5 3.5V12.5H0.5V8.5z" fill="currentColor" opacity="0.6" />
          </svg>
          <span className={styles.imgHeaderLabel}>Image</span>
        </div>

        <div className={styles.imgDivider} />

        <div className={styles.imgBody}>
          <div className={styles.imgRow}>
            <span className={styles.imgRowLabel}>Radius</span>
            <div className={styles.imgRadiusControl}>
              <div className={styles.imgSliderWrap}>
                <input
                  type="range"
                  min={0}
                  max={48}
                  step={1}
                  value={radiusPx}
                  className={styles.imgSlider}
                  onInput={(e) => setRadius(Number(e.target.value))}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  style={{ "--v": `${(radiusPx / 48) * 100}%` }}
                />
              </div>
              <span className={styles.imgRadiusVal}>
                {isFull ? "Full" : radiusPx === 0 ? "0" : `${radiusPx}`}
              </span>
              <button
                type="button"
                title="Fully rounded"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => patch({ borderRadius: isFull ? null : "9999px" })}
                className={`${styles.imgPill} ${styles.imgPillSquare} ${isFull ? (dark ? styles.imgPillOnDark : styles.imgPillOnLight) : ""}`}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect x="0.75" y="0.75" width="11.5" height="11.5" rx="5.75" stroke="currentColor" strokeWidth="1.2" fill="none" />
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.imgRow}>
            <span className={styles.imgRowLabel}>Width</span>
            <div className={styles.imgRadiusControl}>
              <div className={styles.imgSliderWrap}>
                <input
                  type="range"
                  min={widthMin}
                  max={widthMax}
                  step={4}
                  value={widthSliderVal}
                  className={styles.imgSlider}
                  onInput={(e) => setWidthPx(Number(e.target.value))}
                  onChange={(e) => setWidthPx(Number(e.target.value))}
                  style={{ "--v": `${((widthSliderVal - widthMin) / (widthMax - widthMin)) * 100}%` }}
                />
              </div>
              <span className={styles.imgRadiusVal}>{widthSliderVal}px</span>
            </div>
          </div>

          <div className={styles.imgRow}>
            <span className={styles.imgRowLabel}>Fit</span>
            <div className={styles.imgRowControl}>
              <div className={styles.imgPillGroup}>
                <Pill title="Cover — fill frame, edges may clip" active={a.objectFit === "cover"} onClick={() => patch({ objectFit: "cover" })} dark={dark}>
                  Cover
                </Pill>
                <Pill title="Contain — whole image visible" active={a.objectFit === "contain"} onClick={() => patch({ objectFit: "contain" })} dark={dark}>
                  Contain
                </Pill>
                <Pill title="Natural size" active={!a.objectFit} onClick={() => patch({ objectFit: null })} dark={dark}>
                  Auto
                </Pill>
              </div>
            </div>
          </div>

          <div className={styles.imgRow}>
            <span className={styles.imgRowLabel}>Align</span>
            <div className={styles.imgRowControl}>
              <div className={styles.imgPillGroup}>
                <Pill title="Left" active={a.align === "left"} onClick={() => patch({ align: "left" })} dark={dark}>
                  <IcoLeft />
                </Pill>
                <Pill title="Center" active={!a.align || a.align === "center"} onClick={() => patch({ align: "center" })} dark={dark}>
                  <IcoCenter />
                </Pill>
                <Pill title="Right" active={a.align === "right"} onClick={() => patch({ align: "right" })} dark={dark}>
                  <IcoRight />
                </Pill>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.imgDivider} />

        <div className={styles.imgFooter}>
          <button
            type="button"
            className={styles.imgGhost}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              patch({ borderRadius: null, objectFit: null, align: null });
            }}
          >
            Reset style
          </button>
          <button
            type="button"
            className={styles.imgGhost}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => patch({ width: null, height: null })}
          >
            Reset size
          </button>
        </div>
      </div>
    </BubbleMenu>
  );
}
