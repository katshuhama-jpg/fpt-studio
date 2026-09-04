import { useEffect, useRef, useState } from "react";

interface Cell { text: string; colSpan: number }
type TableState = Cell[][];

const MAX_DIM = 15;

function parseHtmlTable(html: string): TableState {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("table");
    if (!table) return [[{ text: "", colSpan: 1 }]];
    const rows = [...table.querySelectorAll("tr")].map(tr =>
      [...tr.querySelectorAll("td,th")].map(td => ({
        text: td.textContent ?? "",
        colSpan: Number(td.getAttribute("colspan")) || 1,
      })),
    );
    return rows.length > 0 ? rows : [[{ text: "", colSpan: 1 }]];
  } catch {
    return [[{ text: "", colSpan: 1 }]];
  }
}

function serializeTable(state: TableState): string {
  const rows = state
    .map(row => `<tr>${row.map(c => `<td${c.colSpan > 1 ? ` colspan="${c.colSpan}"` : ""}>${c.text}</td>`).join("")}</tr>`)
    .join("");
  return `<table>${rows}</table>`;
}

function colCountOf(row: Cell[]): number {
  return row.reduce((sum, c) => sum + c.colSpan, 0);
}

/** Lightweight WYSIWYG table editor for a chunk's HTML content ("Xem trước" mode) — a
 * right-click context menu on any cell offers the table operations the user spec'd. Cells
 * track only colSpan (horizontal merge) to keep the row/column math tractable for a
 * prototype; there's no rowSpan/vertical-merge support. */
export default function HtmlTableEditor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const [table, setTable] = useState<TableState>(() => parseHtmlTable(html));
  const [menu, setMenu] = useState<{ x: number; y: number; row: number; col: number } | null>(null);
  const [newTablePrompt, setNewTablePrompt] = useState<{ x: number; y: number } | null>(null);
  const [dims, setDims] = useState({ cols: 3, rows: 3 });
  const [dimError, setDimError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { onChange(serializeTable(table)); }, [table]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!menu && !newTablePrompt) return;
    const close = () => { setMenu(null); setNewTablePrompt(null); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menu, newTablePrompt]);

  const openMenu = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    setMenu({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), row, col });
  };
  const openBlankMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    setNewTablePrompt({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
  };

  const setCellText = (row: number, col: number, text: string) => {
    setTable(prev => prev.map((r, ri) => ri !== row ? r : r.map((c, ci) => ci !== col ? c : { ...c, text })));
  };

  const insertRow = (at: number) => {
    const cols = colCountOf(table[0] ?? []);
    const blank: Cell[] = Array.from({ length: cols }, () => ({ text: "", colSpan: 1 }));
    setTable(prev => [...prev.slice(0, at), blank, ...prev.slice(at)]);
  };
  const removeRow = (row: number) => setTable(prev => prev.length <= 1 ? prev : prev.filter((_, ri) => ri !== row));
  const insertCol = (at: number) => setTable(prev => prev.map(r => [...r.slice(0, at), { text: "", colSpan: 1 }, ...r.slice(at)]));
  const removeCol = (col: number) => setTable(prev => prev.map(r => r.length <= 1 ? r : r.filter((_, ci) => ci !== col)));
  const mergeRight = (row: number, col: number) => setTable(prev => prev.map((r, ri) => {
    if (ri !== row || col >= r.length - 1) return r;
    const next = [...r];
    next[col] = { text: `${next[col].text} ${next[col + 1].text}`.trim(), colSpan: next[col].colSpan + next[col + 1].colSpan };
    next.splice(col + 1, 1);
    return next;
  }));
  const splitCell = (row: number, col: number) => setTable(prev => prev.map((r, ri) => {
    if (ri !== row || r[col].colSpan <= 1) return r;
    const next = [...r];
    next[col] = { ...next[col], colSpan: 1 };
    next.splice(col + 1, 0, { text: "", colSpan: 1 });
    return next;
  }));

  const createTable = () => {
    if (dims.cols < 1 || dims.rows < 1 || dims.cols > MAX_DIM || dims.rows > MAX_DIM) {
      setDimError("Bảng tối đa 15 cột và 15 hàng.");
      return;
    }
    setTable(Array.from({ length: dims.rows }, () => Array.from({ length: dims.cols }, () => ({ text: "", colSpan: 1 }))));
    setNewTablePrompt(null);
    setDimError(null);
  };

  const items = menu ? [
    { label: "Thêm hàng phía trên", onClick: () => insertRow(menu.row) },
    { label: "Thêm hàng phía dưới", onClick: () => insertRow(menu.row + 1) },
    { label: "Xóa hàng", onClick: () => removeRow(menu.row) },
    { label: "Thêm cột bên trái", onClick: () => insertCol(menu.col) },
    { label: "Thêm cột bên phải", onClick: () => insertCol(menu.col + 1) },
    { label: "Xóa cột", onClick: () => removeCol(menu.col) },
    { label: "Gộp ô", onClick: () => mergeRight(menu.row, menu.col) },
    { label: "Tách ô", onClick: () => splitCell(menu.row, menu.col) },
    { label: "Xóa bảng", onClick: () => setTable([[{ text: "", colSpan: 1 }]]), danger: true },
  ] : [];

  return (
    <div ref={containerRef} className="relative" onContextMenu={openBlankMenu}>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {table.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  colSpan={cell.colSpan}
                  contentEditable
                  suppressContentEditableWarning
                  onContextMenu={e => openMenu(e, ri, ci)}
                  onBlur={e => setCellText(ri, ci, e.currentTarget.textContent ?? "")}
                  className="border border-border px-2 py-1.5 outline-none focus:bg-primary-soft/30"
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {menu && (
        <div style={{ left: menu.x, top: menu.y }} className="absolute z-30 w-48 rounded-lg border border-border bg-white shadow-elev py-1" onClick={e => e.stopPropagation()}>
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setMenu(null); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-base ${item.danger ? "text-destructive hover:bg-[hsl(var(--destructive-soft))]" : "hover:bg-surface-muted"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {newTablePrompt && (
        <div style={{ left: newTablePrompt.x, top: newTablePrompt.y }} className="absolute z-30 w-56 rounded-lg border border-border bg-white shadow-elev p-3" onClick={e => e.stopPropagation()}>
          <p className="text-xs font-medium mb-2">Thêm bảng</p>
          <div className="flex items-center gap-2 mb-2">
            <input type="number" min={1} max={15} value={dims.cols} onChange={e => setDims(d => ({ ...d, cols: Number(e.target.value) }))} className="w-16 h-8 px-2 rounded border border-border text-xs" />
            <span className="text-xs text-muted-foreground">cột ×</span>
            <input type="number" min={1} max={15} value={dims.rows} onChange={e => setDims(d => ({ ...d, rows: Number(e.target.value) }))} className="w-16 h-8 px-2 rounded border border-border text-xs" />
            <span className="text-xs text-muted-foreground">hàng</span>
          </div>
          {dimError && <p className="text-[11px] text-destructive mb-2">{dimError}</p>}
          <button onClick={createTable} className="btn-primary h-7 px-3 text-xs w-full justify-center">Thêm bảng</button>
        </div>
      )}
    </div>
  );
}
