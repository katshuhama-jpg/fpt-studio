import { useMemo, useState } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import type { SharedPerson, SharingAccess } from "./knowledgeBaseStore";

const ACCESS_OPTIONS: { value: SharingAccess; label: string }[] = [
  { value: "view", label: "Có thể xem" },
  { value: "edit", label: "Có thể chỉnh sửa" },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-primary-soft text-primary text-xs font-semibold flex items-center justify-center shrink-0">
      {initialsOf(name).toUpperCase()}
    </div>
  );
}

function AccessDropdown({ value, onChange }: { value: SharingAccess; onChange: (v: SharingAccess) => void }) {
  const [open, setOpen] = useState(false);
  const label = ACCESS_OPTIONS.find(o => o.value === value)?.label ?? value;
  return (
    <div className="relative shrink-0" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border bg-surface text-xs font-medium hover:bg-surface-muted transition-base"
      >
        {label}
        <ChevronDown size={11} className={`text-muted-foreground transition-base ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] w-44 bg-white rounded-lg ring-1 ring-border shadow-elev z-30 p-1">
          {ACCESS_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 text-left px-2.5 py-1.5 rounded-md text-xs transition-base hover:bg-surface-muted ${value === o.value ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}
            >
              {o.label}
              {value === o.value && <Check size={12} className="text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Shared "Người dùng cụ thể" picker — search+chip console-member picker with a per-person
 * "Có thể xem"/"Có thể chỉnh sửa" access dropdown. Used by CreateKnowledgeBaseModal,
 * ConnectExternalKnowledgeBaseModal, and ShareKnowledgeBaseModal so the three don't drift
 * into slightly different pickers. Forked from organization/Members.tsx's
 * AddUserToRoleModal (chip typeahead) + RoleCell (inline access dropdown). */
export default function MemberPicker({
  value, onChange, ownerRow, excludeUserIds = [],
}: {
  value: SharedPerson[];
  onChange: (next: SharedPerson[]) => void;
  ownerRow?: { name: string; email: string };
  excludeUserIds?: string[];
}) {
  const { tree } = useOrg();
  const allMembers = useMemo(() => collectMembers(tree), [tree]);
  const [query, setQuery] = useState("");

  const selectedIds = new Set(value.map(p => p.userId));
  const q = query.trim().toLowerCase();
  const candidates = q
    ? allMembers
        .filter(m => !selectedIds.has(m.id) && !excludeUserIds.includes(m.id) &&
          (m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q)))
        .slice(0, 8)
    : [];

  const addPerson = (m: { id: string; name: string; email?: string }) => {
    onChange([...value, { userId: m.id, name: m.name, email: m.email ?? "", access: "view" }]);
    setQuery("");
  };
  const removePerson = (userId: string) => onChange(value.filter(p => p.userId !== userId));
  const setAccess = (userId: string, access: SharingAccess) =>
    onChange(value.map(p => (p.userId === userId ? { ...p, access } : p)));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc email..."
          className="h-9 w-full pl-8 pr-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
        />
        {candidates.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] max-h-56 overflow-y-auto bg-white rounded-lg ring-1 ring-border shadow-elev z-30 p-1">
            {candidates.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => addPerson(m)}
                className="w-full flex items-center gap-2.5 text-left px-2 py-1.5 rounded-md hover:bg-surface-muted transition-base"
              >
                <Avatar name={m.name} />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                  {m.email && <div className="text-xs text-muted-foreground truncate">{m.email}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {ownerRow && (
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <Avatar name={ownerRow.name} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{ownerRow.name}</div>
              <div className="text-xs text-muted-foreground truncate">{ownerRow.email}</div>
            </div>
            <span className="text-xs font-medium text-muted-foreground shrink-0">Chủ sở hữu</span>
          </div>
        )}
        {value.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-2">Chưa chia sẻ với ai. Tìm và thêm người ở ô trên.</p>
        ) : (
          value.map(p => (
            <div key={p.userId} className="flex items-center gap-2.5 px-1 py-1.5">
              <Avatar name={p.name} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
              </div>
              <AccessDropdown value={p.access} onChange={v => setAccess(p.userId, v)} />
              <button
                type="button"
                onClick={() => removePerson(p.userId)}
                aria-label={`Xóa ${p.name}`}
                className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
