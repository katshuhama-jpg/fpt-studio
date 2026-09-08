import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { collectMembers } from "@/pages/organization/orgData";
import { useOrg } from "@/pages/organization/orgStore";
import { useReturnFocus } from "./useReturnFocus";

/** Cancelling this picker (X, backdrop click, or Escape) always just closes it — no
 * validation, no side effects. There's nothing to protect against: a Person node can't exist
 * without a member already chosen (it's only ever created inside `onSelect`), so closing
 * without picking never leaves anything in an invalid state, whether this is a first pick or
 * a "Đổi người nhận" re-pick. */
export default function PersonPickerPopover({
  open, onClose, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (memberId: string) => void;
}) {
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const [search, setSearch] = useState("");
  useReturnFocus(open);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const q = search.trim().toLowerCase();
  const filtered = members.filter(m => !q || m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q));

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-fade-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h3 className="text-sm font-semibold">Chọn người nhận</h3>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
            <X size={15} />
          </button>
        </div>
        <div className="px-5 pb-3 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="h-9 w-full pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Không tìm thấy người phù hợp.</p>
          ) : (
            filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left hover:bg-surface-muted transition-base"
              >
                <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[11px] font-semibold shrink-0">
                  {m.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.email ?? "—"}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
