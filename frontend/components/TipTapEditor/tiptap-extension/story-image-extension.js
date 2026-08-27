import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";

/* ─── Apply node attrs to DOM elements ─────────────────────── */
function applyAttrsToDOM(container, img, attrs) {
  const { borderRadius, objectFit, align, width, height } = attrs;

  // Container alignment
  if (align === "left") {
    container.style.marginLeft = "0";
    container.style.marginRight = "auto";
  } else if (align === "right") {
    container.style.marginLeft = "auto";
    container.style.marginRight = "0";
  } else {
    container.style.marginLeft = "auto";
    container.style.marginRight = "auto";
  }

  const r = borderRadius ? String(borderRadius) : "";
  /* Never put overflow:hidden on the outer wrapper — it clips the resize handle. Rounding is applied on <img> only. */
  container.style.overflow = "visible";
  container.style.borderRadius = "";

  // Image styles (inline wins over .editorContent img { border-radius: 6px } via .storyTiptapImg unset)
  img.style.display = "block";
  img.style.maxWidth = "100%";
  img.style.borderRadius = r;
  img.style.objectFit = objectFit || "";

  if (width) {
    img.style.width = typeof width === "number" ? `${width}px` : width;
    container.style.width = img.style.width;
  } else {
    img.style.width = "";
    container.style.width = "";
  }

  if (height) {
    img.style.height = typeof height === "number" ? `${height}px` : height;
  } else {
    img.style.height = "";
  }
}

/* ─── Resize handle ─────────────────────────────────────────── */
function makeResizeHandle() {
  const handle = document.createElement("span");
  handle.setAttribute("data-resize-handle", "");
  handle.style.cssText = [
    "position:absolute",
    "bottom:-6px",
    "right:-6px",
    "width:22px",
    "height:22px",
    "border-radius:6px",
    "background:rgba(255,255,255,0.98)",
    "box-shadow:0 2px 8px rgba(0,0,0,0.35),0 0 0 1px rgba(0,0,0,0.1)",
    "cursor:se-resize",
    "opacity:0",
    "transition:opacity 0.15s",
    "z-index:10060",
    "pointer-events:auto",
    "touch-action:none",
  ].join(";");
  return handle;
}

function resolveImageDocPos(view, getPos, container) {
  const raw = container?.dataset?.pmDocPos;
  if (raw != null && raw !== "") {
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      const n = view.state.doc.nodeAt(parsed);
      if (n?.type?.name === "image") return parsed;
    }
  }
  if (typeof getPos === "function") {
    try {
      const p = getPos();
      if (typeof p === "number" && p >= 0) return p;
    } catch {
      /* ignore */
    }
  }
  try {
    const p = view.posAtDOM(container, 0);
    if (typeof p === "number" && p >= 0) {
      const node = view.state.doc.nodeAt(p);
      if (node?.type.name === "image") return p;
      const nodeBefore = p > 0 ? view.state.doc.nodeAt(p - 1) : null;
      if (nodeBefore?.type.name === "image") return p - 1;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/* ─── Node view factory ─────────────────────────────────────── */
function createImageNodeView({ node, getPos, editor }) {
  const { view } = editor;

  /* Outer block — handles alignment */
  const container = document.createElement("div");
  container.setAttribute("data-story-image", "");
  container.style.cssText = "display:block;position:relative;line-height:0;max-width:100%;pointer-events:auto;";
  container.contentEditable = "false";

  /* The actual img */
  const img = document.createElement("img");
  img.className = "storyTiptapImg";
  img.draggable = false;
  img.setAttribute("draggable", "false");
  img.setAttribute("src", node.attrs.src || "");
  if (node.attrs.alt) img.setAttribute("alt", node.attrs.alt);
  if (node.attrs.title) img.setAttribute("title", node.attrs.title);
  applyAttrsToDOM(container, img, node.attrs);

  img.addEventListener("dragstart", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  /* Resize handle */
  const handle = makeResizeHandle();

  container.appendChild(img);
  container.appendChild(handle);

  const syncPmDocPos = () => {
    try {
      if (typeof getPos === "function") {
        const p = getPos();
        if (typeof p === "number" && p >= 0) {
          container.dataset.pmDocPos = String(p);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const p = view.posAtDOM(container, 0);
      if (typeof p === "number" && p >= 0) {
        let n = view.state.doc.nodeAt(p);
        if (n?.type?.name === "image") {
          container.dataset.pmDocPos = String(p);
          return;
        }
        if (p > 0) {
          n = view.state.doc.nodeAt(p - 1);
          if (n?.type?.name === "image") {
            container.dataset.pmDocPos = String(p - 1);
          }
        }
      }
    } catch {
      /* ignore */
    }
  };
  queueMicrotask(syncPmDocPos);

  /* ── Drag-resize logic ──── */
  let startX = 0, startW = 0, startH = 0, aspectRatio = 1;

  function onMouseMove(e) {
    const dx = e.clientX - startX;
    const newW = Math.max(80, Math.round(startW + dx));
    const newH = Math.round(newW * aspectRatio);
    img.style.width = `${newW}px`;
    img.style.height = `${newH}px`;
    container.style.width = `${newW}px`;
  }

  function onPointerUp(e) {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const dx = e.clientX - startX;
    const newW = Math.max(80, Math.round(startW + dx));
    const newH = Math.round(newW * aspectRatio);

    syncPmDocPos();
    const pos = resolveImageDocPos(view, getPos, container);
    if (pos == null) return;
    const state = view.state;
    const currentNode = state.doc.nodeAt(pos);
    if (currentNode?.type.name === "image") {
      view.dispatch(state.tr.setNodeMarkup(pos, undefined, { ...currentNode.attrs, width: newW, height: newH }));
    }
  }

  function onPointerMove(e) {
    onMouseMove(e);
  }

  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = img.getBoundingClientRect();
    startX = e.clientX;
    startW = rect.width;
    startH = rect.height;
    aspectRatio = startH > 0 ? startH / startW : 1;

    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  });

  return {
    dom: container,

    update(updatedNode) {
      if (updatedNode.type.name !== "image") return false;
      img.setAttribute("src", updatedNode.attrs.src || "");
      if (updatedNode.attrs.alt) img.setAttribute("alt", updatedNode.attrs.alt);
      else img.removeAttribute("alt");
      if (updatedNode.attrs.title) img.setAttribute("title", updatedNode.attrs.title);
      else img.removeAttribute("title");
      applyAttrsToDOM(container, img, updatedNode.attrs);
      syncPmDocPos();
      return true;
    },

    selectNode() {
      handle.style.opacity = "1";
      container.style.outline = "2px solid rgba(99,102,241,0.6)";
      container.style.outlineOffset = "2px";
    },

    deselectNode() {
      handle.style.opacity = "0";
      container.style.outline = "";
      container.style.outlineOffset = "";
    },

    ignoreMutation() {
      return true;
    },

    destroy() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    },
  };
}

/* ─── Extension ─────────────────────────────────────────────── */
export const StoryImage = Image.extend({
  name: "image",

  addAttributes() {
    return {
      ...this.parent?.(),
      borderRadius: {
        default: null,
        parseHTML: (el) => {
          if (!(el instanceof HTMLElement)) return null;
          return el.getAttribute("data-radius") || el.style.borderRadius || null;
        },
        renderHTML: (attrs) => (attrs.borderRadius ? { "data-radius": String(attrs.borderRadius) } : {}),
      },
      objectFit: {
        default: null,
        parseHTML: (el) => {
          if (!(el instanceof HTMLElement)) return null;
          return el.getAttribute("data-object-fit") || el.style.objectFit || null;
        },
        renderHTML: (attrs) => (attrs.objectFit ? { "data-object-fit": attrs.objectFit } : {}),
      },
      align: {
        default: null,
        parseHTML: (el) => {
          if (!(el instanceof HTMLElement)) return null;
          return el.getAttribute("data-align") || null;
        },
        renderHTML: (attrs) => (attrs.align ? { "data-align": attrs.align } : {}),
      },
    };
  },

  parseHTML() {
    const allowBase64 = this.options.allowBase64;
    return [
      {
        tag: allowBase64 ? "img[src]" : 'img[src]:not([src^="data:"])',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const w = element.getAttribute("width");
          const h = element.getAttribute("height");
          const nw = w != null && w !== "" ? parseFloat(w) : null;
          const nh = h != null && h !== "" ? parseFloat(h) : null;
          return {
            src: element.getAttribute("src"),
            alt: element.getAttribute("alt"),
            title: element.getAttribute("title"),
            width: Number.isFinite(nw) ? nw : null,
            height: Number.isFinite(nh) ? nh : null,
            borderRadius: element.getAttribute("data-radius") || element.style.borderRadius || null,
            objectFit: element.getAttribute("data-object-fit") || element.style.objectFit || null,
            align: element.getAttribute("data-align") || null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const a = node.attrs;
    const styles = ["display:block", "max-width:100%"];
    if (a.borderRadius) styles.push(`border-radius:${a.borderRadius}`);
    if (a.objectFit) styles.push(`object-fit:${a.objectFit}`);
    if (a.align === "left") styles.push("margin-left:0", "margin-right:auto");
    else if (a.align === "right") styles.push("margin-left:auto", "margin-right:0");
    else styles.push("margin-left:auto", "margin-right:auto");

    const data = {};
    if (a.borderRadius) data["data-radius"] = String(a.borderRadius);
    if (a.objectFit) data["data-object-fit"] = a.objectFit;
    if (a.align) data["data-align"] = a.align;

    const base = { src: a.src, alt: a.alt ?? undefined, title: a.title ?? undefined, style: styles.join(";") };
    if (a.width != null) base.width = a.width;
    if (a.height != null) base.height = a.height;

    return ["img", mergeAttributes(this.options.HTMLAttributes, base, data)];
  },

  addNodeView() {
    return (props) => createImageNodeView(props);
  },
});
