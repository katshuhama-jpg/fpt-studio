import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SparklesIcon, Wrench01Icon, Folder01Icon, File01Icon, Database01Icon,
  Search01Icon, ArrowRight01Icon, ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";
import {
  CATEGORY_LABEL, CATEGORY_ORDER, CATEGORY_SINGULAR, breadcrumb, categoryCount, listLevel, matchRange,
  parentNav, searchCategory, type Category, type MenuItem, type NavPath,
} from "./instructionRefs";

export interface SlashMenuHandle {
  /** Returns true when the key was consumed by the menu (the editor must then not act on it). */
  onKeyDown: (e: KeyboardEvent | React.KeyboardEvent) => boolean;
}

export interface SlashAnchor { left: number; top: number; bottom: number }

const MENU_W = 320;
const MENU_MAX_H = 360;
const GROUP_LIMIT = 5;

const CAT_ICON = { skills: SparklesIcon, knowledge: Database01Icon, tools: Wrench01Icon } as const;
const GLYPH_ICON = { skill: SparklesIcon, tool: Wrench01Icon, folder: Folder01Icon, file: File01Icon } as const;

type Row =
  | { type: "cat"; cat: Category; count: number }
  | { type: "group"; cat: Category }
  | { type: "item"; item: MenuItem }
  | { type: "more"; cat: Category; total: number };

const selectable = (r: Row) => r.type !== "group";

function Highlight({ text, q }: { text: string; q: string }) {
  const range = q.trim() ? matchRange(text, q) : null;
  if (!range) return <>{text}</>;
  return <>{text.slice(0, range[0])}<strong className="font-semibold text-foreground">{text.slice(range[0], range[1])}</strong>{text.slice(range[1])}</>;
}

function ItemIcon({ item }: { item: MenuItem }) {
  if (item.emoji) {
    return <span className="w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0" style={{ background: item.emojiBg }}>{item.emoji}</span>;
  }
  return (
    <span className="w-7 h-7 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
      <HugeiconsIcon icon={GLYPH_ICON[item.glyph]} size={14} />
    </span>
  );
}

/** Popover for the Instructions editor's "/" command. Never takes focus — the Builder keeps
 * typing in the editor and the typed text is mirrored into this menu's search box — so every key
 * the menu cares about is routed in through the imperative `onKeyDown` handle. */
const SlashMenu = forwardRef<SlashMenuHandle, {
  agentId: string;
  /** Text typed after the "/" — also what the search box shows. */
  query: string;
  anchor: SlashAnchor;
  onPick: (item: MenuItem) => void;
  onClose: () => void;
  /** "Thêm" link in an empty category. */
  onAdd: (cat: Category) => void;
}>(function SlashMenu({ agentId, query, anchor, onPick, onClose, onAdd }, ref) {
  const [nav, setNav] = useState<NavPath | null>(null); // null = level 1 (the three categories)
  const [highlight, setHighlight] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: anchor.left });
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPhase("loading");
    const t = window.setTimeout(() => setPhase("ready"), 140);
    return () => window.clearTimeout(t);
  }, [reloadKey]);

  const model = useMemo<{ rows: Row[]; error: boolean; emptyText?: string; showAdd?: Category }>(() => {
    if (phase === "loading") return { rows: [], error: false };
    try {
      const q = query.trim();
      if (!nav) {
        if (!q) {
          return { rows: CATEGORY_ORDER.map(cat => ({ type: "cat" as const, cat, count: categoryCount(agentId, cat) })), error: false };
        }
        const rows: Row[] = [];
        for (const cat of CATEGORY_ORDER) {
          const found = searchCategory(agentId, cat, q);
          if (!found.length) continue;
          rows.push({ type: "group", cat });
          found.slice(0, GROUP_LIMIT).forEach(item => rows.push({ type: "item", item }));
          if (found.length > GROUP_LIMIT) rows.push({ type: "more", cat, total: found.length });
        }
        return { rows, error: false, emptyText: `Không tìm thấy “${q}”.` };
      }
      if (q) {
        const found = searchCategory(agentId, nav.cat, q);
        return { rows: found.map(item => ({ type: "item" as const, item })), error: false, emptyText: `Không tìm thấy “${q}”.` };
      }
      const items = listLevel(agentId, nav);
      const atTop = !nav.kbId && !nav.connectorId;
      return {
        rows: items.map(item => ({ type: "item" as const, item })),
        error: false,
        emptyText: atTop ? `Agent chưa có ${CATEGORY_SINGULAR[nav.cat]} nào.` : "Không có mục nào ở đây.",
        showAdd: atTop ? nav.cat : undefined,
      };
    } catch {
      return { rows: [], error: true };
    }
  }, [agentId, nav, query, phase, reloadKey]);

  // Selection restarts at the top whenever what's listed changes.
  useEffect(() => { setHighlight(0); }, [nav, query, phase]);

  const selRows = model.rows.filter(selectable);
  const safeHighlight = Math.min(highlight, Math.max(selRows.length - 1, 0));
  const current = selRows[safeHighlight];

  const enter = useCallback((next: NavPath) => { setNav(next); }, []);
  const goBack = useCallback(() => {
    setNav(prev => (prev ? parentNav(prev) : null));
  }, []);

  const activate = useCallback((row: Row | undefined, how: "insert" | "open") => {
    if (!row) return;
    if (row.type === "cat" || row.type === "more") { enter({ cat: row.cat }); return; }
    if (row.type === "item") {
      if (how === "open") { if (row.item.child) enter(row.item.child); return; }
      onPick(row.item);
    }
  }, [enter, onPick]);

  useImperativeHandle(ref, () => ({
    onKeyDown(e) {
      switch (e.key) {
        case "ArrowDown": setHighlight(h => Math.min(h + 1, Math.max(selRows.length - 1, 0))); return true;
        case "ArrowUp": setHighlight(h => Math.max(h - 1, 0)); return true;
        case "Enter":
        case "Tab":
          if (!current) return e.key === "Enter";
          activate(current, "insert");
          return true;
        case "ArrowRight":
          if (current && (current.type === "cat" || current.type === "more" || (current.type === "item" && current.item.child))) {
            activate(current, "open");
            return true;
          }
          return false;
        case "ArrowLeft":
          if (nav) { goBack(); return true; }
          return false;
        case "Escape": onClose(); return true;
        default: return false;
      }
    },
  }), [selRows.length, current, activate, nav, goBack, onClose]);

  // Open below the caret; flip above when there isn't room for the menu underneath.
  useLayoutEffect(() => {
    const h = Math.min(boxRef.current?.offsetHeight ?? MENU_MAX_H, MENU_MAX_H);
    const roomBelow = window.innerHeight - anchor.bottom - 8;
    const left = Math.max(8, Math.min(anchor.left, window.innerWidth - MENU_W - 8));
    if (roomBelow < h && anchor.top > h + 8) setPos({ left, bottom: window.innerHeight - anchor.top + 4 });
    else setPos({ left, top: anchor.bottom + 4 });
  }, [anchor, model.rows.length, nav, phase]);

  useEffect(() => {
    boxRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [safeHighlight, model.rows.length]);

  const placeholder = nav ? `Tìm trong ${CATEGORY_LABEL[nav.cat]}…` : "Tìm kiếm…";
  const crumbs = nav ? breadcrumb(agentId, nav) : [];
  let selIndex = -1;

  const renderRow = (row: Row, key: string) => {
    if (row.type === "group") {
      return (
        <div key={key} className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
          {CATEGORY_LABEL[row.cat]}
        </div>
      );
    }
    selIndex += 1;
    const active = selIndex === safeHighlight;
    const idx = selIndex;
    const common = {
      role: "option" as const, "aria-selected": active, "data-active": active,
      onMouseEnter: () => setHighlight(idx),
    };
    const base = `w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left cursor-pointer transition-colors ${active ? "bg-muted" : ""}`;

    if (row.type === "cat") {
      const empty = row.count === 0;
      return (
        <div key={key} {...common} onClick={() => activate(row, "open")} className={`${base} ${empty ? "opacity-60" : ""}`}>
          <span className="w-7 h-7 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={CAT_ICON[row.cat]} size={14} />
          </span>
          <span className="flex-1 text-sm font-medium">{CATEGORY_LABEL[row.cat]}</span>
          {empty && <span className="text-[11px] text-muted-foreground">Chưa có</span>}
          <HugeiconsIcon icon={ArrowRight01Icon} size={13} className="text-muted-foreground/60 shrink-0" />
        </div>
      );
    }
    if (row.type === "more") {
      return (
        <div key={key} {...common} onClick={() => activate(row, "open")} className={`${base} text-sm text-primary font-medium`}>
          <span className="flex-1 pl-9">Xem tất cả ({row.total})</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={13} className="shrink-0" />
        </div>
      );
    }
    const { item } = row;
    return (
      <div key={key} {...common} onClick={() => activate(row, "insert")} className={`${base} ${item.dim ? "opacity-60" : ""}`}>
        <ItemIcon item={item} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium truncate"><Highlight text={item.label} q={query} /></span>
          {item.sub && <span className="block text-[11px] text-muted-foreground truncate"><Highlight text={item.sub} q={query} /></span>}
        </span>
        {item.state && <span className="text-[11px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground shrink-0 whitespace-nowrap">{item.state}</span>}
        {item.child && (
          <button
            type="button"
            aria-label={`Mở ${item.label}`}
            onClick={e => { e.stopPropagation(); enter(item.child!); }}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-background hover:text-foreground shrink-0"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
          </button>
        )}
      </div>
    );
  };

  return createPortal(
    <div
      ref={boxRef}
      className="fixed z-[10050] flex flex-col bg-card rounded-lg border shadow-md overflow-hidden"
      style={{ width: MENU_W, maxHeight: MENU_MAX_H, ...pos }}
      // The editor must keep focus, or the "/" and the typed filter would stop updating.
      onMouseDown={e => e.preventDefault()}
    >
      {/* Search box — mirrors what is typed after "/" in the editor. */}
      <div className="flex items-center gap-2 px-3 h-10 border-b shrink-0">
        <HugeiconsIcon icon={Search01Icon} size={14} className="text-muted-foreground shrink-0" />
        <span className={`text-sm truncate ${query ? "text-foreground" : "text-muted-foreground"}`}>{query || placeholder}</span>
      </div>

      {nav && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b shrink-0">
          <button type="button" onClick={goBack} aria-label="Quay lại" className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground shrink-0">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
          </button>
          <span className="text-xs text-muted-foreground truncate">{crumbs.join(" › ")}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-1" role="listbox">
        {phase === "loading" ? (
          <div className="p-2 space-y-2" aria-busy="true">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2 animate-pulse">
                <div className="w-7 h-7 rounded-md bg-muted" />
                <div className="flex-1 space-y-1.5"><div className="h-3 rounded bg-muted w-2/3" /><div className="h-2.5 rounded bg-muted w-1/3" /></div>
              </div>
            ))}
          </div>
        ) : model.error ? (
          <div className="px-3 py-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Không tải được danh sách.</p>
            <button type="button" onClick={() => setReloadKey(k => k + 1)} className="h-8 px-3 rounded-md border text-sm font-medium hover:bg-muted">Thử lại</button>
          </div>
        ) : model.rows.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {model.emptyText}
            {model.showAdd && !query.trim() && (
              <> <button type="button" onClick={() => onAdd(model.showAdd!)} className="text-primary font-medium hover:underline">Thêm</button></>
            )}
          </div>
        ) : (
          model.rows.map((row, i) => renderRow(row, `${row.type}-${i}`))
        )}
      </div>

      <div className="px-3 py-1.5 border-t text-[11px] text-muted-foreground shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">
        ↑↓ di chuyển · ↵ chèn · → mở · ← quay lại · Esc đóng
      </div>
    </div>,
    document.body,
  );
});

export default SlashMenu;
