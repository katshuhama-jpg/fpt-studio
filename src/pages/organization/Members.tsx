import { useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, UserMinus, Plus } from "lucide-react";
import { Card, PageHeader } from "./shared";
import { orgTree, collectMembers, findMemberUnit, OrgMember } from "./orgData";
import { useRoles } from "./rolesStore";

const ALL_MEMBERS: OrgMember[] = collectMembers(orgTree);

function unitNameFor(memberId: string): string {
  const unit = findMemberUnit(orgTree, memberId);
  return unit ? unit.name : "—";
}

/* ─── Add member picker ─────────────────────────────────────────────────── */
function AddMemberModal({
  roleName, excludeIds, onClose, onAdd,
}: {
  roleName: string;
  excludeIds: Set<string>;
  onClose: () => void;
  onAdd: (memberId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const candidates = ALL_MEMBERS.filter(m => !excludeIds.has(m.id) && (!q || m.name.toLowerCase().includes(q)));

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-[92vw] sm:w-1/2 min-w-[50vw] max-w-[1100px] bg-white rounded-2xl flex flex-col shadow-2xl max-h-[80vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">Add member to {roleName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Search for someone in the organization to assign this role.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>

        <div className="px-6 pt-4 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {candidates.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">No matching members.</div>
          ) : (
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {candidates.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onAdd(m.id); onClose(); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-surface-muted text-left transition-base"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[11px] font-semibold shrink-0">
                    {m.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.role} · {unitNameFor(m.id)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
            Close
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
  const [query, setQuery] = useState("");
  const [addingToRoleId, setAddingToRoleId] = useState<string | null>(null);

  const roleIds = new Set(roles.map(r => r.id));
  const sections = [...roles.map(r => ({ id: r.id, name: r.name })), { id: "unassigned", name: "Unassigned" }];

  const matchesSearch = (m: OrgMember) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
  };

  const membersForRole = (roleId: string) => {
    return ALL_MEMBERS.filter(m => {
      const assigned = assignments[m.id];
      const effectiveRoleId = assigned && roleIds.has(assigned) ? assigned : "unassigned";
      return effectiveRoleId === roleId;
    }).filter(matchesSearch);
  };

  const visibleSections = roleFilter === "all" ? sections : sections.filter(s => s.id === roleFilter);

  const handleAdd = (roleId: string, memberId: string) => {
    setAssignments(prev => ({ ...prev, [memberId]: roleId }));
  };

  const handleRemove = (memberId: string) => {
    setAssignments(prev => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  };

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      {addingToRoleId && (
        <AddMemberModal
          roleName={sections.find(s => s.id === addingToRoleId)?.name ?? ""}
          excludeIds={new Set(membersForRole(addingToRoleId).map(m => m.id))}
          onClose={() => setAddingToRoleId(null)}
          onAdd={memberId => handleAdd(addingToRoleId, memberId)}
        />
      )}

      <PageHeader title="Members" desc="See who's assigned to each role, and which unit they belong to." />

      <Card>
        <div className="flex items-center gap-2 mb-5">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="ds-input h-9 w-auto max-w-[200px]">
            <option value="all">All roles</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or title…" className="ds-input pl-8 h-9" />
          </div>
        </div>

        <div className="space-y-8">
          {visibleSections.map(section => {
            const members = membersForRole(section.id);
            const isUnassigned = section.id === "unassigned";
            return (
              <div key={section.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{section.name}</span>
                    <span className="text-xs text-muted-foreground">{members.length} {members.length === 1 ? "person" : "people"}</span>
                  </div>
                  {!isUnassigned && (
                    <button
                      type="button"
                      onClick={() => setAddingToRoleId(section.id)}
                      className="text-xs font-medium text-primary hover:text-primary-glow transition-base inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> Add member
                    </button>
                  )}
                </div>

                {members.length === 0 ? (
                  <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-6 text-center">
                    No members in this role yet.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="grid grid-cols-[1fr,200px,40px] gap-3 px-4 py-2.5 bg-surface-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <div>Name</div><div>Unit</div><div></div>
                    </div>
                    <div className="divide-y divide-border">
                      {members.map(m => (
                        <div key={m.id} className="grid grid-cols-[1fr,200px,40px] gap-3 px-4 py-3 items-center hover:bg-surface-muted/50 transition-base group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                              {m.initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{m.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground truncate">{unitNameFor(m.id)}</div>
                          {!isUnassigned ? (
                            <button
                              type="button"
                              onClick={() => handleRemove(m.id)}
                              className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                              aria-label={`Remove ${m.name} from ${section.name}`}
                            >
                              <UserMinus size={13} />
                            </button>
                          ) : <div />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
