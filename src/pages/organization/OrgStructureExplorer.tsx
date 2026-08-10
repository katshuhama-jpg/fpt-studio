import { useMemo, useState } from "react";
import { Building2, ChevronRight, ChevronDown, Search, Users, Crown } from "lucide-react";
import { OrgUnit, OrgMember, orgTree, countAll, countDirect, findPath, unitMatches } from "./orgData";

function getUnitLeads(unit: OrgUnit): OrgMember[] {
  return unit.members.filter(m => m.roleId === "admin");
}

function TreeRow({
  unit, depth, selectedId, expanded, onToggle, onSelect, query,
}: {
  unit: OrgUnit; depth: number; selectedId: string;
  expanded: Set<string>; onToggle: (id: string) => void; onSelect: (id: string) => void; query: string;
}) {
  if (!unitMatches(unit, query)) return null;

  const hasChildren = unit.units.length > 0;
  const isOpen = query.trim() ? true : expanded.has(unit.id);
  const isSelected = unit.id === selectedId;

  return (
    <div>
      <div
        className={`group flex items-center rounded-xl transition-base ${
          isSelected ? "bg-primary-soft" : "hover:bg-surface-muted"
        }`}
        style={{ paddingLeft: 4 + depth * 20 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(unit.id)}
          aria-label={hasChildren ? (isOpen ? `Collapse ${unit.name}` : `Expand ${unit.name}`) : undefined}
          className={`shrink-0 w-8 h-10 flex items-center justify-center rounded-lg transition-base ${
            hasChildren ? "text-muted-foreground hover:bg-surface cursor-pointer" : "invisible"
          }`}
        >
          {hasChildren && (isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </button>
        <button
          type="button"
          onClick={() => onSelect(unit.id)}
          aria-current={isSelected ? "true" : undefined}
          className={`flex-1 min-w-0 flex items-center gap-2.5 py-2.5 pr-3 text-left cursor-pointer ${
            isSelected ? "text-primary" : "text-foreground"
          }`}
        >
          <Building2 size={16} className="shrink-0" />
          <span className={`text-sm truncate ${isSelected ? "font-semibold" : "font-medium"}`}>{unit.name}</span>
        </button>
      </div>
      {hasChildren && isOpen && (
        <div className="mt-0.5 space-y-0.5">
          {unit.units.map(u => (
            <TreeRow
              key={u.id} unit={u} depth={depth + 1} selectedId={selectedId}
              expanded={expanded} onToggle={onToggle} onSelect={onSelect} query={query}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgStructureExplorer() {
  const [selectedId, setSelectedId] = useState(orgTree.id);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([orgTree.id, ...orgTree.units.map(u => u.id)]));
  const [treeQuery, setTreeQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");

  const path = useMemo(() => findPath(orgTree, selectedId) ?? [orgTree], [selectedId]);
  const selected = path[path.length - 1];

  const selectUnit = (id: string) => {
    setSelectedId(id);
    setMemberQuery("");
    const ancestors = findPath(orgTree, id) ?? [];
    setExpanded(prev => new Set([...prev, ...ancestors.map(a => a.id)]));
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredMembers = selected.members.filter(m => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-5">
      {/* ── Tree navigator ─────────────────────────────── */}
      <div className="border border-border rounded-xl flex flex-col min-h-[320px] lg:max-h-[620px]">
        <div className="p-3 border-b border-border shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={treeQuery}
              onChange={e => setTreeQuery(e.target.value)}
              placeholder="Search units or people…"
              className="ds-input pl-9 h-10 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <TreeRow
            unit={orgTree} depth={0} selectedId={selectedId}
            expanded={expanded} onToggle={toggleExpand} onSelect={selectUnit} query={treeQuery}
          />
        </div>
      </div>

      {/* ── Detail panel ───────────────────────────────── */}
      <div className="min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center flex-wrap gap-1 mb-4 text-xs">
          {path.map((u, i) => (
            <span key={u.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={11} className="text-muted-foreground" />}
              <button
                type="button"
                onClick={() => selectUnit(u.id)}
                className={`px-1.5 py-0.5 rounded transition-base cursor-pointer ${
                  i === path.length - 1
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                }`}
              >
                {u.name}
              </button>
            </span>
          ))}
        </div>

        {/* Unit header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-display font-semibold truncate">{selected.name}</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-surface-muted border border-border text-muted-foreground shrink-0">
            <Users size={12} /> {countAll(selected)} total
          </span>
        </div>

        {/* Sub-units */}
        {selected.units.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Sub-units ({selected.units.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selected.units.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectUnit(u.id)}
                  className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-surface-muted text-left transition-base cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <Building2 size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{u.name}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-surface border border-border text-muted-foreground shrink-0">
                    <Users size={10} /> {countAll(u)}
                  </span>
                  <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Direct members */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Members in this unit ({countDirect(selected)})
            </div>
            {selected.members.length > 6 && (
              <div className="relative w-40">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={memberQuery}
                  onChange={e => setMemberQuery(e.target.value)}
                  placeholder="Filter…"
                  className="ds-input pl-6 h-7 text-xs"
                />
              </div>
            )}
          </div>

          {selected.members.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-6 text-center">
              No members directly in this unit.
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="max-h-[320px] overflow-y-auto divide-y divide-border">
                {filteredMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-muted/60 transition-base">
                    <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {m.initials}
                    </div>
                    <span className="text-sm font-medium truncate">{m.name}</span>
                  </div>
                ))}
                {filteredMembers.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">No matches.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
