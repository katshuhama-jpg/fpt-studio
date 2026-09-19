import { useMemo, useState } from "react";
import { X, Wrench, Trash2, Search } from "lucide-react";
import { useReturnFocusOnUnmount } from "./useReturnFocus";
import { builtinCatalog } from "@/components/tool-builder/types";
import { CATALOG as CONNECTOR_CATALOG } from "@/components/configure/ConnectionsTab";
import type { ToolRefSource } from "./types";

type Tab = "builtin" | "connector";

/** Picks what this Tool node documents — an installed Tool Store plugin, or a Connector/
 * Integration app — the same two catalogs ("Your Tools" and "Integrations") Relevance AI's own
 * Workforce "Add tool" panel pulls from (S-gap-4). Unlike Trigger, this isn't scoped to a
 * connected Agent (a Tool node has no connections at all) — it reads the flat, workspace-wide
 * catalogs directly, same as the "Add tool" picker Relevance shows on its own canvas. */
export default function ToolConfigDrawer({
  toolRef, onSelect, onClose, onDelete,
}: {
  // Named `toolRef`, not `ref` — `ref` is a reserved JSX prop name on a plain function
  // component (one not wrapped in forwardRef) and React strips it before it reaches props.
  toolRef: { source: ToolRefSource; id: string } | null;
  onSelect: (ref: { source: ToolRefSource; id: string }) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  useReturnFocusOnUnmount();
  const [tab, setTab] = useState<Tab>(toolRef?.source === "connector" ? "connector" : "builtin");
  const [search, setSearch] = useState("");

  const matches = (text: string) => text.toLowerCase().includes(search.trim().toLowerCase());
  const builtinResults = useMemo(
    () => builtinCatalog.filter(s => !search || matches(s.name) || matches(s.description)),
    [search],
  );
  const connectorResults = useMemo(
    () => CONNECTOR_CATALOG.filter(c => !search || matches(c.name) || matches(c.desc)),
    [search],
  );

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-[420px] border-l border-border bg-surface shadow-2xl z-20 flex flex-col animate-fade-up">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--wf-tool-bg)", color: "var(--wf-tool)" }}>
          <Wrench size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">Tool</div>
        </div>
        <button onClick={onDelete} aria-label="Xóa node" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Trash2 size={14} />
        </button>
        <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X size={14} />
        </button>
      </div>

      <div className="px-4 pt-3 shrink-0">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface-muted mb-3">
          <button
            type="button"
            onClick={() => setTab("builtin")}
            className={`h-8 rounded-md text-xs font-semibold transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === "builtin" ? "bg-white shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Your Tools
          </button>
          <button
            type="button"
            onClick={() => setTab("connector")}
            className={`h-8 rounded-md text-xs font-semibold transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === "connector" ? "bg-white shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Integrations
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === "builtin" ? "Tìm tool..." : "Tìm integration..."}
            className="ds-input h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {tab === "builtin" ? (
          builtinResults.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Không tìm thấy tool nào.</p>
          ) : (
            <div className="space-y-1.5">
              {builtinResults.map(s => {
                const selected = toolRef?.source === "builtin" && toolRef.id === s.setId;
                return (
                  <div
                    key={s.setId}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect({ source: "builtin", id: s.setId })}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect({ source: "builtin", id: s.setId }); } }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center shrink-0 text-base">
                      {s.pluginAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{s.category} · {s.toolCount} tools</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : connectorResults.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Không tìm thấy integration nào.</p>
        ) : (
          <div className="space-y-1.5">
            {connectorResults.map(c => {
              const selected = toolRef?.source === "connector" && toolRef.id === c.id;
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect({ source: "connector", id: c.id })}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect({ source: "connector", id: c.id }); } }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-border/60 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={c.logo} alt={c.name} className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
          Node Tool đánh dấu một tool hoặc integration mà Workforce này có thể dùng — dùng chung danh mục với trang Tools và Connectors của Agent.
        </p>
      </div>
    </aside>
  );
}
