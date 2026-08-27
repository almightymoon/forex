import { Extension } from "@tiptap/core";
import { TableRow } from "@tiptap/extension-table";

const MIN_ROW_HEIGHT = 24;

/** TableRow with rowHeight attribute + setRowHeight command for vertical resizing */
export const TableRowResize = Extension.create({
  name: "tableRowResize",

  addExtensions() {
    return [
      TableRow.extend({
        addAttributes() {
          return {
            rowHeight: {
              default: null,
              parseHTML: (el) => {
                const v = el.getAttribute("data-row-height");
                return v ? parseInt(v, 10) : null;
              },
              renderHTML: (attrs) => {
                if (!attrs.rowHeight) return {};
                return {
                  "data-row-height": attrs.rowHeight,
                  style: `min-height: ${attrs.rowHeight}px`,
                };
              },
            },
          };
        },
      }),
    ];
  },

  addCommands() {
    return {
      /** Set height for row at index. tableStartPos = position of table node (before first child). */
      setRowHeight:
        (tableStartPos, rowIndex, heightPx) =>
        ({ state, dispatch }) => {
          const table = state.doc.nodeAt(tableStartPos);
          if (!table || table.type.name !== "table") return false;
          const rows = table.content.content;
          const row = rows[rowIndex];
          if (!row) return false;
          let rowPos = tableStartPos + 1;
          for (let i = 0; i < rowIndex; i++) {
            rowPos += rows[i].nodeSize;
          }
          const tr = state.tr.setNodeMarkup(rowPos, null, {
            ...row.attrs,
            rowHeight: heightPx >= MIN_ROW_HEIGHT ? heightPx : null,
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
});
