import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, Plus, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle, Building2, Check } from "lucide-react";
import { Card, PageHeader } from "./shared";
import { OrgUnit, OrgMember, collectMembers, collectUnitsWithDepth, countAll, findUnit, findPath, findMemberUnit } from "./orgData";
import { useRoles, RoleDef } from "./rolesStore";
import { useOrg } from "./orgStore";

function unitNameFor(tree: OrgUnit, memberId: string): string {
  const unit = findMemberUnit(tree, memberId);
  return unit ? unit.name : "Chưa có unit";
}

/** Every member always has a role — this is the implicit one when none was explicitly set. */
const DEFAULT_ROLE_ID = "viewer";

/* ─── Role color palette — local to Members, doesn't touch RoleDef ─────── */
const SEED_ROLE_CHIP: Record<string, string> = {
  admin: "chip-primary",
  builder: "chip-accent",
};
const FALLBACK_ROLE_CHIPS = ["chip-primary", "chip-accent", "chip-warning", "chip-danger"];

function roleChipClass(roleId: string | undefined): string {
  if (!roleId) return "chip border-dashed bg-transparent text-muted-foreground";
  if (SEED_ROLE_CHIP[roleId]) return `chip ${SEED_ROLE_CHIP[roleId]}`;
  if (roleId === "viewer") return "chip";
  let h = 0;
  for (const c of roleId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `chip ${FALLBACK_ROLE_CHIPS[h % FALLBACK_ROLE_CHIPS.length]}`;
}

/* ─── Unit switcher (flat searchable popover — picking a unit is a lookup, not a drill-down) ─── */
function UnitSwitcher({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { tree } = useOrg();
  const rows = useMemo(() => [{ unit: tree, depth: 0 }, ...collectUnitsWithDepth(tree)], [tree]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const filtered = query ? rows.filter(r => r.unit.name.toLowerCase().includes(query)) : rows;
  const path = findPath(tree, value) ?? [tree];
  const label = path.length > 1 ? path.slice(1).map(u => u.name).join(" › ") : path[0].name;

  const pick = (id: string) => { onChange(id); setOpen(false); setQ(""); };

  return (
    <div
      className="relative"
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="h-8 flex items-center gap-2 px-3 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base max-w-[280px]"
      >
        <Building2 size={13} className="text-muted-foreground shrink-0" />
        <span className="truncate" title={label}>{label}</span>
        <ChevronDown size={12} className={`text-muted-foreground transition-base shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] w-80 max-h-96 bg-surface rounded-xl ring-1 ring-border shadow-xl z-50 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Tìm unit…"
                className="ds-input pl-7 h-8 text-sm"
              />
            </div>
          </div>
          <div className="overflow-y-auto p-1">
            {filtered.map(({ unit: u, depth }) => (
              <button
                key={u.id}
                type="button"
                onClick={() => pick(u.id)}
                style={{ paddingLeft: 12 + depth * 16 }}
                className={`w-full flex items-center gap-2 text-left py-2 pr-3 rounded-lg text-sm transition-base hover:bg-surface-muted ${value === u.id ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}
              >
                {depth > 0 && <span className="text-border shrink-0 select-none">└</span>}
                <span className={`truncate flex-1 ${depth === 0 ? "font-medium" : ""}`}>{u.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{countAll(u)}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">Không có kết quả.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Direct vs. include-sub-units scope dropdown (matches the other filter chips) ─── */
const SCOPE_OPTIONS: { id: "direct" | "all"; name: string }[] = [
  { id: "direct", name: "Thành viên trực tiếp" },
  { id: "all", name: "Bao gồm unit con" },
];

function ScopeDropdown({ value, onChange }: { value: "direct" | "all"; onChange: (v: "direct" | "all") => void }) {
  const [open, setOpen] = useState(false);
  const selected = SCOPE_OPTIONS.find(o => o.id === value)!;

  return (
    <div
      className="relative"
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="h-8 flex items-center gap-2 px-3 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base"
      >
        {selected.name}
        <ChevronDown size={12} className={`text-muted-foreground transition-base ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] w-52 bg-surface rounded-xl ring-1 ring-border shadow-xl z-50 p-1">
          {SCOPE_OPTIONS.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(o.id); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${value === o.id ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}
            >
              {o.name}
              {value === o.id && <Check size={13} className="text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Filter chip (bordered dropdown, matches Skills.tsx's filter pattern) ─── */
function FilterChip({
  value, allLabel, options, onChange,
}: {
  value: string;
  allLabel: string;
  options: { id: string; name: string }[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-8 flex items-center gap-2 px-3 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base"
      >
        {selected ? selected.name : allLabel}
        <ChevronDown size={12} className={`text-muted-foreground transition-base ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] w-56 max-h-72 overflow-y-auto bg-surface rounded-xl ring-1 ring-border shadow-xl z-50 p-1">
          <button
            type="button"
            onClick={() => { onChange("all"); setOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${value === "all" ? "text-primary font-medium" : "text-foreground"}`}
          >
            {allLabel}
          </button>
          {options.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(o.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${value === o.id ? "text-primary font-medium" : "text-foreground"}`}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Per-row role cell (click to reassign directly — every member always has a role) ───── */
function RoleCell({
  memberId, memberName, currentRoleId, roles, onAssign,
}: {
  memberId: string;
  memberName: string;
  currentRoleId: string;
  roles: RoleDef[];
  onAssign: (memberId: string, roleId: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = roles.find(r => r.id === currentRoleId);

  return (
    <div
      className="relative"
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={`Đổi vai trò của ${memberName}`}
        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-base hover:opacity-80 cursor-pointer bg-primary-soft text-primary"
      >
        {current?.name ?? currentRoleId}
        <ChevronDown size={11} className={`transition-base ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] w-48 bg-surface rounded-xl ring-1 ring-border shadow-xl z-20 p-1">
          {roles.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onAssign(memberId, r.id); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${currentRoleId === r.id ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}
            >
              {r.name}
              {currentRoleId === r.id && <Check size={13} className="text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Add users to a role (global action) ──────────────────────────────── */
function AddUserToRoleModal({
  roles, defaultRoleId, onClose, onAdd,
}: {
  roles: RoleDef[];
  defaultRoleId: string;
  onClose: () => void;
  onAdd: (memberId: string, roleId: string) => void;
}) {
  const { tree } = useOrg();
  const allMembers = useMemo(() => collectMembers(tree), [tree]);
  const roleIds = new Set(roles.map(r => r.id));
  const currentRoleNameOf = (memberId: string): string | null => {
    const raw = allMembers.find(m => m.id === memberId)?.roleId;
    const rid = raw && roleIds.has(raw) ? raw : DEFAULT_ROLE_ID;
    return roles.find(r => r.id === rid)?.name ?? null;
  };

  const [query, setQuery] = useState("");
  const [showList, setShowList] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<OrgMember[]>([]);
  const [roleId, setRoleId] = useState(defaultRoleId);

  const selectedIds = new Set(selectedMembers.map(m => m.id));
  const q = query.trim().toLowerCase();
  const candidates = q
    ? allMembers.filter(m => !selectedIds.has(m.id) && m.name.toLowerCase().includes(q)).slice(0, 20)
    : [];
  const conflicts = selectedMembers
    .map(m => ({ member: m, roleName: currentRoleNameOf(m.id) }))
    .filter((x): x is { member: OrgMember; roleName: string } => !!x.roleName);

  const addCandidate = (m: OrgMember) => {
    setSelectedMembers(prev => [...prev, m]);
    setQuery("");
  };

  const removeCandidate = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const submit = () => {
    if (selectedMembers.length === 0 || conflicts.length > 0) return;
    selectedMembers.forEach(m => onAdd(m.id, roleId));
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-[92vw] sm:w-1/2 min-w-[50vw] max-w-[1100px] bg-white rounded-2xl flex flex-col shadow-2xl max-h-[80vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">Thêm người dùng vào một vai trò</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Tìm một hoặc nhiều người trong tổ chức và chọn vai trò để gán cho họ.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Người dùng hoặc nhóm</label>
            <div className="relative">
              <div className="flex flex-wrap items-center gap-1.5 min-h-10 px-2 py-1.5 rounded-xl border border-border bg-surface focus-within:border-ring transition-base">
                {selectedMembers.map(m => (
                  <span key={m.id} className="inline-flex items-center gap-1.5 h-7 pl-1 pr-1.5 rounded-lg bg-primary-soft text-primary text-xs font-medium shrink-0">
                    <span className="w-5 h-5 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[9px] font-semibold shrink-0">
                      {m.initials}
                    </span>
                    <span className="max-w-[140px] truncate">{m.name}</span>
                    <button
                      type="button"
                      onClick={() => removeCandidate(m.id)}
                      className="text-primary/70 hover:text-destructive shrink-0"
                      aria-label={`Remove ${m.name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <div className="relative flex-1 min-w-[140px]">
                  <input
                    autoFocus
                    value={query}
                    onChange={e => { setQuery(e.target.value); setShowList(true); }}
                    onFocus={() => setShowList(true)}
                    onBlur={() => setTimeout(() => setShowList(false), 150)}
                    placeholder={selectedMembers.length ? "Thêm người khác…" : "Tìm theo tên hoặc email"}
                    className="w-full h-7 outline-none bg-transparent text-sm"
                  />
                </div>
              </div>
              {showList && candidates.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] max-h-56 overflow-y-auto bg-surface rounded-xl ring-1 ring-border shadow-xl z-50">
                  {candidates.map(m => {
                    const existingRoleName = currentRoleNameOf(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => addCandidate(m)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-muted text-left transition-base"
                      >
                        <div className="w-7 h-7 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {m.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate flex items-center gap-1.5">
                            {m.name}
                            {existingRoleName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning-soft text-warning font-medium shrink-0">
                                In {existingRoleName}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{m.role} · {unitNameFor(tree, m.id)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3">
              <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />
              <div className="text-xs text-foreground leading-relaxed">
                {conflicts.map(({ member, roleName }, i) => (
                  <span key={member.id}>
                    <span className="font-medium">{member.name}</span> đã ở trong vai trò <span className="font-medium">{roleName}</span>
                    {i < conflicts.length - 1 ? ", " : ". "}
                  </span>
                ))}
                Gỡ {conflicts.length === 1 ? "người này" : "những người này"} khỏi vai trò hiện tại trước, sau đó thêm lại vào đây.
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium block mb-1.5">Vai trò</label>
            <div className="relative">
              <select
                value={roleId}
                onChange={e => setRoleId(e.target.value)}
                className="ds-input h-10 appearance-none pr-9 cursor-pointer"
              >
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
            Đóng
          </button>
          <button
            onClick={submit}
            disabled={selectedMembers.length === 0 || conflicts.length > 0}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {selectedMembers.length > 1 ? `Thêm ${selectedMembers.length} thành viên` : "Thêm"}
          </button>
        </div>
      </div>

      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function Members() {
  const { tree, assignRole } = useOrg();
  const { roles } = useRoles();
  const [selectedUnitId, setSelectedUnitId] = useState(tree.id);
  const [scope, setScope] = useState<"direct" | "all">("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;

  const roleIds = new Set(roles.map(r => r.id));
  const roleSections = roles.map(r => ({ id: r.id, name: r.name }));
  const selectedUnit = findUnit(tree, selectedUnitId) ?? tree;

  useEffect(() => { setPage(1); }, [selectedUnitId, scope, roleFilter, query]);

  const baseMembers = scope === "all" ? collectMembers(selectedUnit) : selectedUnit.members;

  const visibleMembers = baseMembers
    .filter(m => {
      if (roleFilter === "all") return true;
      const rid = m.roleId;
      const effective = rid && roleIds.has(rid) ? rid : DEFAULT_ROLE_ID;
      return effective === roleFilter;
    })
    .filter(m => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalPages = Math.max(1, Math.ceil(visibleMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const shownMembers = visibleMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      {showAdd && (
        <AddUserToRoleModal
          roles={roles}
          defaultRoleId={roleFilter !== "all" ? roleFilter : (roles[0]?.id ?? "")}
          onClose={() => setShowAdd(false)}
          onAdd={assignRole}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Thành viên" desc="Tìm kiếm và quản lý tất cả mọi người trong tổ chức, cùng vai trò của từng người." />
        <button onClick={() => setShowAdd(true)} className="btn-primary h-9 shrink-0">
          <Plus size={14} /> Thêm người dùng vào vai trò
        </button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <UnitSwitcher value={selectedUnitId} onChange={setSelectedUnitId} />
          <FilterChip value={roleFilter} allLabel="Tất cả vai trò" options={roleSections} onChange={setRoleFilter} />
          <ScopeDropdown value={scope} onChange={setScope} />
          <div className="relative ml-auto w-full sm:w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc chức danh…" className="ds-input pl-8 h-9" />
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-3">
          {visibleMembers.length} người trong {selectedUnit.name}{scope === "all" ? " và các unit con" : ""}
        </div>

        {visibleMembers.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-10 text-center">
            Không tìm thấy thành viên nào.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr,200px,160px] gap-3 px-4 py-2.5 bg-surface-muted section-eyebrow">
                <div>Thành viên</div><div>Unit</div><div>Vai trò</div>
              </div>
              <div className="divide-y divide-border">
                {shownMembers.map(m => {
                  const currentRoleId = m.roleId && roleIds.has(m.roleId) ? m.roleId : DEFAULT_ROLE_ID;
                  const unitName = findMemberUnit(tree, m.id)?.name ?? "—";
                  return (
                    <div key={m.id} className="grid grid-cols-[1fr,200px,160px] gap-3 px-4 py-3 items-center hover:bg-surface-muted/50 transition-base">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                          {m.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-medium truncate">{m.name}</span>
                            {m.inactive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive-soft text-destructive font-medium shrink-0">Inactive</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground truncate" title={unitName}>{unitName}</div>
                      <RoleCell
                        memberId={m.id}
                        memberName={m.name}
                        currentRoleId={currentRoleId}
                        roles={roles}
                        onAssign={assignRole}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Trang {currentPage}/{totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
