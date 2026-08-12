import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, UserMinus, Plus, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle, Building2, Check } from "lucide-react";
import { Card, PageHeader } from "./shared";
import { OrgUnit, OrgMember, collectMembers, collectUnitsWithDepth, countAll, findUnit, findPath, findMemberUnit } from "./orgData";
import { useRoles, RoleDef } from "./rolesStore";
import { useOrg } from "./orgStore";

function unitNameFor(tree: OrgUnit, memberId: string): string {
  const unit = findMemberUnit(tree, memberId);
  return unit ? unit.name : "No unit";
}

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
                placeholder="Search units…"
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
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">No matches.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Direct vs. include-sub-units scope dropdown (matches the other filter chips) ─── */
const SCOPE_OPTIONS: { id: "direct" | "all"; name: string }[] = [
  { id: "direct", name: "Direct members" },
  { id: "all", name: "Include sub-units" },
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
    const rid = allMembers.find(m => m.id === memberId)?.roleId;
    if (!rid || !roleIds.has(rid)) return null;
    return roles.find(r => r.id === rid)?.name ?? null;
  };

  const [query, setQuery] = useState("");
  const [showList, setShowList] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [roleId, setRoleId] = useState(defaultRoleId);

  const q = query.trim().toLowerCase();
  const candidates = q ? allMembers.filter(m => m.name.toLowerCase().includes(q)).slice(0, 20) : [];
  const conflictRoleName = selectedMember ? currentRoleNameOf(selectedMember.id) : null;

  const submit = () => {
    if (!selectedMember || conflictRoleName) return;
    onAdd(selectedMember.id, roleId);
    setSelectedMember(null);
    setQuery("");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-[92vw] sm:w-1/2 min-w-[50vw] max-w-[1100px] bg-white rounded-2xl flex flex-col shadow-2xl max-h-[80vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">Add users to a role</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Search for someone in the organization and choose which role to assign.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Users or groups</label>
            <div className="relative">
              {selectedMember ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-primary bg-primary-soft text-sm">
                  <div className="w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[10px] font-semibold shrink-0">
                    {selectedMember.initials}
                  </div>
                  <span className="flex-1 min-w-0 truncate font-medium">{selectedMember.name}</span>
                  <button type="button" onClick={() => setSelectedMember(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <>
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    autoFocus
                    value={query}
                    onChange={e => { setQuery(e.target.value); setShowList(true); }}
                    onFocus={() => setShowList(true)}
                    onBlur={() => setTimeout(() => setShowList(false), 150)}
                    placeholder="Search by name or email"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base"
                  />
                </>
              )}
              {!selectedMember && showList && candidates.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] max-h-56 overflow-y-auto bg-surface rounded-xl ring-1 ring-border shadow-xl z-50">
                  {candidates.map(m => {
                    const existingRoleName = currentRoleNameOf(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setSelectedMember(m); setQuery(""); setShowList(false); }}
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

          {conflictRoleName && selectedMember && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3">
              <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />
              <div className="text-xs text-foreground leading-relaxed">
                <span className="font-medium">{selectedMember.name}</span> is already in the <span className="font-medium">{conflictRoleName}</span> role.
                Remove them from that role first, then add them here.
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium block mb-1.5">Role</label>
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
            Close
          </button>
          <button
            onClick={submit}
            disabled={!selectedMember || !!conflictRoleName}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
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
  const { tree } = useOrg();
  const { roles } = useRoles();
  const { assignRole } = useOrg();
  const [selectedUnitId, setSelectedUnitId] = useState(tree.id);
  const [scope, setScope] = useState<"direct" | "all">("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;

  const roleIds = new Set(roles.map(r => r.id));
  const roleSections = [...roles.map(r => ({ id: r.id, name: r.name })), { id: "unassigned", name: "Unassigned" }];
  const selectedUnit = findUnit(tree, selectedUnitId) ?? tree;

  const roleNameFor = (m: OrgMember): string => {
    const rid = m.roleId;
    if (rid && roleIds.has(rid)) return roles.find(r => r.id === rid)!.name;
    return "Unassigned";
  };

  useEffect(() => { setPage(1); }, [selectedUnitId, scope, roleFilter, query]);

  const baseMembers = scope === "all" ? collectMembers(selectedUnit) : selectedUnit.members;

  const visibleMembers = baseMembers
    .filter(m => {
      if (roleFilter === "all") return true;
      const rid = m.roleId;
      const effective = rid && roleIds.has(rid) ? rid : "unassigned";
      return effective === roleFilter;
    })
    .filter(m => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
    });

  const totalPages = Math.max(1, Math.ceil(visibleMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const shownMembers = visibleMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleAdd = (memberId: string, roleId: string) => assignRole(memberId, roleId);

  const handleRemove = (memberId: string) => assignRole(memberId, undefined);

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      {showAdd && (
        <AddUserToRoleModal
          roles={roles}
          defaultRoleId={roleFilter !== "all" ? roleFilter : (roles[0]?.id ?? "")}
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Members" desc="Search and manage everyone in the organization, and the role each person holds." />
        <button onClick={() => setShowAdd(true)} className="btn-primary h-9 shrink-0">
          <Plus size={14} /> Add users to a role
        </button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <UnitSwitcher value={selectedUnitId} onChange={setSelectedUnitId} />
          <FilterChip value={roleFilter} allLabel="All roles" options={roleSections} onChange={setRoleFilter} />
          <ScopeDropdown value={scope} onChange={setScope} />
          <div className="relative ml-auto w-full sm:w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or title…" className="ds-input pl-8 h-9" />
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-3">
          {visibleMembers.length} {visibleMembers.length === 1 ? "person" : "people"} in {selectedUnit.name}{scope === "all" ? " and its sub-units" : ""}
        </div>

        {visibleMembers.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-10 text-center">
            No members match here.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr,200px,140px,52px] gap-3 px-4 py-2.5 bg-surface-muted section-eyebrow">
                <div>Member</div><div>Unit</div><div>Role</div><div></div>
              </div>
              <div className="divide-y divide-border">
                {shownMembers.map(m => {
                  const roleName = roleNameFor(m);
                  const hasRole = roleName !== "Unassigned";
                  const unitName = findMemberUnit(tree, m.id)?.name ?? "—";
                  return (
                    <div key={m.id} className="grid grid-cols-[1fr,200px,140px,52px] gap-3 px-4 py-3 items-center hover:bg-surface-muted/50 transition-base">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                          {m.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{m.name}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground truncate" title={unitName}>{unitName}</div>
                      <div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full inline-block ${hasRole ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted-foreground"}`}>
                          {roleName}
                        </span>
                      </div>
                      <div className="flex justify-center">
                        {hasRole && (
                          <button
                            type="button"
                            onClick={() => handleRemove(m.id)}
                            className="w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                            aria-label={`Remove ${m.name} from ${roleName}`}
                          >
                            <UserMinus size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
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
