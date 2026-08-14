import { useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Search, X, ChevronRight } from "lucide-react";
import { OrgMember, OrgUnit, collectUnitsWithDepth, findPath } from "./orgData";
import { useOrg } from "./orgStore";

/**
 * Move a member from their current unit to a different one, anywhere in the tree.
 * Shared between the unit detail view (Cấu trúc tổ chức) and the global Thành viên list —
 * both just need a member + their current unit id.
 */
export function MoveMemberModal({
  member, currentUnitId, onClose,
}: {
  member: OrgMember;
  currentUnitId: string;
  onClose: () => void;
}) {
  const { tree, moveMember } = useOrg();
  const [query, setQuery] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);

  const rows = [{ unit: tree, depth: 0 }, ...collectUnitsWithDepth(tree)].filter(r => r.unit.id !== currentUnitId);
  const q = query.trim().toLowerCase();
  const filtered = q ? rows.filter(r => r.unit.name.toLowerCase().includes(q)) : rows;

  const currentPath = findPath(tree, currentUnitId) ?? [tree];
  const currentLabel = currentPath.length > 1 ? currentPath.slice(1).map(u => u.name).join(" › ") : currentPath[0].name;
  const targetPath = targetId ? findPath(tree, targetId) : null;
  const targetLabel = targetPath ? (targetPath.length > 1 ? targetPath.slice(1).map(u => u.name).join(" › ") : targetPath[0].name) : null;

  const submit = () => {
    if (!targetId) return;
    moveMember(member.id, targetId);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] sm:w-1/2 min-w-[420px] max-w-[560px] bg-white rounded-2xl flex flex-col shadow-2xl max-h-[80vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">Chuyển unit cho {member.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Đang ở: {currentLabel}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm unit đích…"
              className="ds-input pl-8 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Không tìm thấy unit nào.</div>
          ) : (
            filtered.map(({ unit, depth }) => (
              <button
                key={unit.id}
                type="button"
                onClick={() => setTargetId(unit.id)}
                style={{ paddingLeft: 10 + depth * 16 }}
                className={`w-full flex items-center gap-2 text-left pr-3 py-2 rounded-lg text-sm transition-base ${
                  targetId === unit.id ? "bg-primary-soft text-primary font-medium" : "hover:bg-surface-muted text-foreground"
                }`}
              >
                <Building2 size={13} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{unit.name}</span>
              </button>
            ))
          )}
        </div>

        {targetId && (
          <div className="px-6 py-3 border-t border-border shrink-0 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{currentLabel}</span>
            <ChevronRight size={12} className="shrink-0" />
            <span className="truncate text-foreground font-medium">{targetLabel}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={!targetId}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Chuyển unit
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}
