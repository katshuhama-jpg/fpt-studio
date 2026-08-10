import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, ChevronRight, ChevronDown, Search, Users, Pencil, Trash2, Plus, X } from "lucide-react";
import { OrgUnit, OrgMember, countAll, countDirect, findPath, unitMatches } from "./orgData";
import { useOrg } from "./orgStore";

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
          className={`shrink-0 w-9 h-11 flex items-center justify-center rounded-lg transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
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

/* ─── Create/rename-unit modal (single reusable component, matches RoleModal's isEdit pattern) ─── */
function UnitModal({
  title, desc, initialName, submitLabel, onClose, onSave,
}: {
  title: string; desc: string; initialName?: string; submitLabel: string; onClose: () => void; onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initialName ?? "");
  const submit = () => { if (!name.trim()) return; onSave(name.trim()); onClose(); };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] sm:w-1/2 min-w-[50vw] max-w-[1100px] bg-white rounded-2xl flex flex-col shadow-2xl max-h-[80vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>
        <div className="px-6 py-5">
          <label className="text-sm font-medium block mb-1.5">Unit name <span className="text-destructive">*</span></label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            placeholder="e.g. Platform Engineering"
            className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitLabel}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}

/* ─── Invite/edit-member modal ──────────────────────────────────────────── */
function MemberModal({
  title, desc, initialName, initialEmail, submitLabel, onClose, onSave,
}: {
  title: string; desc: string; initialName?: string; initialEmail?: string; submitLabel: string;
  onClose: () => void; onSave: (name: string, email: string) => void;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const submit = () => { if (!name.trim()) return; onSave(name.trim(), email.trim()); onClose(); };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] sm:w-1/2 min-w-[50vw] max-w-[1100px] bg-white rounded-2xl flex flex-col shadow-2xl max-h-[80vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Full name <span className="text-destructive">*</span></label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Mai Hoang"
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Email <span className="text-destructive">*</span></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="e.g. mai.hoang@fpt.com"
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || !email.trim()}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitLabel}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}

export default function OrgStructureExplorer() {
  const { tree, rootId, createUnit, renameUnit, deleteUnit, addMember, updateMember, removeMember } = useOrg();
  const [selectedId, setSelectedId] = useState(rootId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([tree.id, ...tree.units.map(u => u.id)]));
  const [treeQuery, setTreeQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [showRenameUnit, setShowRenameUnit] = useState(false);
  const [showAddSubunit, setShowAddSubunit] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<OrgMember | null>(null);
  const [deleteConfirmUnitId, setDeleteConfirmUnitId] = useState<string | null>(null);

  const path = useMemo(() => findPath(tree, selectedId) ?? [tree], [tree, selectedId]);
  const selected = path[path.length - 1];
  const isRoot = selected.id === rootId;

  const selectUnit = (id: string) => {
    setSelectedId(id);
    setMemberQuery("");
    setDeleteConfirmUnitId(null);
    const ancestors = findPath(tree, id) ?? [];
    setExpanded(prev => new Set([...prev, ...ancestors.map(a => a.id)]));
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDeleteUnit = (unitId: string) => {
    const p = findPath(tree, unitId);
    const parent = p && p.length > 1 ? p[p.length - 2] : null;
    deleteUnit(unitId);
    setDeleteConfirmUnitId(null);
    if (unitId === selectedId) selectUnit(parent ? parent.id : rootId);
  };

  const filteredMembers = selected.members.filter(m => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-5">
      {showRenameUnit && (
        <UnitModal
          title={`Rename ${selected.name}`}
          desc="Update this unit's name."
          initialName={selected.name}
          submitLabel="Save changes"
          onClose={() => setShowRenameUnit(false)}
          onSave={name => renameUnit(selected.id, name)}
        />
      )}
      {showAddSubunit && (
        <UnitModal
          title="Add sub-unit"
          desc={`Create a new sub-unit under ${selected.name}.`}
          submitLabel="Create sub-unit"
          onClose={() => setShowAddSubunit(false)}
          onSave={name => createUnit(selected.id, name)}
        />
      )}
      {showAddMember && (
        <MemberModal
          title="Invite member"
          desc={`Invite a new person to join ${selected.name}.`}
          submitLabel="Invite member"
          onClose={() => setShowAddMember(false)}
          onSave={(name, email) => addMember(selected.id, name, email)}
        />
      )}
      {editingMember && (
        <MemberModal
          title={`Edit ${editingMember.name}`}
          desc="Update this person's name and email."
          initialName={editingMember.name}
          initialEmail={editingMember.email}
          submitLabel="Save changes"
          onClose={() => setEditingMember(null)}
          onSave={(name, email) => updateMember(editingMember.id, name, email)}
        />
      )}

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
            unit={tree} depth={0} selectedId={selectedId}
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
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-display font-semibold truncate">{selected.name}</div>
            </div>
            {!isRoot && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRenameUnit(true)}
                  aria-label={`Rename ${selected.name}`}
                  className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmUnitId(selected.id)}
                  aria-label={`Delete ${selected.name}`}
                  className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-surface-muted border border-border text-muted-foreground shrink-0">
            <Users size={12} /> {countAll(selected)} total
          </span>
        </div>

        {deleteConfirmUnitId === selected.id && (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive-soft px-3.5 py-2.5">
            <span className="text-xs text-foreground flex-1">
              Delete "{selected.name}" and {countAll(selected)} {countAll(selected) === 1 ? "person" : "people"}? This can't be undone.
            </span>
            <button onClick={() => handleDeleteUnit(selected.id)} className="h-7 px-3 rounded-lg bg-destructive text-white text-xs font-medium shrink-0">
              Delete
            </button>
            <button onClick={() => setDeleteConfirmUnitId(null)} className="h-7 px-3 rounded-lg border border-border text-xs font-medium shrink-0">
              Cancel
            </button>
          </div>
        )}

        {/* Sub-units */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sub-units ({selected.units.length})
            </div>
            <button
              type="button"
              onClick={() => setShowAddSubunit(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-glow transition-base"
            >
              <Plus size={12} /> Add sub-unit
            </button>
          </div>
          {selected.units.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-6 text-center">
              No sub-units yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selected.units.map(u => {
                const preview = u.members.slice(0, 3);
                const previewExtra = countAll(u) - preview.length;
                return (
                  <div key={u.id} className="relative group/card">
                    <button
                      type="button"
                      onClick={() => selectUnit(u.id)}
                      className="w-full p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-surface-muted text-left transition-base cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                          <Building2 size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{u.name}</div>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {preview.map(m => (
                            <div
                              key={m.id}
                              className="w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[9px] font-semibold ring-2 ring-surface"
                            >
                              {m.initials}
                            </div>
                          ))}
                          {previewExtra > 0 && (
                            <div className="w-6 h-6 rounded-full bg-surface-muted text-muted-foreground flex items-center justify-center text-[9px] font-semibold ring-2 ring-surface">
                              +{previewExtra}
                            </div>
                          )}
                        </div>
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-surface border border-border text-muted-foreground shrink-0">
                          <Users size={10} /> {countAll(u)}
                        </span>
                      </div>
                    </button>
                    {deleteConfirmUnitId === u.id ? (
                      <div className="absolute inset-0 z-10 rounded-lg bg-surface border border-destructive/40 p-3 flex flex-col justify-center gap-2">
                        <div className="text-xs text-foreground">Delete "{u.name}" and {countAll(u)} {countAll(u) === 1 ? "person" : "people"}?</div>
                        <div className="flex gap-2">
                          <button onClick={() => handleDeleteUnit(u.id)} className="h-7 px-3 rounded-lg bg-destructive text-white text-xs font-medium">
                            Delete
                          </button>
                          <button onClick={() => setDeleteConfirmUnitId(null)} className="h-7 px-3 rounded-lg border border-border text-xs font-medium">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmUnitId(u.id)}
                        aria-label={`Delete ${u.name}`}
                        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-md opacity-0 group-hover/card:opacity-100 hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Direct members */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Members in this unit ({countDirect(selected)})
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddMember(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-glow transition-base shrink-0"
              >
                <Plus size={12} /> Add member
              </button>
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
          </div>

          {selected.members.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-6 text-center">
              No members directly in this unit.
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="max-h-[320px] overflow-y-auto divide-y divide-border">
                {filteredMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-muted/60 transition-base group/row">
                    <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {m.initials}
                    </div>
                    <span className="text-sm font-medium truncate flex-1">{m.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-base shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingMember(m)}
                        aria-label={`Edit ${m.name}`}
                        className="w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMember(m.id)}
                        aria-label={`Remove ${m.name}`}
                        className="w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
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
