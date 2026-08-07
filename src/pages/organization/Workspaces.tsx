import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Trash2, ChevronRight, ChevronDown, Building2, Users, Layers } from "lucide-react";
import { Card, PageHeader } from "./shared";
import { orgTree, OrgUnit, countAll, findUnit, collectMembers, findMember } from "./orgData";

/* ─── Model ─────────────────────────────────────────────────────────────── */
type Workspace = {
  id: string;
  name: string;
  desc?: string;
  unitIds: Set<string>;
  memberIds: Set<string>;
  isDefault?: boolean;
};

type ResolvedMember = { id: string; name: string; initials: string; viaUnit?: string };

function resolveMembers(ws: Pick<Workspace, "unitIds" | "memberIds">): ResolvedMember[] {
  const map = new Map<string, ResolvedMember>();
  ws.unitIds.forEach(unitId => {
    const unit = findUnit(orgTree, unitId);
    if (!unit) return;
    collectMembers(unit).forEach(m => map.set(m.id, { ...m, viaUnit: unit.name }));
  });
  ws.memberIds.forEach(memberId => {
    if (map.has(memberId)) return;
    const m = findMember(orgTree, memberId);
    if (m) map.set(m.id, { ...m });
  });
  return [...map.values()];
}

/* ─── Seed workspaces — a couple of ready examples ────────────────────── */
const SEED_WORKSPACES: Workspace[] = [
  {
    id: "ws-agents-platform",
    name: "AI Agents Platform",
    desc: "Everyone building and operating the AI Agents product.",
    unitIds: new Set(["fsc-agents"]),
    memberIds: new Set(),
    isDefault: true,
  },
  {
    id: "ws-vn-delivery",
    name: "Vietnam Delivery Squad",
    desc: "All of Vietnam Delivery, across every team underneath it.",
    unitIds: new Set(["fsoft-vn"]),
    memberIds: new Set(),
    isDefault: true,
  },
  {
    id: "ws-guardrail-review",
    name: "Cross-team Guardrail Review",
    desc: "Reviewers pulled individually from Smart Cloud and Telecom for guardrail sign-off.",
    unitIds: new Set(),
    memberIds: new Set(["m-fsc-1", "m-noc-1"]),
    isDefault: true,
  },
];

/* ─── People & units picker (recursive) ────────────────────────────────── */
function UnitPickerRow({
  unit, depth, unitIds, memberIds, onToggleUnit, onToggleMember, impliedBy, expanded, onToggleExpand,
}: {
  unit: OrgUnit;
  depth: number;
  unitIds: Set<string>;
  memberIds: Set<string>;
  onToggleUnit: (id: string) => void;
  onToggleMember: (id: string) => void;
  impliedBy?: string;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const checkedDirectly = unitIds.has(unit.id);
  const isChecked = checkedDirectly || !!impliedBy;
  const disabled = !!impliedBy;
  const passDownImplied = isChecked ? (impliedBy ?? unit.name) : undefined;
  const isOpen = expanded.has(unit.id);
  const hasChildren = unit.units.length > 0 || unit.members.length > 0;

  return (
    <div>
      <div className="flex items-center gap-2 py-2 pr-3 hover:bg-surface-muted/60 transition-base" style={{ paddingLeft: 8 + depth * 20 }}>
        <button
          type="button"
          onClick={() => hasChildren && onToggleExpand(unit.id)}
          className="w-5 h-5 flex items-center justify-center text-muted-foreground shrink-0"
        >
          {hasChildren ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3.5 inline-block" />}
        </button>
        <input
          type="checkbox"
          checked={isChecked}
          disabled={disabled}
          onChange={() => !disabled && onToggleUnit(unit.id)}
          className="w-4 h-4 accent-primary shrink-0 disabled:opacity-50"
        />
        <Building2 size={13} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1 min-w-0 truncate">{unit.name}</span>
        {impliedBy && <span className="text-[11px] text-primary italic shrink-0">Included via "{impliedBy}"</span>}
        <span className="text-xs text-muted-foreground shrink-0">{countAll(unit)} people</span>
      </div>

      {isOpen && (
        <div>
          {unit.members.map(m => {
            const mChecked = passDownImplied ? true : memberIds.has(m.id);
            return (
              <div
                key={m.id}
                className="flex items-center gap-2 py-1.5 pr-3 hover:bg-surface-muted/60 transition-base"
                style={{ paddingLeft: 8 + (depth + 1) * 20 + 20 }}
              >
                <input
                  type="checkbox"
                  checked={mChecked}
                  disabled={!!passDownImplied}
                  onChange={() => !passDownImplied && onToggleMember(m.id)}
                  className="w-4 h-4 accent-primary shrink-0 disabled:opacity-50"
                />
                <div className="w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {m.initials}
                </div>
                <span className="text-sm truncate flex-1 min-w-0">{m.name}</span>
                {passDownImplied && <span className="text-[11px] text-primary italic shrink-0">Included via "{passDownImplied}"</span>}
              </div>
            );
          })}
          {unit.units.map(u => (
            <UnitPickerRow
              key={u.id}
              unit={u}
              depth={depth + 1}
              unitIds={unitIds}
              memberIds={memberIds}
              onToggleUnit={onToggleUnit}
              onToggleMember={onToggleMember}
              impliedBy={passDownImplied}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Create / edit workspace modal ─────────────────────────────────────── */
function WorkspaceModal({
  title, initialName, initialDesc, initialUnitIds, initialMemberIds, onClose, onSave,
}: {
  title: string;
  initialName?: string;
  initialDesc?: string;
  initialUnitIds?: Set<string>;
  initialMemberIds?: Set<string>;
  onClose: () => void;
  onSave: (name: string, desc: string, unitIds: Set<string>, memberIds: Set<string>) => void;
}) {
  const isEdit = initialName !== undefined;
  const [name, setName] = useState(initialName ?? "");
  const [desc, setDesc] = useState(initialDesc ?? "");
  const [unitIds, setUnitIds] = useState<Set<string>>(new Set(initialUnitIds ?? []));
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set(initialMemberIds ?? []));
  const [expanded, setExpanded] = useState<Set<string>>(new Set([orgTree.id, ...orgTree.units.map(u => u.id)]));

  const toggleUnit = (id: string) => {
    setUnitIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleMember = (id: string) => {
    setMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const resolvedCount = resolveMembers({ unitIds, memberIds }).length;

  const submit = () => {
    if (!name.trim()) return;
    onSave(name.trim(), desc.trim(), unitIds, memberIds);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-[92vw] sm:w-1/2 min-w-[50vw] max-w-[1100px] bg-white rounded-2xl flex flex-col shadow-2xl max-h-[90vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Add people or whole units — units stay in sync automatically as their membership changes.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Workspace name <span className="text-destructive">*</span>
            </label>
            <input
              autoFocus
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Customer Support Squad"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Description</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base resize-none"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="What's this workspace for?"
            />
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">People &amp; units</div>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="max-h-[360px] overflow-y-auto">
                <UnitPickerRow
                  unit={orgTree}
                  depth={0}
                  unitIds={unitIds}
                  memberIds={memberIds}
                  onToggleUnit={toggleUnit}
                  onToggleMember={toggleMember}
                  expanded={expanded}
                  onToggleExpand={toggleExpand}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">{resolvedCount} {resolvedCount === 1 ? "person" : "people"} in this workspace</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!name.trim()}
              className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEdit ? "Save changes" : "Create workspace"}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(SEED_WORKSPACES);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingWorkspace = workspaces.find(w => w.id === editingId) ?? null;

  const handleCreate = (name: string, desc: string, unitIds: Set<string>, memberIds: Set<string>) => {
    setWorkspaces(prev => [
      ...prev,
      { id: `custom-${Date.now()}`, name, desc, unitIds, memberIds, isDefault: false },
    ]);
  };

  const handleSaveEdit = (name: string, desc: string, unitIds: Set<string>, memberIds: Set<string>) => {
    setWorkspaces(prev => prev.map(w => (w.id === editingId ? { ...w, name, desc, unitIds, memberIds } : w)));
  };

  const handleDelete = (id: string) => {
    setWorkspaces(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      {showCreate && (
        <WorkspaceModal title="Create workspace" onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
      {editingWorkspace && (
        <WorkspaceModal
          title={`Edit ${editingWorkspace.name}`}
          initialName={editingWorkspace.name}
          initialDesc={editingWorkspace.desc}
          initialUnitIds={editingWorkspace.unitIds}
          initialMemberIds={editingWorkspace.memberIds}
          onClose={() => setEditingId(null)}
          onSave={handleSaveEdit}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Workspaces" desc="Group people and units together so they can collaborate — build agents, share knowledge, and work as one team." />
        <button onClick={() => setShowCreate(true)} className="btn-primary h-9 shrink-0">
          <Plus size={14} /> Create workspace
        </button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {workspaces.map(w => {
            const resolved = resolveMembers(w);
            return (
              <div
                key={w.id}
                onClick={() => setEditingId(w.id)}
                className="text-left rounded-xl border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-soft transition-base cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <Layers size={16} />
                  </div>
                  {!w.isDefault && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleDelete(w.id); }}
                      className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                      aria-label={`Delete ${w.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm font-semibold">{w.name}</span>
                  {w.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-muted-foreground font-medium">Example</span>
                  )}
                </div>
                {w.desc && <div className="text-xs text-muted-foreground mb-2 line-clamp-2">{w.desc}</div>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Users size={11} /> {resolved.length} people</span>
                  {w.unitIds.size > 0 && (
                    <span className="inline-flex items-center gap-1"><Building2 size={11} /> {w.unitIds.size} unit{w.unitIds.size > 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
