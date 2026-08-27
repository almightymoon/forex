"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { TextSelection } from "@tiptap/pm/state";
import { CellSelection, cellAround } from "@tiptap/pm/tables";
import styles from "./TipTapEditor.module.css";

function resolveTableContainer(target) {
  if (!target?.closest) return null;
  const wrapper = target.closest(".tableWrapper");
  if (wrapper) return wrapper;
  return target.closest("table");
}

function getTableEl(wrapper) {
  return wrapper?.matches?.("table")
    ? wrapper
    : wrapper?.querySelector?.("table") || wrapper;
}

function selectCellAt(editor, tableWrapper, rowIndex, colIndex) {
  try {
    const tableEl = getTableEl(tableWrapper);
    if (!tableEl) return false;
    const rows = tableEl.querySelectorAll("tr");
    const row = rows[rowIndex];
    if (!row) return false;
    const cells = row.querySelectorAll("td, th");
    const cell = cells[colIndex];
    if (!cell) return false;
    const pos = editor.view.posAtDOM(cell, 0);
    const anchor = pos + 1;
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, anchor)));
    editor.commands.focus();
    return true;
  } catch (_) {
    return false;
  }
}

function getTableStartPos(editor, tableWrapper) {
  try {
    const tableEl = getTableEl(tableWrapper);
    if (!tableEl) return null;
    const pos = editor.view.posAtDOM(tableEl, 0);
    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      if ($pos.node(d).type.name === "table") {
        return $pos.before(d);
      }
    }
    return null;
  } catch (_) {
    return null;
  }
}

function selectLastCellInTable(editor, tableWrapper) {
  try {
    const tableEl = getTableEl(tableWrapper);
    if (!tableEl) return;
    const rows = tableEl.querySelectorAll("tr");
    const lastRow = rows[rows.length - 1];
    if (!lastRow) return;
    const cells = lastRow.querySelectorAll("td, th");
    const lastCell = cells[cells.length - 1];
    if (!lastCell) return;
    selectCellAt(editor, tableWrapper, rows.length - 1, cells.length - 1);
  } catch (_) {}
}

function getTableContext(editor, tableWrapper) {
  const tableStartPos = getTableStartPos(editor, tableWrapper);
  if (tableStartPos == null) return null;
  const tableNode = editor.state.doc.nodeAt(tableStartPos);
  if (!tableNode || tableNode.type.name !== "table") return null;
  return { tableStartPos, tableNode };
}

function replaceTableNode(editor, tableStartPos, oldTableNode, newTableNode, preserveCellSelection = false) {
  const { state, view } = editor;
  const tr = state.tr.replaceWith(tableStartPos, tableStartPos + oldTableNode.nodeSize, newTableNode);
  if (preserveCellSelection && state.selection instanceof CellSelection) {
    const sel = state.selection;
    const anchorPos = sel.$anchorCell.pos;
    const headPos = sel.$headCell.pos;
    const map = tr.mapping;
    const newAnchor = map.map(anchorPos);
    const newHead = map.map(headPos);
    try {
      const newSel = CellSelection.create(tr.doc, newAnchor, newHead);
      tr.setSelection(newSel);
    } catch (_) {
      tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(tableStartPos + 2, tr.doc.content.size))));
    }
  } else {
    tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(tableStartPos + 2, tr.doc.content.size))));
  }
  view.dispatch(tr);
  editor.commands.focus();
}

const LEAVE_DELAY = 2800; /* Stay visible longer so you can reach the controls */
const EDGE_THRESHOLD = 56; /* Notion-like: generous hover zone for + row/col controls */
const EDGE_BELOW = 24; /* px below table edge - bridge to + controls so they don't disappear */
const HANDLE_ZONE = 28; /* Notion-like: six-dot handle zone on left (rows) and top (cols) */
const ROW_RESIZE_ZONE = 3; // px at bottom of row to show resize handle (narrow = less blocking)
const CONTROL_OFFSET = 2; /* px - keep controls close to table so easier to reach */
const CELL_MIN_WIDTH = 60;
const COL_RESIZE_HANDLE_SIZE = 10; // purple dot size

/** Get rightmost selected cell and its column index for resize handle */
function getSelectedCellResizeInfo(editor) {
  const { selection } = editor.state;
  if (!(selection instanceof CellSelection)) return null;
  try {
    const $anchor = selection.$anchorCell;
    const table = $anchor.node(-1);
    if (!table || table.type.name !== "table") return null;
    const rows = table.content.content;
    let best = null; // { rowIdx, cellIdx, colEnd }
    for (let i = 0; i < selection.ranges.length; i++) {
      const { $from } = selection.ranges[i];
      const rowIdx = $from.index(-2);
      const cellIdx = $from.index(-1);
      const row = rows[rowIdx];
      if (!row) continue;
      const cell = row.content.content[cellIdx];
      if (!cell) continue;
      const colspan = cell.attrs.colspan || 1;
      let colStart = 0;
      for (let c = 0; c < cellIdx; c++) {
        colStart += (row.content.content[c].attrs.colspan || 1);
      }
      const colEnd = colStart + colspan - 1;
      if (!best || colEnd > best.colEnd) {
        best = { rowIdx, cellIdx, colEnd };
      }
    }
    if (!best) return null;
    const pos = selection.$anchorCell.pos;
    const { node } = editor.view.domAtPos(pos);
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    const cellEl = el?.closest?.("td, th");
    const wrapper = cellEl?.closest?.(".tableWrapper");
    if (!wrapper || !cellEl) return null;
    const rect = cellEl.getBoundingClientRect();
    return { wrapper, colIndex: best.colEnd, cellRect: rect };
  } catch (_) {
    return null;
  }
}

export default function NotionTableControls({ editor }) {
  const [hoveredTable, setHoveredTable] = useState(null);
  const [rect, setRect] = useState(null);
  const [activeEdge, setActiveEdge] = useState(null); // "row" | "col" | "corner" | null
  const [hoveredRowHandle, setHoveredRowHandle] = useState(null); // row index
  const [hoveredColHandle, setHoveredColHandle] = useState(null); // col index
  const [hoveredRowResize, setHoveredRowResize] = useState(null); // row index for resize
  const [openMenu, setOpenMenu] = useState(null); // "row" | "col" | null
  const [openRowIndex, setOpenRowIndex] = useState(null);
  const [openColIndex, setOpenColIndex] = useState(null);
  const [dragRow, setDragRow] = useState(null); // row index when dragging row
  const [dragCol, setDragCol] = useState(null); // col index when dragging col
  const [dropIndicator, setDropIndicator] = useState(null); // { type: "row"|"col", index: number } | null
  const [selectedCellResize, setSelectedCellResize] = useState(null); // { wrapper, colIndex, cellRect } when cell selected
  const [cellSelectionRect, setCellSelectionRect] = useState(null); // { left, top, width, height } for unified outline
  const resizeStateRef = useRef(null); // { rowIndex, startY, startHeight } | { colIndex, startX, startWidth }
  const dragStateRef = useRef({ from: null, to: null });
  const dragJustExecutedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const leaveTimeoutRef = useRef(null);
  const rafRef = useRef(null);
  const hoveredTableRef = useRef(null);
  const openMenuRef = useRef(null);
  hoveredTableRef.current = hoveredTable;
  openMenuRef.current = openMenu;

  const updateRect = useCallback((wrapper) => {
    if (!wrapper || typeof window === "undefined") return;
    const r = wrapper.getBoundingClientRect();
    setRect({
      viewTop: r.top,
      viewLeft: r.left,
      viewRight: r.right,
      viewBottom: r.bottom,
      width: r.width,
      height: r.height,
    });
  }, []);

  const cancelLeave = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!editor?.view?.dom) return;
    const editorDom = editor.view.dom;

    const handleMouseMove = (e) => {
      cancelLeave();
      const wrapper = resolveTableContainer(e.target);
      const inControls = e.target?.closest?.("[data-notion-table-controls]");

      if (!wrapper || !editorDom.contains(wrapper)) {
        if (!inControls) {
          setActiveEdge(null);
          setHoveredRowResize(null);
          if (!openMenuRef.current) {
            setHoveredRowHandle(null);
            setHoveredColHandle(null);
          }
        }
        return;
      }

      const r = wrapper.getBoundingClientRect();
      setHoveredTable(wrapper);
      updateRect(wrapper);

      const nearRight = e.clientX >= r.right - EDGE_THRESHOLD && e.clientX <= r.right + EDGE_BELOW;
      const nearBottom = e.clientY >= r.bottom - EDGE_THRESHOLD && e.clientY <= r.bottom + EDGE_BELOW;
      const inLeftZone = e.clientX >= r.left && e.clientX <= r.left + HANDLE_ZONE;
      const inTopZone = e.clientY >= r.top && e.clientY <= r.top + HANDLE_ZONE;

      if (nearRight && nearBottom) {
        setActiveEdge("corner");
        setHoveredRowHandle(null);
        setHoveredColHandle(null);
        setHoveredRowResize(null);
      } else if (nearRight) {
        setActiveEdge("col");
        setHoveredRowHandle(null);
        setHoveredColHandle(null);
        setHoveredRowResize(null);
      } else if (nearBottom) {
        setActiveEdge("row");
        setHoveredRowHandle(null);
        setHoveredColHandle(null);
        setHoveredRowResize(null);
      } else if (inLeftZone || inTopZone) {
        setHoveredRowResize(null);
        setActiveEdge(null);
        const tableEl = getTableEl(wrapper);
        if (!tableEl) {
          setHoveredRowHandle(null);
          setHoveredColHandle(null);
          return;
        }
        const rows = tableEl.querySelectorAll("tr");
        const firstRow = rows[0];
        const cells = firstRow?.querySelectorAll("td, th") || [];
        if (inLeftZone) {
          let rowIdx = -1;
          for (let i = 0; i < rows.length; i++) {
            const tr = rows[i].getBoundingClientRect();
            if (e.clientY >= tr.top && e.clientY <= tr.bottom) {
              rowIdx = i;
              break;
            }
          }
          setHoveredRowHandle(rowIdx >= 0 ? rowIdx : null);
          setHoveredColHandle(null);
        } else {
          let colIdx = -1;
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i].getBoundingClientRect();
            if (e.clientX >= cell.left && e.clientX <= cell.right) {
              colIdx = i;
              break;
            }
          }
          setHoveredColHandle(colIdx >= 0 ? colIdx : null);
          setHoveredRowHandle(null);
        }
      } else {
        setActiveEdge(null);
        setHoveredRowHandle(null);
        setHoveredColHandle(null);
        const tableEl = getTableEl(wrapper);
        const rowEls = tableEl?.querySelectorAll("tr") || [];
        let resizeIdx = null;
        if (rowEls.length >= 2) {
          for (let i = 0; i < rowEls.length - 1; i++) {
            const tr = rowEls[i].getBoundingClientRect();
            if (e.clientY >= tr.bottom - ROW_RESIZE_ZONE && e.clientY <= tr.bottom + 2) {
              resizeIdx = i;
              break;
            }
          }
        }
        setHoveredRowResize(resizeIdx);
      }
    };

    const handleMouseOut = (e) => {
      const wrapper = resolveTableContainer(e.target);
      const related = e.relatedTarget;
      const toControl = related?.closest?.("[data-notion-table-controls]");
      if (wrapper && related && !wrapper.contains(related) && !toControl) {
        leaveTimeoutRef.current = setTimeout(() => {
          setHoveredTable(null);
          setRect(null);
          setActiveEdge(null);
          setHoveredRowHandle(null);
          setHoveredColHandle(null);
          setHoveredRowResize(null);
          setOpenMenu(null);
          setOpenRowIndex(null);
          setOpenColIndex(null);
        }, LEAVE_DELAY);
      }
    };

    const handleScrollOrResize = () => {
      const wrapper = hoveredTableRef.current;
      if (wrapper && document.contains(wrapper)) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          if (hoveredTableRef.current && document.contains(hoveredTableRef.current)) {
            updateRect(hoveredTableRef.current);
          }
          rafRef.current = null;
        });
      }
    };

    editorDom.addEventListener("mousemove", handleMouseMove, true);
    editorDom.addEventListener("mouseout", handleMouseOut, true);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      editorDom.removeEventListener("mousemove", handleMouseMove, true);
      editorDom.removeEventListener("mouseout", handleMouseOut, true);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [editor, updateRect, cancelLeave]);

  useEffect(() => {
    if (hoveredTable) {
      const obs = new MutationObserver(() => updateRect(hoveredTable));
      obs.observe(hoveredTable, { subtree: true, childList: true, attributes: true });
      return () => obs.disconnect();
    }
  }, [hoveredTable, updateRect]);

  const controlsRef = useRef(null);

  const startRowResize = (rowIndex, clientY) => {
    const wrapper = hoveredTableRef.current;
    const tableEl = getTableEl(wrapper);
    const rows = tableEl?.querySelectorAll("tr") || [];
    const tr = rows[rowIndex];
    if (!tr) return;
    const rect = tr.getBoundingClientRect();
    const dataHeight = tr.getAttribute?.("data-row-height");
    const startHeight = dataHeight ? parseInt(dataHeight, 10) : Math.round(rect.height);
    resizeStateRef.current = { rowIndex, startY: clientY, startHeight };
  };

  const handleRowResizeMouseDown = useCallback((rowIndex, e) => {
    e.preventDefault();
    startRowResize(rowIndex, e.clientY);
    document.body.classList.add("notion-table-resizing");
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    const onMouseMove = (ev) => {
      const s = resizeStateRef.current;
      if (!s || !editor?.commands?.setRowHeight || !hoveredTableRef.current) return;
      const tableStartPos = getTableStartPos(editor, hoveredTableRef.current);
      if (tableStartPos == null) return;
      const delta = ev.clientY - s.startY;
      const newHeight = Math.max(24, s.startHeight + delta);
      editor.commands.setRowHeight(tableStartPos, s.rowIndex, newHeight);
    };
    const onMouseUp = () => {
      resizeStateRef.current = null;
      document.body.classList.remove("notion-table-resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [editor]);

  useEffect(() => {
    if (!openMenu) return;
    const close = (e) => {
      if (controlsRef.current?.contains(e.target)) return;
      setOpenMenu(null);
      setOpenRowIndex(null);
      setOpenColIndex(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openMenu]);

  useEffect(() => {
    if (!editor) return;
    const update = () => setSelectedCellResize(getSelectedCellResizeInfo(editor));
    update();
    editor.on("selectionUpdate", update);
    return () => editor.off("selectionUpdate", update);
  }, [editor]);

  /* Unified cell selection outline (Notion-style: one blue box around selection) */
  useEffect(() => {
    document.body.dataset.cellSelectionActive = cellSelectionRect ? "true" : "";
    return () => { document.body.dataset.cellSelectionActive = ""; };
  }, [cellSelectionRect]);

  useEffect(() => {
    if (!editor?.view) return;
    const updateSelectionRect = () => {
      const { selection } = editor.state;
      if (!(selection instanceof CellSelection) || !selection.ranges?.length) {
        setCellSelectionRect(null);
        return;
      }
      let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
      const { view } = editor;
      for (let i = 0; i < selection.ranges.length; i++) {
        const { $from } = selection.ranges[i];
        const { node } = view.domAtPos($from.pos);
        const cellEl = (node.nodeType === 1 ? node : node.parentElement)?.closest?.("td, th");
        if (cellEl?.getBoundingClientRect) {
          const r = cellEl.getBoundingClientRect();
          minLeft = Math.min(minLeft, r.left);
          minTop = Math.min(minTop, r.top);
          maxRight = Math.max(maxRight, r.right);
          maxBottom = Math.max(maxBottom, r.bottom);
        }
      }
      if (minLeft !== Infinity) {
        setCellSelectionRect({
          left: minLeft,
          top: minTop,
          width: maxRight - minLeft,
          height: maxBottom - minTop,
        });
      } else {
        setCellSelectionRect(null);
      }
    };
    updateSelectionRect();
    editor.on("selectionUpdate", updateSelectionRect);
    const onScroll = () => requestAnimationFrame(updateSelectionRect);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      editor.off("selectionUpdate", updateSelectionRect);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [editor]);

  const hasEdge = activeEdge != null;
  const hasHandle = hoveredRowHandle !== null || hoveredColHandle !== null || hoveredRowResize !== null || openMenu != null;
  const isDragging = dragRow != null || dragCol != null;
  const showMainControls = editor && hoveredTable && rect && (hasEdge || hasHandle || isDragging);

  const addRow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    mutateTable((tableNode, schema) => {
      const rows = [...tableNode.content.content];
      const lastRow = rows[rows.length - 1];
      if (!lastRow) return null;
      const newRow = lastRow.type.create(lastRow.attrs, lastRow.content.content.map((cell) => cell.type.createAndFill(cell.attrs) || cell.type.create(cell.attrs)));
      return tableNode.type.create(tableNode.attrs, [...rows, newRow]);
    });
  };

  const addCol = (e) => {
    e.preventDefault();
    e.stopPropagation();
    mutateTable((tableNode, schema) => {
      const rows = tableNode.content.content.map((row) => {
        const cells = [...row.content.content];
        const lastCell = cells[cells.length - 1];
        if (!lastCell) return row;
        const newCell = lastCell.type.createAndFill(lastCell.attrs) || lastCell.type.create(lastCell.attrs);
        return row.type.create(row.attrs, [...cells, newCell]);
      });
      return tableNode.type.create(tableNode.attrs, rows);
    });
  };

  /* Notion-style: drag row/col handle to add or remove; click to add one */
  const startRowHandleDrag = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const ROW_THRESHOLD = 24;
    const DRAG_THRESHOLD = 4;
    let lastDelta = 0;
    let didDrag = false;
    const onMove = (ev) => {
      const dy = ev.clientY - startY;
      if (Math.abs(dy) > DRAG_THRESHOLD) didDrag = true;
      if (!didDrag) return;
      const target = Math.floor(dy / ROW_THRESHOLD);
      const prev = Math.floor(lastDelta / ROW_THRESHOLD);
      lastDelta = dy;
      const delta = target - prev;
      if (delta > 0) for (let i = 0; i < delta; i++) addRow({ preventDefault: () => {}, stopPropagation: () => {} });
      else if (delta < 0) {
        for (let i = 0; i < -delta; i++) {
          mutateTable((tableNode) => {
            const rows = [...tableNode.content.content];
            if (rows.length <= 1) return null;
            rows.pop();
            return tableNode.type.create(tableNode.attrs, rows);
          });
        }
      }
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (!didDrag) addRow({ preventDefault: () => {}, stopPropagation: () => {} });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const startColHandleDrag = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const COL_THRESHOLD = 50;
    const DRAG_THRESHOLD = 4;
    let lastDelta = 0;
    let didDrag = false;
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > DRAG_THRESHOLD) didDrag = true;
      if (!didDrag) return;
      const target = Math.floor(dx / COL_THRESHOLD);
      const prev = Math.floor(lastDelta / COL_THRESHOLD);
      lastDelta = dx;
      const delta = target - prev;
      if (delta > 0) for (let i = 0; i < delta; i++) addCol({ preventDefault: () => {}, stopPropagation: () => {} });
      else if (delta < 0) {
        for (let i = 0; i < -delta; i++) {
          mutateTable((tableNode) => {
            const rows = tableNode.content.content.map((row) => {
              const cells = [...row.content.content];
              if (cells.length <= 1) return row;
              cells.pop();
              return row.type.create(row.attrs, cells);
            });
            return tableNode.type.create(tableNode.attrs, rows);
          });
        }
      }
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (!didDrag) addCol({ preventDefault: () => {}, stopPropagation: () => {} });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const deleteRow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    mutateTable((tableNode) => {
      const rows = [...tableNode.content.content];
      if (rows.length <= 1) return null;
      rows.pop();
      return tableNode.type.create(tableNode.attrs, rows);
    });
  };

  const deleteCol = (e) => {
    e.preventDefault();
    e.stopPropagation();
    mutateTable((tableNode) => {
      const rows = tableNode.content.content.map((row) => {
        const cells = [...row.content.content];
        if (cells.length <= 1) return row;
        cells.pop();
        return row.type.create(row.attrs, cells);
      });
      return tableNode.type.create(tableNode.attrs, rows);
    });
  };

  const addBoth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    mutateTable((tableNode) => {
      const rows = tableNode.content.content.map((row) => {
        const cells = [...row.content.content];
        const lastCell = cells[cells.length - 1];
        if (!lastCell) return row;
        const newCell = lastCell.type.createAndFill(lastCell.attrs) || lastCell.type.create(lastCell.attrs);
        return row.type.create(row.attrs, [...cells, newCell]);
      });
      const lastRow = rows[rows.length - 1];
      if (!lastRow) return null;
      const newRowCells = lastRow.content.content.map((cell) => cell.type.createAndFill(cell.attrs) || cell.type.create(cell.attrs));
      const newRow = lastRow.type.create(lastRow.attrs, newRowCells);
      return tableNode.type.create(tableNode.attrs, [...rows, newRow]);
    });
  };

  const closeMenus = () => {
    setOpenMenu(null);
    setOpenRowIndex(null);
    setOpenColIndex(null);
  };

  const mutateTable = (mutator) => {
    const ctx = getTableContext(editor, hoveredTable);
    if (!ctx) return false;
    const nextTable = mutator(ctx.tableNode, editor.state.schema);
    if (!nextTable) return false;
    replaceTableNode(editor, ctx.tableStartPos, ctx.tableNode, nextTable);
    updateRect(hoveredTable);
    return true;
  };

  const mutateTableWithWrapper = (wrapper, mutator, preserveCellSelection = false) => {
    const ctx = getTableContext(editor, wrapper);
    if (!ctx) return false;
    const nextTable = mutator(ctx.tableNode, editor.state.schema);
    if (!nextTable) return false;
    replaceTableNode(editor, ctx.tableStartPos, ctx.tableNode, nextTable, preserveCellSelection);
    if (wrapper === hoveredTable) updateRect(hoveredTable);
    return true;
  };

  const setColumnWidth = useCallback((wrapper, colIndex, widthPx) => {
    mutateTableWithWrapper(wrapper, (tableNode) => {
      const rows = tableNode.content.content;
      const firstRow = rows[0];
      if (!firstRow) return null;
      let col = 0;
      const cells = firstRow.content.content.map((cell) => {
        const span = cell.attrs.colspan || 1;
        const colEnd = col + span - 1;
        if (colIndex >= col && colIndex <= colEnd) {
          const idxInCell = colIndex - col;
          const oldWidths = cell.attrs.colwidth;
          const newWidths = Array.isArray(oldWidths)
            ? [...oldWidths]
            : new Array(span).fill(null);
          newWidths[idxInCell] = Math.max(CELL_MIN_WIDTH, widthPx);
          col += span;
          return cell.type.create({ ...cell.attrs, colwidth: newWidths }, cell.content);
        }
        col += span;
        return cell;
      });
      return tableNode.type.create(tableNode.attrs, [firstRow.type.create(firstRow.attrs, cells), ...rows.slice(1)]);
    }, true); // preserve cell selection during column resize
  }, [editor]);

  const handleColumnResizeMouseDown = useCallback((wrapper, colIndex, e) => {
    e.preventDefault();
    const tableEl = getTableEl(wrapper);
    const colgroup = tableEl?.querySelector("colgroup");
    const cols = colgroup?.querySelectorAll("col") || [];
    const colEl = cols[colIndex];
    let startWidth = CELL_MIN_WIDTH;
    if (colEl) {
      const style = colEl.getAttribute("style") || "";
      const match = style.match(/(?:width|min-width):\s*(\d+)px/);
      if (match) startWidth = parseInt(match[1], 10) || startWidth;
    }
    if (startWidth < CELL_MIN_WIDTH && tableEl) {
      const firstRow = tableEl.querySelector("tr");
      const cell = firstRow?.querySelectorAll("td, th")[colIndex];
      if (cell) startWidth = Math.max(CELL_MIN_WIDTH, Math.round(cell.getBoundingClientRect().width));
    }
    resizeStateRef.current = { colIndex, startX: e.clientX, startWidth };
    document.body.classList.add("notion-table-col-resizing");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMouseMove = (ev) => {
      const s = resizeStateRef.current;
      if (!s || !wrapper || !document.contains(wrapper)) return;
      const delta = ev.clientX - s.startX;
      const newWidth = Math.max(CELL_MIN_WIDTH, s.startWidth + delta);
      setColumnWidth(wrapper, s.colIndex, newWidth);
    };
    const onMouseUp = () => {
      resizeStateRef.current = null;
      document.body.classList.remove("notion-table-col-resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [editor, setColumnWidth]);

  const runRowAction = (action, rowIdx) => {
    if (rowIdx == null || rowIdx < 0) return;
    if (action === "delete") {
      mutateTable((tableNode) => {
        const rows = [...tableNode.content.content];
        if (rowIdx >= rows.length || rows.length <= 1) return null;
        rows.splice(rowIdx, 1);
        return tableNode.type.create(tableNode.attrs, rows);
      });
      closeMenus();
      return;
    }
    if (action === "above" || action === "below" || action === "header") {
      if (!selectCellAt(editor, hoveredTable, rowIdx, 0)) return;
      if (action === "above") editor.chain().focus().addRowBefore().run();
      else if (action === "below") editor.chain().focus().addRowAfter().run();
      else if (action === "header") editor.chain().focus().toggleHeaderRow().run();
      closeMenus();
      return;
    }

    if (action === "duplicate") {
      mutateTable((tableNode) => {
        const rows = [...tableNode.content.content];
        const src = rows[rowIdx];
        if (!src) return null;
        const copy = src.copy(src.content);
        rows.splice(rowIdx + 1, 0, copy);
        return tableNode.type.create(tableNode.attrs, rows);
      });
      closeMenus();
      return;
    }

    if (action === "up" || action === "down") {
      mutateTable((tableNode) => {
        const rows = [...tableNode.content.content];
        const to = action === "up" ? rowIdx - 1 : rowIdx + 1;
        if (to < 0 || to >= rows.length) return null;
        const tmp = rows[rowIdx];
        rows[rowIdx] = rows[to];
        rows[to] = tmp;
        return tableNode.type.create(tableNode.attrs, rows);
      });
      closeMenus();
      return;
    }

    if (action === "clear") {
      mutateTable((tableNode) => {
        const rows = [...tableNode.content.content];
        const row = rows[rowIdx];
        if (!row) return null;
        const nextCells = row.content.content.map((cell) => {
          const attrs = { ...cell.attrs, colwidth: null };
          return cell.type.createAndFill(attrs) || cell.type.create(attrs);
        });
        rows[rowIdx] = row.type.create(row.attrs, nextCells);
        return tableNode.type.create(tableNode.attrs, rows);
      });
      closeMenus();
      return;
    }
  };

  const runColAction = (action, colIdx) => {
    if (colIdx == null || colIdx < 0) return;
    if (action === "delete") {
      mutateTable((tableNode) => {
        const rows = tableNode.content.content.map((row) => {
          const cells = [...row.content.content];
          if (colIdx >= cells.length || cells.length <= 1) return row;
          cells.splice(colIdx, 1);
          return row.type.create(row.attrs, cells);
        });
        return tableNode.type.create(tableNode.attrs, rows);
      });
      closeMenus();
      return;
    }
    if (action === "left" || action === "right" || action === "header") {
      if (!selectCellAt(editor, hoveredTable, 0, colIdx)) return;
      if (action === "left") editor.chain().focus().addColumnBefore().run();
      else if (action === "right") editor.chain().focus().addColumnAfter().run();
      else if (action === "header") editor.chain().focus().toggleHeaderColumn().run();
      closeMenus();
      return;
    }

    if (action === "duplicate") {
      mutateTable((tableNode) => {
        const rows = tableNode.content.content.map((row) => {
          const cells = [...row.content.content];
          const src = cells[colIdx];
          if (!src) return row;
          const copy = src.copy(src.content);
          cells.splice(colIdx + 1, 0, copy);
          return row.type.create(row.attrs, cells);
        });
        return tableNode.type.create(tableNode.attrs, rows);
      });
      closeMenus();
      return;
    }

    if (action === "leftMove" || action === "rightMove") {
      mutateTable((tableNode) => {
        const to = action === "leftMove" ? colIdx - 1 : colIdx + 1;
        const rows = tableNode.content.content.map((row) => {
          const cells = [...row.content.content];
          if (to < 0 || to >= cells.length || !cells[colIdx] || !cells[to]) return row;
          const tmp = cells[colIdx];
          cells[colIdx] = cells[to];
          cells[to] = tmp;
          return row.type.create(row.attrs, cells);
        });
        return tableNode.type.create(tableNode.attrs, rows);
      });
      closeMenus();
      return;
    }

    if (action === "clear") {
      mutateTable((tableNode) => {
        const rows = tableNode.content.content.map((row) => {
          const cells = [...row.content.content];
          const cell = cells[colIdx];
          if (!cell) return row;
          const attrs = { ...cell.attrs, colwidth: null };
          cells[colIdx] = cell.type.createAndFill(attrs) || cell.type.create(attrs);
          return row.type.create(row.attrs, cells);
        });
        return tableNode.type.create(tableNode.attrs, rows);
      });
      closeMenus();
      return;
    }

    if (action === "sortAsc" || action === "sortDesc") {
      mutateTable((tableNode) => {
        const rows = [...tableNode.content.content];
        if (rows.length < 2) return null;
        const hasHeader = rows[0]?.content?.content?.every?.((c) => c.type.name === "tableHeader");
        const header = hasHeader ? rows[0] : null;
        const body = hasHeader ? rows.slice(1) : rows.slice();
        body.sort((a, b) => {
          const av = (a.content.content[colIdx]?.textContent || "").toLowerCase();
          const bv = (b.content.content[colIdx]?.textContent || "").toLowerCase();
          if (av === bv) return 0;
          return action === "sortAsc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
        return tableNode.type.create(tableNode.attrs, header ? [header, ...body] : body);
      });
      closeMenus();
      return;
    }
  };

  const startCornerDrag = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let rowsAdded = 0;
    let colsAdded = 0;
    const ROW_THRESHOLD = 28;
    const COL_THRESHOLD = 60;
    const onMove = (ev) => {
      const dy = ev.clientY - startY;
      const dx = ev.clientX - startX;
      const targetRows = Math.max(0, Math.floor(dy / ROW_THRESHOLD));
      const targetCols = Math.max(0, Math.floor(dx / COL_THRESHOLD));
      while (rowsAdded < targetRows) {
        mutateTable((tableNode) => {
          const rows = [...tableNode.content.content];
          const lastRow = rows[rows.length - 1];
          if (!lastRow) return null;
          const newRow = lastRow.type.create(lastRow.attrs, lastRow.content.content.map((cell) => cell.type.createAndFill(cell.attrs) || cell.type.create(cell.attrs)));
          return tableNode.type.create(tableNode.attrs, [...rows, newRow]);
        });
        rowsAdded++;
      }
      while (colsAdded < targetCols) {
        mutateTable((tableNode) => {
          const rows = tableNode.content.content.map((row) => {
            const cells = [...row.content.content];
            const lastCell = cells[cells.length - 1];
            if (!lastCell) return row;
            const newCell = lastCell.type.createAndFill(lastCell.attrs) || lastCell.type.create(lastCell.attrs);
            return row.type.create(row.attrs, [...cells, newCell]);
          });
          return tableNode.type.create(tableNode.attrs, rows);
        });
        colsAdded++;
      }
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const scheduleLeave = () => {
    const delay = openMenuRef.current ? 2000 : LEAVE_DELAY; /* extra time when menu open */
    leaveTimeoutRef.current = setTimeout(() => {
      if (isDraggingRef.current) return; // don't clear while dragging
      setHoveredTable(null);
      setRect(null);
      setActiveEdge(null);
      setHoveredRowResize(null);
      setDragRow(null);
      setDragCol(null);
      setDropIndicator(null);
      closeMenus();
    }, delay);
  };

  const startRowDrag = (rowIndex, e) => {
    e.preventDefault();
    if (openMenu === "row") return;
    isDraggingRef.current = true;
    setDragRow(rowIndex);
    setDropIndicator({ type: "row", index: rowIndex });
    dragStateRef.current = { from: rowIndex, to: rowIndex };
    const onMove = (ev) => {
      const wrapper = hoveredTableRef.current;
      const tableEl = getTableEl(wrapper);
      if (!tableEl) return;
      const rows = tableEl.querySelectorAll("tr");
      let idx = -1;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i].getBoundingClientRect();
        if (ev.clientY >= r.top && ev.clientY <= r.bottom) {
          idx = i;
          break;
        }
      }
      dragStateRef.current.to = idx >= 0 ? idx : dragStateRef.current.from;
      setDropIndicator(idx >= 0 ? { type: "row", index: idx } : null);
    };
    const onUp = () => {
      const { from, to } = dragStateRef.current;
      isDraggingRef.current = false;
      setDragRow(null);
      setDropIndicator(null);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (to != null && from != null && to !== from) {
        const wrapper = hoveredTableRef.current;
        const ctx = wrapper && getTableContext(editor, wrapper);
        if (ctx) {
          const { tableStartPos, tableNode } = ctx;
          const rows = [...tableNode.content.content];
          const [moved] = rows.splice(from, 1);
          rows.splice(to, 0, moved);
          const nextTable = tableNode.type.create(tableNode.attrs, rows);
          replaceTableNode(editor, tableStartPos, tableNode, nextTable);
          updateRect(wrapper);
          dragJustExecutedRef.current = true;
        }
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const startColDrag = (colIndex, e) => {
    e.preventDefault();
    if (openMenu === "col") return;
    isDraggingRef.current = true;
    setDragCol(colIndex);
    setDropIndicator({ type: "col", index: colIndex });
    dragStateRef.current = { from: colIndex, to: colIndex };
    const onMove = (ev) => {
      const wrapper = hoveredTableRef.current;
      const tableEl = getTableEl(wrapper);
      if (!tableEl) return;
      const firstRow = tableEl.querySelector("tr");
      const cells = firstRow?.querySelectorAll("td, th") || [];
      let idx = -1;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i].getBoundingClientRect();
        if (ev.clientX >= c.left && ev.clientX <= c.right) {
          idx = i;
          break;
        }
      }
      dragStateRef.current.to = idx >= 0 ? idx : dragStateRef.current.from;
      setDropIndicator(idx >= 0 ? { type: "col", index: idx } : null);
    };
    const onUp = () => {
      const { from, to } = dragStateRef.current;
      const wrapper = hoveredTableRef.current;
      isDraggingRef.current = false;
      setDragCol(null);
      setDropIndicator(null);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (to != null && from != null && to !== from && wrapper) {
        const ctx = getTableContext(editor, wrapper);
        if (ctx) {
          const { tableStartPos, tableNode } = ctx;
          const rows = tableNode.content.content.map((row) => {
            const cells = [...row.content.content];
            const [moved] = cells.splice(from, 1);
            cells.splice(to, 0, moved);
            return row.type.create(row.attrs, cells);
          });
          const nextTable = tableNode.type.create(tableNode.attrs, rows);
          replaceTableNode(editor, tableStartPos, tableNode, nextTable);
          updateRect(wrapper);
          dragJustExecutedRef.current = true;
        }
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const tableEl = getTableEl(hoveredTable);
  const rows = tableEl?.querySelectorAll("tr") || [];
  const firstRow = rows[0];
  const effectiveRowIndex = openMenu === "row" && openRowIndex != null ? openRowIndex : hoveredRowHandle;
  const effectiveColIndex = openMenu === "col" && openColIndex != null ? openColIndex : hoveredColHandle;
  const rowHandleRect = effectiveRowIndex != null && rows[effectiveRowIndex]
    ? rows[effectiveRowIndex].getBoundingClientRect()
    : null;
  const colHandleRect = effectiveColIndex != null && firstRow
    ? firstRow.querySelectorAll("td, th")[effectiveColIndex]?.getBoundingClientRect()
    : null;

  const renderMenuItem = (kind, action, idx, label, danger = false) => (
    <button
      type="button"
      className={danger ? styles.notionTableHandleMenuItemDanger : styles.notionTableHandleMenuItem}
      onClick={() => (kind === "row" ? runRowAction(action, idx) : runColAction(action, idx))}
    >
      <span className={styles.notionTableHandleMenuLabel}>{label}</span>
    </button>
  );

  const runCellAction = (action) => {
    // If not in table or cursor not in a cell, select cell at row/col handle intersection
    const rowIdx = effectiveRowIndex ?? 0;
    const colIdx = effectiveColIndex ?? 0;
    const sel = editor.state.selection;
    const hasCellSelection = sel instanceof CellSelection || (sel?.$anchor && cellAround(sel.$anchor));
    if (!hasCellSelection) {
      selectCellAt(editor, hoveredTable, rowIdx, colIdx);
    }
    if (action === "merge") editor.chain().focus().mergeCells().run();
    else if (action === "split") editor.chain().focus().splitCell().run();
    else if (action === "alignLeft") editor.chain().focus().setTextAlign("left").run();
    else if (action === "alignCenter") editor.chain().focus().setTextAlign("center").run();
    else if (action === "alignRight") editor.chain().focus().setTextAlign("right").run();
    else if (action === "headerCell") editor.chain().focus().toggleHeaderCell().run();
    else if (action === "bg1") editor.chain().focus().setNodeBackgroundColor("#27272a").run();
    else if (action === "bg2") editor.chain().focus().setNodeBackgroundColor("#3f3f46").run();
    else if (action === "bg3") editor.chain().focus().setNodeBackgroundColor("#312e81").run();
    else if (action === "bgClear") editor.chain().focus().unsetNodeBackgroundColor().run();
    closeMenus();
  };

  const DotHandleIcon = () => (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <circle cx="3" cy="3" r="1" />
      <circle cx="9" cy="3" r="1" />
      <circle cx="3" cy="6" r="1" />
      <circle cx="9" cy="6" r="1" />
      <circle cx="3" cy="9" r="1" />
      <circle cx="9" cy="9" r="1" />
    </svg>
  );

  const renderDropIndicator = () => {
    if (!dropIndicator || !tableEl) return null;
    if (dropIndicator.type === "row") {
      const tr = rows[dropIndicator.index];
      if (!tr) return null;
      const r = tr.getBoundingClientRect();
      return (
        <div
          className={styles.notionTableDropIndicator}
          style={{
            left: rect.viewLeft,
            top: r.top - 2,
            width: rect.width,
            height: 4,
            pointerEvents: "none",
          }}
        />
      );
    }
    if (dropIndicator.type === "col") {
      const cells = firstRow?.querySelectorAll("td, th") || [];
      const cell = cells[dropIndicator.index];
      if (!cell) return null;
      const c = cell.getBoundingClientRect();
      return (
        <div
          className={styles.notionTableDropIndicator}
          style={{
            left: c.left - 2,
            top: rect.viewTop,
            width: 4,
            height: rect.height,
            pointerEvents: "none",
          }}
        />
      );
    }
    return null;
  };

  const cellSelectionOverlayEl = cellSelectionRect && typeof document !== "undefined" && createPortal(
    <div
      className={styles.notionTableCellSelectionOutline}
      style={{
        left: cellSelectionRect.left,
        top: cellSelectionRect.top,
        width: cellSelectionRect.width,
        height: cellSelectionRect.height,
      }}
      aria-hidden
    />,
    document.body
  );

  const colResizeHandleEl = selectedCellResize && typeof document !== "undefined" && createPortal(
    <div
      className={styles.notionTableColResizeHandle}
      style={{
        left: selectedCellResize.cellRect.right - COL_RESIZE_HANDLE_SIZE / 2,
        top: selectedCellResize.cellRect.top + selectedCellResize.cellRect.height / 2 - COL_RESIZE_HANDLE_SIZE / 2,
        width: COL_RESIZE_HANDLE_SIZE,
        height: COL_RESIZE_HANDLE_SIZE,
      }}
      onMouseDown={(e) => handleColumnResizeMouseDown(selectedCellResize.wrapper, selectedCellResize.colIndex, e)}
      title="Drag to resize column"
    />,
    document.body
  );

  if (!editor) return null;
  return (
    <>
      {cellSelectionOverlayEl}
      {showMainControls && typeof document !== "undefined" && createPortal(
    <div ref={controlsRef} data-notion-table-controls style={{ pointerEvents: "none" }}>
      {renderDropIndicator()}
      {activeEdge === "corner" && (
      <div
        className={styles.notionTableCornerControl}
        style={{ left: rect.viewRight - 4, top: rect.viewBottom - 4, pointerEvents: "auto" }}
        onMouseEnter={() => { cancelLeave(); setActiveEdge("corner"); }}
        onMouseLeave={scheduleLeave}
      >
        <div
          className={styles.notionTableCornerDrag}
          onMouseDown={(e) => startCornerDrag(e)}
          title="Drag to add rows and columns"
        />
        <button type="button" className={styles.notionTableAddBtn} onClick={addBoth} title="Add row and column">+</button>
        <button type="button" className={styles.notionTableDeleteBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!editor.isActive("table")) selectLastCellInTable(editor, hoveredTable); editor.chain().focus().deleteTable().run(); }} title="Delete table">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M7 5V4C7 3.17477 7.40255 2.43324 7.91789 1.91789C8.43324 1.40255 9.17477 1 10 1H14C14.8252 1 15.5668 1.40255 16.0821 1.91789C16.5975 2.43324 17 3.17477 17 4V5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H20V20C20 20.8252 19.5975 21.5668 19.0821 22.0821C18.5668 22.5975 17.8252 23 17 23H7C6.17477 23 5.43324 22.5975 4.91789 22.0821C4.40255 21.5668 4 20.1748 4 20V7H3C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5H7ZM9 4C9 3.82523 9.09745 3.56676 9.33211 3.33211C9.56676 3.09745 9.82523 3 10 3H14C14.1748 3 14.4332 3.09745 14.6679 3.33211C14.9025 3.56676 15 3.82523 15 4V5H9V4ZM6 7V20C6 20.1748 6.09745 20.4332 6.33211 20.6679C6.56676 20.9025 6.82523 21 7 21H17C17.1748 21 17.4332 20.9025 17.6679 20.6679C17.9025 20.4332 18 20.1748 18 20V7H6Z" /></svg>
        </button>
      </div>
      )}
      {activeEdge === "row" && (
      <div
        className={styles.notionTableRowControls}
        style={{ left: rect.viewLeft + (rect.width - 40) / 2, top: rect.viewBottom - 8, width: 40, pointerEvents: "auto" }}
        onMouseEnter={() => { cancelLeave(); setActiveEdge("row"); }}
        onMouseLeave={scheduleLeave}
        onMouseDown={startRowHandleDrag}
        title="Click to add a new row · Drag to add or remove rows"
        role="button"
        tabIndex={0}
        aria-label="Add row"
      >
        <span className={styles.notionTableAddIcon}>+</span>
      </div>
      )}
      {activeEdge === "col" && (
      <div
        className={styles.notionTableColControls}
        style={{ left: rect.viewRight - 8, top: rect.viewTop + (rect.height - 40) / 2, height: 40, pointerEvents: "auto" }}
        onMouseEnter={() => { cancelLeave(); setActiveEdge("col"); }}
        onMouseLeave={scheduleLeave}
        onMouseDown={startColHandleDrag}
        title="Click to add a new column · Drag to add or remove columns"
        role="button"
        tabIndex={0}
        aria-label="Add column"
      >
        <span className={styles.notionTableAddIcon}>+</span>
      </div>
      )}
      {rowHandleRect != null && (hoveredRowHandle !== null || openMenu === "row") && (
      <div
        className={styles.notionTableRowHandle}
        style={{
          left: rowHandleRect.left - 26,
          top: rowHandleRect.top + rowHandleRect.height / 2 - 10,
          pointerEvents: "auto",
        }}
        onMouseEnter={() => { cancelLeave(); setHoveredRowHandle(effectiveRowIndex); }}
        onMouseLeave={scheduleLeave}
      >
        <button
          type="button"
          className={styles.notionTableHandleBtn}
          onMouseDown={(e) => { if (e.button === 0 && !openMenu) startRowDrag(effectiveRowIndex, e); }}
          onClick={() => {
            if (dragJustExecutedRef.current) { dragJustExecutedRef.current = false; return; }
            if (openMenu === "row") {
              closeMenus();
            } else {
              setOpenMenu("row");
              setOpenRowIndex(hoveredRowHandle);
              setOpenColIndex(null);
            }
          }}
          title="Row options (drag to reorder)"
          aria-label="Row options"
          style={{ cursor: dragRow != null ? "grabbing" : "grab" }}
        >
          <DotHandleIcon />
        </button>
        {openMenu === "row" && (
          <div className={styles.notionTableHandleMenu} style={{ top: "100%", left: 0, marginTop: 2 }}>
            <div className={styles.notionTableHandleMenuSection}>Row</div>
            {renderMenuItem("row", "above", openRowIndex, "Insert above")}
            {renderMenuItem("row", "below", openRowIndex, "Insert below")}
            <div className={styles.notionTableHandleMenuDivider} />
            {renderMenuItem("row", "duplicate", openRowIndex, "Duplicate")}
            {renderMenuItem("row", "up", openRowIndex, "Move up")}
            {renderMenuItem("row", "down", openRowIndex, "Move down")}
            <div className={styles.notionTableHandleMenuDivider} />
            {renderMenuItem("row", "clear", openRowIndex, "Clear contents")}
            {openRowIndex === 0 && renderMenuItem("row", "header", 0, "Toggle header")}
            <div className={styles.notionTableHandleMenuDivider} />
            {renderMenuItem("row", "delete", openRowIndex, "Delete row", true)}
            <div className={styles.notionTableHandleMenuDivider} />
            <div className={styles.notionTableHandleMenuSection}>Cell</div>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("merge")}><span className={styles.notionTableHandleMenuLabel}>Merge cells</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("split")}><span className={styles.notionTableHandleMenuLabel}>Split cell</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("headerCell")}><span className={styles.notionTableHandleMenuLabel}>Header cell</span></button>
            <div className={styles.notionTableHandleMenuDivider} />
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("alignLeft")}><span className={styles.notionTableHandleMenuLabel}>Align left</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("alignCenter")}><span className={styles.notionTableHandleMenuLabel}>Align center</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("alignRight")}><span className={styles.notionTableHandleMenuLabel}>Align right</span></button>
            <div className={styles.notionTableHandleMenuDivider} />
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("bg1")}><span className={styles.notionTableHandleMenuLabel}>Background dark</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("bg2")}><span className={styles.notionTableHandleMenuLabel}>Background medium</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("bg3")}><span className={styles.notionTableHandleMenuLabel}>Background indigo</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("bgClear")}><span className={styles.notionTableHandleMenuLabel}>Clear background</span></button>
          </div>
        )}
      </div>
      )}
      {hoveredRowResize != null && rows[hoveredRowResize] && (() => {
        const tr = rows[hoveredRowResize].getBoundingClientRect();
        const handleWidth = 80;
        const handleLeft = rect.viewLeft + (rect.width - handleWidth) / 2;
        return (
          <div
            data-row-resize-handle
            data-row-index={hoveredRowResize}
            className={styles.notionTableRowResizeHandle}
            style={{
              left: handleLeft,
              top: tr.bottom - 2,
              width: handleWidth,
              pointerEvents: "auto",
            }}
            onMouseEnter={() => { cancelLeave(); setHoveredRowResize(hoveredRowResize); }}
            onMouseLeave={scheduleLeave}
            onMouseDown={(e) => handleRowResizeMouseDown(hoveredRowResize, e)}
          />
        );
      })()}
      {colHandleRect != null && (hoveredColHandle !== null || openMenu === "col") && (
      <div
        className={styles.notionTableColHandle}
        style={{
          left: colHandleRect.left + colHandleRect.width / 2 - 10,
          top: colHandleRect.top - 26,
          pointerEvents: "auto",
        }}
        onMouseEnter={() => { cancelLeave(); setHoveredColHandle(effectiveColIndex); }}
        onMouseLeave={scheduleLeave}
      >
        <button
          type="button"
          className={styles.notionTableHandleBtn}
          onMouseDown={(e) => { if (e.button === 0 && !openMenu) startColDrag(effectiveColIndex, e); }}
          onClick={() => {
            if (dragJustExecutedRef.current) { dragJustExecutedRef.current = false; return; }
            if (openMenu === "col") {
              closeMenus();
            } else {
              setOpenMenu("col");
              setOpenColIndex(hoveredColHandle);
              setOpenRowIndex(null);
            }
          }}
          title="Column options (drag to reorder)"
          aria-label="Column options"
          style={{ cursor: dragCol != null ? "grabbing" : "grab" }}
        >
          <DotHandleIcon />
        </button>
        {openMenu === "col" && (
          <div className={styles.notionTableHandleMenu} style={{ top: 0, left: "100%", marginLeft: 2 }}>
            <div className={styles.notionTableHandleMenuSection}>Column</div>
            {renderMenuItem("col", "left", openColIndex, "Insert left")}
            {renderMenuItem("col", "right", openColIndex, "Insert right")}
            <div className={styles.notionTableHandleMenuDivider} />
            {renderMenuItem("col", "duplicate", openColIndex, "Duplicate")}
            {renderMenuItem("col", "leftMove", openColIndex, "Move left")}
            {renderMenuItem("col", "rightMove", openColIndex, "Move right")}
            <div className={styles.notionTableHandleMenuDivider} />
            {renderMenuItem("col", "sortAsc", openColIndex, "Sort A to Z")}
            {renderMenuItem("col", "sortDesc", openColIndex, "Sort Z to A")}
            {renderMenuItem("col", "clear", openColIndex, "Clear contents")}
            {openColIndex === 0 && renderMenuItem("col", "header", 0, "Toggle header")}
            <div className={styles.notionTableHandleMenuDivider} />
            {renderMenuItem("col", "delete", openColIndex, "Delete column", true)}
            <div className={styles.notionTableHandleMenuDivider} />
            <div className={styles.notionTableHandleMenuSection}>Cell</div>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("merge")}><span className={styles.notionTableHandleMenuLabel}>Merge cells</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("split")}><span className={styles.notionTableHandleMenuLabel}>Split cell</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("headerCell")}><span className={styles.notionTableHandleMenuLabel}>Header cell</span></button>
            <div className={styles.notionTableHandleMenuDivider} />
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("alignLeft")}><span className={styles.notionTableHandleMenuLabel}>Align left</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("alignCenter")}><span className={styles.notionTableHandleMenuLabel}>Align center</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("alignRight")}><span className={styles.notionTableHandleMenuLabel}>Align right</span></button>
            <div className={styles.notionTableHandleMenuDivider} />
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("bg1")}><span className={styles.notionTableHandleMenuLabel}>Background dark</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("bg2")}><span className={styles.notionTableHandleMenuLabel}>Background medium</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("bg3")}><span className={styles.notionTableHandleMenuLabel}>Background indigo</span></button>
            <button type="button" className={styles.notionTableHandleMenuItem} onClick={() => runCellAction("bgClear")}><span className={styles.notionTableHandleMenuLabel}>Clear background</span></button>
          </div>
        )}
      </div>
      )}
    </div>,
    document.body
      )}
      {colResizeHandleEl}
    </>
  );
}
