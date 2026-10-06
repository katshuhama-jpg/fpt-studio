import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Crown, Users } from "lucide-react";
import { Card, PageHeader } from "./shared";
import { useOrg } from "./orgStore";
import { OrgUnit, OrgMember, countAll, collectUnits } from "./orgData";

const MAX_ADMIN_AVATARS = 3;

function unitAdminsOf(unit: OrgUnit): OrgMember[] {
  return (unit.unitAdmins ?? [])
    .map(g => unit.members.find(m => m.id === g.memberId))
    .filter((m): m is OrgMember => !!m);
}

function ChartNode({
  unit, isRoot, isOpen, onToggle, onOpenUnit,
}: {
  unit: OrgUnit; isRoot: boolean; isOpen: boolean;
  onToggle: (id: string) => void; onOpenUnit: (id: string) => void;
}) {
  const admins = unitAdminsOf(unit);
  const shownAdmins = admins.slice(0, MAX_ADMIN_AVATARS);
  const extraAdmins = admins.length - shownAdmins.length;
  const childCount = unit.units.length;

  return (
    <div
      className={`w-[200px] rounded-xl border bg-surface text-left transition-base hover:shadow-sm ${
        isRoot ? "border-primary/40 bg-primary-soft" : "border-border hover:border-border-strong"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenUnit(unit.id)}
        title="Mở đơn vị này trong Structure"
        className="w-full flex items-start gap-2.5 px-3 pt-3 pb-2 text-left rounded-t-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isRoot ? "bg-surface text-primary" : "bg-primary-soft text-primary"}`}>
          <Building2 size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-snug line-clamp-2 break-words">{unit.name}</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Users size={11} /> {countAll(unit)} người
          </span>
        </span>
      </button>

      <div className="px-3 pb-3 min-h-[34px] flex items-center gap-1.5">
        {admins.length === 0 ? (
          <span className="text-[11px] text-muted-foreground italic">Chưa có Unit Admin</span>
        ) : (
          <>
            <Crown size={12} className="text-primary shrink-0" aria-label="Unit Admin" />
            <div className="flex items-center -space-x-1.5">
              {shownAdmins.map(a => (
                <span
                  key={a.id}
                  title={a.name}
                  className="w-6 h-6 rounded-full bg-primary-soft text-primary border-2 border-surface text-[10px] font-semibold flex items-center justify-center"
                >
                  {a.initials}
                </span>
              ))}
              {extraAdmins > 0 && (
                <span className="w-6 h-6 rounded-full bg-surface-muted text-muted-foreground border-2 border-surface text-[10px] font-medium flex items-center justify-center">
                  +{extraAdmins}
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              {admins.length === 1 ? admins[0].name : `${admins.length} Unit Admin`}
            </span>
          </>
        )}
      </div>

      {childCount > 0 && (
        <button
          type="button"
          onClick={() => onToggle(unit.id)}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Thu gọn" : "Mở rộng"} ${childCount} đơn vị con của ${unit.name}`}
          className="w-full flex items-center justify-center gap-1 h-8 border-t border-border text-xs font-medium text-muted-foreground hover:text-primary hover:bg-surface-muted rounded-b-xl transition-base cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {childCount} đơn vị con
        </button>
      )}
    </div>
  );
}

function ChartBranch({
  unit, isRoot, expanded, onToggle, onOpenUnit,
}: {
  unit: OrgUnit; isRoot?: boolean; expanded: Set<string>;
  onToggle: (id: string) => void; onOpenUnit: (id: string) => void;
}) {
  const isOpen = expanded.has(unit.id);
  return (
    <li>
      <ChartNode unit={unit} isRoot={!!isRoot} isOpen={isOpen} onToggle={onToggle} onOpenUnit={onOpenUnit} />
      {isOpen && unit.units.length > 0 && (
        <ul>
          {unit.units.map(u => (
            <ChartBranch key={u.id} unit={u} expanded={expanded} onToggle={onToggle} onOpenUnit={onOpenUnit} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OrgChart() {
  const { tree } = useOrg();
  const navigate = useNavigate();
  // Start with just the root open — its direct children are visible, everything deeper stays
  // folded until the reader opens it, so a big org (hundreds of people, 3+ levels) doesn't
  // render as one unreadably wide row.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([tree.id]));

  const allUnits = useMemo(() => collectUnits(tree), [tree]);
  const parentIds = useMemo(() => [tree, ...allUnits].filter(u => u.units.length > 0).map(u => u.id), [tree, allUnits]);
  const allOpen = parentIds.every(id => expanded.has(id));

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const openUnit = (id: string) => navigate(`/organization/structure?unit=${encodeURIComponent(id)}`);

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader
        title="Org chart"
        desc="Sơ đồ các đơn vị trong tổ chức. Bấm vào một đơn vị để xem thành viên và chỉnh sửa trong Structure."
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="chip chip-muted">{allUnits.length + 1} đơn vị</span>
            <span className="chip chip-muted">{countAll(tree)} người</span>
            <span className="inline-flex items-center gap-1"><Crown size={12} className="text-primary" /> = Unit Admin của đơn vị đó</span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(allOpen ? new Set([tree.id]) : new Set(parentIds))}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium hover:bg-surface-muted transition-base cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
            {allOpen ? "Thu gọn tất cả" : "Mở rộng tất cả"}
          </button>
        </div>

        <div className="overflow-auto rounded-xl border border-border bg-surface-muted/40 p-6">
          <style>{`
            .org-chart, .org-chart ul { list-style: none; margin: 0; padding: 0; }
            .org-chart { display: flex; justify-content: center; min-width: max-content; }
            .org-chart ul { display: flex; justify-content: center; padding-top: 24px; position: relative; }
            .org-chart li { position: relative; display: flex; flex-direction: column; align-items: center; padding: 24px 8px 0; }
            .org-chart > li { padding-top: 0; }
            .org-chart li::before, .org-chart li::after {
              content: ""; position: absolute; top: 0; right: 50%; width: 50%; height: 24px;
              border-top: 1px solid hsl(var(--border-strong));
            }
            .org-chart li::after { right: auto; left: 50%; border-left: 1px solid hsl(var(--border-strong)); }
            .org-chart > li::before, .org-chart > li::after,
            .org-chart li:only-child::before, .org-chart li:only-child::after { display: none; }
            .org-chart li:only-child { padding-top: 24px; }
            .org-chart li:first-child::before, .org-chart li:last-child::after { border: 0 none; }
            .org-chart li:last-child::before { border-right: 1px solid hsl(var(--border-strong)); border-radius: 0 8px 0 0; }
            .org-chart li:first-child::after { border-radius: 8px 0 0 0; }
            .org-chart ul ul::before, .org-chart li > ul::before {
              content: ""; position: absolute; top: 0; left: 50%; height: 24px;
              border-left: 1px solid hsl(var(--border-strong));
            }
          `}</style>
          <ul className="org-chart" aria-label="Sơ đồ đơn vị">
            <ChartBranch unit={tree} isRoot expanded={expanded} onToggle={toggle} onOpenUnit={openUnit} />
          </ul>
        </div>
      </Card>
    </div>
  );
}
