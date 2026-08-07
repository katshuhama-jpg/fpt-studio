import { useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, UserMinus, Plus, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, PageHeader } from "./shared";
import { orgTree, collectMembers, collectUnits, findMemberUnit, OrgMember } from "./orgData";
import { useRoles, RoleDef } from "./rolesStore";

const ALL_MEMBERS: OrgMember[] = collectMembers(orgTree);
const ALL_UNITS = collectUnits(orgTree);

function unitNameFor(memberId: string): string {
  const unit = findMemberUnit(orgTree, memberId);
  return unit ? unit.name : "No unit";
}

function groupByUnit(members: OrgMember[]): { unitName: string; members: OrgMember[] }[] {
  const map = new Map<string, OrgMember[]>();
  members.forEach(m => {
    const unitName = unitNameFor(m.id);
    if (!map.has(unitName)) map.set(unitName, []);
    map.get(unitName)!.push(m);
  });
  return [...map.entries()].map(([unitName, members]) => ({ unitName, members }));
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
        <div className="absolute left-0 top-[calc(100%+4px)] w-56 max-h-72 overflow-y-auto bg-surface rounded-xl ring-1 ring-border shadow-xl z-50 p-1">
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
  roles, assignments, defaultRoleId, onClose, onAdd,
}: {
  roles: RoleDef[];
  assignments: Record<string, string>;
  defaultRoleId: string;
  onClose: () => void;
  onAdd: (memberId: string, roleId: string) => void;
}) {
  const roleIds = new Set(roles.map(r => r.id));
  const currentRoleNameOf = (memberId: string): string | null => {
    const rid = assignments[memberId];
    if (!rid || !roleIds.has(rid)) return null;
    return roles.find(r => r.id === rid)?.name ?? null;
  };

  const [query, setQuery] = useState("");
  const [showList, setShowList] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [roleId, setRoleId] = useState(defaultRoleId);

  const q = query.trim().toLowerCase();
  const candidates = q ? ALL_MEMBERS.filter(m => m.name.toLowerCase().includes(q)).slice(0, 20) : [];
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
                          <div className="text-xs text-muted-foreground truncate">{m.role} · {unitNameFor(m.id)}</div>
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
            <select
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base"
            >
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
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
  const { roles } = useRoles();
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    ALL_MEMBERS.forEach(m => { if (m.roleId) map[m.id] = m.roleId; });
    return map;
  });
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);

  const roleIds = new Set(roles.map(r => r.id));
  const sections = [...roles.map(r => ({ id: r.id, name: r.name })), { id: "unassigned", name: "Unassigned" }];

  const matchesSearch = (m: OrgMember) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
  };

  const matchesUnit = (m: OrgMember) => {
    if (unitFilter === "all") return true;
    return findMemberUnit(orgTree, m.id)?.id === unitFilter;
  };

  const membersForRole = (roleId: string) => {
    return ALL_MEMBERS.filter(m => {
      const assigned = assignments[m.id];
      const effectiveRoleId = assigned && roleIds.has(assigned) ? assigned : "unassigned";
      return effectiveRoleId === roleId;
    }).filter(matchesSearch).filter(matchesUnit);
  };

  const visibleSections = roleFilter === "all" ? sections : sections.filter(s => s.id === roleFilter);

  const handleAdd = (memberId: string, roleId: string) => {
    setAssignments(prev => ({ ...prev, [memberId]: roleId }));
  };

  const handleRemove = (memberId: string) => {
    setAssignments(prev => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  };

  const toggleCollapsed = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      {showAdd && (
        <AddUserToRoleModal
          roles={roles}
          assignments={assignments}
          defaultRoleId={roleFilter !== "all" ? roleFilter : (roles[0]?.id ?? "")}
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Members" desc="See who's assigned to each role, and which unit they belong to." />
        <button onClick={() => setShowAdd(true)} className="btn-primary h-9 shrink-0">
          <Plus size={14} /> Add users to a role
        </button>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-5">
          <FilterChip value={roleFilter} allLabel="All roles" options={sections} onChange={setRoleFilter} />
          <FilterChip value={unitFilter} allLabel="All units" options={ALL_UNITS.map(u => ({ id: u.id, name: u.name }))} onChange={setUnitFilter} />
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or title…" className="ds-input pl-8 h-9" />
          </div>
        </div>

        <div className="space-y-6">
          {visibleSections.map(section => {
            const members = membersForRole(section.id);
            const isUnassigned = section.id === "unassigned";
            const isCollapsed = collapsed.has(section.id);
            const unitGroups = groupByUnit(members);

            return (
              <div key={section.id}>
                <button
                  type="button"
                  onClick={() => toggleCollapsed(section.id)}
                  className="w-full flex items-center gap-2 py-1 text-left cursor-pointer"
                >
                  <ChevronRight size={14} className={`text-muted-foreground transition-base shrink-0 ${!isCollapsed ? "rotate-90" : ""}`} />
                  <span className="text-sm font-semibold">{section.name}</span>
                  <span className="text-xs text-muted-foreground">{members.length} {members.length === 1 ? "person" : "people"}</span>
                </button>

                {!isCollapsed && (
                  members.length === 0 ? (
                    <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-6 text-center ml-5 mt-2">
                      No members in this role yet.
                    </div>
                  ) : (
                    <div className="space-y-4 ml-5 mt-2">
                      {unitGroups.map(group => (
                        <div key={group.unitName}>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                            {group.unitName} <span className="normal-case font-normal">· {group.members.length}</span>
                          </div>
                          <div className="rounded-xl border border-border overflow-hidden">
                            <div className="divide-y divide-border">
                              {group.members.map(m => (
                                <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/50 transition-base group/row">
                                  <div className="w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                                    {m.initials}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium truncate">{m.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                                  </div>
                                  {!isUnassigned && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemove(m.id)}
                                      className="opacity-0 group-hover/row:opacity-100 w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-destructive transition-base shrink-0"
                                      aria-label={`Remove ${m.name} from ${section.name}`}
                                    >
                                      <UserMinus size={13} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
