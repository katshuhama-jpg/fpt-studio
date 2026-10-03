import { useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building02Icon, ChevronDownIcon, ChevronRightIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { countAll, unitMatches, type OrgUnit, type OrgMember } from "@/pages/organization/orgData";

/** Company/department scope picker for the Publish modal — same synced org tree as
 * Organization › Structure (orgData.ts / useOrg()), no separate tree to maintain. Lets the
 * publisher narrow "Company / department" down to the whole company, one unit, or specific
 * people, same granularity as the description text already promised but had no UI for. */
export default function OrgSharePicker({ tree, selection, onToggleUnit, onToggleMember }: {
  tree: OrgUnit; selection: Set<string>;
  onToggleUnit: (unit: OrgUnit) => void; onToggleMember: (member: OrgMember) => void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set([tree.id]));
  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const query = search.trim().toLowerCase();
  const memberMatches = (m: OrgMember) => !query || m.name.toLowerCase().includes(query) || (m.email ?? "").toLowerCase().includes(query);

  const renderUnit = (unit: OrgUnit, depth: number, ancestorSelected: boolean): ReactNode => {
    const matchingMembers = unit.members.filter(memberMatches);
    if (query && !unitMatches(unit, query) && matchingMembers.length === 0) return null;
    const isExpanded = query.length > 0 || expanded.has(unit.id);
    const hasChildren = unit.units.length > 0 || unit.members.length > 0;
    const checked = ancestorSelected || selection.has(`u:${unit.id}`);
    return (
      <div key={unit.id}>
        <div className="flex items-center gap-2 py-1.5 hover:bg-surface-muted/60 rounded-md" style={{ paddingLeft: depth * 18 }}>
          {hasChildren ? (
            <button type="button" onClick={() => toggleExpand(unit.id)} className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0">
              <HugeiconsIcon icon={isExpanded ? ChevronDownIcon : ChevronRightIcon} size={12} />
            </button>
          ) : <span className="w-4 shrink-0" />}
          <input
            type="checkbox" checked={checked} disabled={ancestorSelected}
            onChange={() => onToggleUnit(unit)}
            className="w-4 h-4 rounded accent-primary shrink-0"
          />
          <HugeiconsIcon icon={Building02Icon} size={13} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium flex-1 truncate">{unit.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">{countAll(unit)}</span>
        </div>
        {isExpanded && (
          <div>
            {unit.units.map(child => renderUnit(child, depth + 1, checked))}
            {matchingMembers.map(m => (
              <div key={m.id} className="flex items-center gap-2 py-1.5 hover:bg-surface-muted/60 rounded-md" style={{ paddingLeft: (depth + 1) * 18 }}>
                <span className="w-4 shrink-0" />
                <input
                  type="checkbox" checked={checked || selection.has(`m:${m.id}`)} disabled={checked}
                  onChange={() => onToggleMember(m)}
                  className="w-4 h-4 rounded accent-primary shrink-0"
                />
                <span className="text-sm flex-1 truncate">{m.name}</span>
                <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[140px]">{m.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white">
      <div className="p-2 border-b border-border">
        <div className="relative">
          <HugeiconsIcon icon={Search01Icon} size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm công ty, phòng ban hoặc nhân viên"
            className="w-full pl-7 pr-2.5 py-1.5 rounded-md border border-border text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
      <div className="max-h-56 overflow-y-auto px-2 py-1">
        {renderUnit(tree, 0, false)}
      </div>
    </div>
  );
}


/** Selecting a unit covers its whole subtree, so it clears any unit or person picked under it. */
export function toggleUnitIn(selection: Set<string>, unit: OrgUnit): Set<string> {
  const next = new Set(selection);
  const key = `u:${unit.id}`;
  if (next.has(key)) { next.delete(key); return next; }
  next.add(key);
  const clear = (u: OrgUnit) => { for (const c of u.units) { next.delete(`u:${c.id}`); clear(c); } for (const m of u.members) next.delete(`m:${m.id}`); };
  clear(unit);
  return next;
}
export function toggleMemberIn(selection: Set<string>, member: OrgMember): Set<string> {
  const next = new Set(selection);
  const key = `m:${member.id}`;
  if (next.has(key)) next.delete(key); else next.add(key);
  return next;
}
