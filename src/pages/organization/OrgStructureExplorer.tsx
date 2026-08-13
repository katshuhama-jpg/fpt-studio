import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, ChevronRight, ChevronDown, Search, Users, Pencil, Trash2, Plus, X } from "lucide-react";
import { OrgUnit, OrgMember, countAll, countDirect, findUnit, findPath, unitMatches } from "./orgData";
import { useOrg, deriveNameFromEmail } from "./orgStore";
import { useRoles, RoleDef } from "./rolesStore";

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
          <label className="text-sm font-medium block mb-1.5">Tên unit <span className="text-destructive">*</span></label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            placeholder="vd: Platform Engineering"
            className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
            Hủy
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
  title, desc, initialName, initialEmail, initialRoleId, roles, submitLabel, onClose, onSave,
}: {
  title: string; desc: string; initialName?: string; initialEmail?: string; initialRoleId?: string; roles: RoleDef[]; submitLabel: string;
  onClose: () => void; onSave: (name: string, email: string, roleId: string | undefined) => void;
}) {
  const isEdit = initialName !== undefined;
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [roleId, setRoleId] = useState(initialRoleId ?? "");
  const canSubmit = isEdit ? !!name.trim() && !!email.trim() : !!email.trim();
  const submit = () => {
    if (!canSubmit) return;
    const finalName = isEdit ? name.trim() : deriveNameFromEmail(email.trim());
    onSave(finalName, email.trim(), roleId || undefined);
    onClose();
  };

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
          {isEdit && (
            <div>
              <label className="text-sm font-medium block mb-1.5">Họ và tên <span className="text-destructive">*</span></label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="vd: Mai Hoàng"
                className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium block mb-1.5">Email <span className="text-destructive">*</span></label>
            <input
              autoFocus={!isEdit}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && isEdit) submit(); }}
              placeholder="vd: mai.hoang@fpt.com"
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base"
            />
            {!isEdit && (
              <p className="text-xs text-muted-foreground mt-1.5">Tên sẽ được tự động nhận diện sau khi người này chấp nhận lời mời.</p>
            )}
          </div>
          {!isEdit && (
            <div>
              <label className="text-sm font-medium block mb-1.5">Vai trò</label>
              <div className="relative">
                <select
                  value={roleId}
                  onChange={e => setRoleId(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") submit(); }}
                  className="ds-input h-10 appearance-none pr-9 cursor-pointer"
                >
                  <option value="">Chưa gán</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
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

/* ─── Delete confirmation (popup, reused for units and members) ────────── */
function ConfirmDeleteModal({
  title, desc, confirmLabel, onClose, onConfirm,
}: {
  title: string; desc: string; confirmLabel: string; onClose: () => void; onConfirm: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] sm:w-[420px] bg-white rounded-2xl shadow-2xl p-6" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-destructive-soft text-destructive flex items-center justify-center shrink-0">
            <Trash2 size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{desc}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
            Hủy
          </button>
          <button onClick={onConfirm} className="h-9 px-4 rounded-xl bg-destructive text-white text-sm font-medium hover:opacity-90 transition-base">
            {confirmLabel}
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
  const { roles } = useRoles();
  const [selectedId, setSelectedId] = useState(rootId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([tree.id, ...tree.units.map(u => u.id)]));
  const [treeQuery, setTreeQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [showRenameUnit, setShowRenameUnit] = useState(false);
  const [showAddSubunit, setShowAddSubunit] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<OrgMember | null>(null);
  const [deleteConfirmUnitId, setDeleteConfirmUnitId] = useState<string | null>(null);
  const [deleteConfirmMemberId, setDeleteConfirmMemberId] = useState<string | null>(null);

  const path = useMemo(() => findPath(tree, selectedId) ?? [tree], [tree, selectedId]);
  const selected = path[path.length - 1];
  const isRoot = selected.id === rootId;
  const deleteTargetUnit = deleteConfirmUnitId ? findUnit(tree, deleteConfirmUnitId) : null;
  const deleteTargetMember = deleteConfirmMemberId ? selected.members.find(m => m.id === deleteConfirmMemberId) ?? null : null;

  const selectUnit = (id: string) => {
    setSelectedId(id);
    setMemberQuery("");
    setDeleteConfirmUnitId(null);
    setDeleteConfirmMemberId(null);
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
          title={`Đổi tên ${selected.name}`}
          desc="Cập nhật tên của unit này."
          initialName={selected.name}
          submitLabel="Lưu thay đổi"
          onClose={() => setShowRenameUnit(false)}
          onSave={name => renameUnit(selected.id, name)}
        />
      )}
      {showAddSubunit && (
        <UnitModal
          title="Thêm unit"
          desc={`Tạo unit mới trong ${selected.name}.`}
          submitLabel="Tạo unit"
          onClose={() => setShowAddSubunit(false)}
          onSave={name => createUnit(selected.id, name)}
        />
      )}
      {showAddMember && (
        <MemberModal
          title="Mời thành viên"
          desc={`Mời một người mới tham gia ${selected.name}.`}
          roles={roles}
          submitLabel="Mời thành viên"
          onClose={() => setShowAddMember(false)}
          onSave={(name, email, roleId) => addMember(selected.id, name, email, roleId)}
        />
      )}
      {editingMember && (
        <MemberModal
          title={`Chỉnh sửa ${editingMember.name}`}
          desc="Cập nhật tên và email của người này."
          initialName={editingMember.name}
          initialEmail={editingMember.email}
          initialRoleId={editingMember.roleId}
          roles={roles}
          submitLabel="Lưu thay đổi"
          onClose={() => setEditingMember(null)}
          onSave={(name, email, roleId) => updateMember(editingMember.id, name, email, roleId)}
        />
      )}
      {deleteTargetUnit && (
        <ConfirmDeleteModal
          title={`Xóa "${deleteTargetUnit.name}"?`}
          desc={`Unit này và ${countAll(deleteTargetUnit)} người bên trong sẽ bị xóa. Hành động này không thể hoàn tác.`}
          confirmLabel="Xóa unit"
          onClose={() => setDeleteConfirmUnitId(null)}
          onConfirm={() => handleDeleteUnit(deleteTargetUnit.id)}
        />
      )}
      {deleteTargetMember && (
        <ConfirmDeleteModal
          title={`Gỡ "${deleteTargetMember.name}"?`}
          desc="Người này sẽ bị gỡ khỏi unit. Hành động này không thể hoàn tác."
          confirmLabel="Gỡ thành viên"
          onClose={() => setDeleteConfirmMemberId(null)}
          onConfirm={() => { removeMember(deleteTargetMember.id); setDeleteConfirmMemberId(null); }}
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
              placeholder="Tìm unit hoặc người…"
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
            <Users size={12} /> {countAll(selected)} người
          </span>
        </div>

        {/* Sub-units */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Unit ({selected.units.length})
            </div>
            <button
              type="button"
              onClick={() => setShowAddSubunit(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-glow transition-base"
            >
              <Plus size={12} /> Thêm unit
            </button>
          </div>
          {selected.units.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-6 text-center">
              Chưa có unit nào.
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
                        <div className="min-w-0 flex-1 pr-6">
                          <div className="text-sm font-semibold truncate">{u.name}</div>
                        </div>
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
                        <div className="text-xs text-foreground">Xóa "{u.name}" và {countAll(u)} người?</div>
                        <div className="flex gap-2">
                          <button onClick={() => handleDeleteUnit(u.id)} className="h-7 px-3 rounded-lg bg-destructive text-white text-xs font-medium">
                            Xóa
                          </button>
                          <button onClick={() => setDeleteConfirmUnitId(null)} className="h-7 px-3 rounded-lg border border-border text-xs font-medium">
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmUnitId(u.id)}
                        aria-label={`Delete ${u.name}`}
                        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-md bg-surface/90 shadow-sm hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
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
              Thành viên trong unit này ({countDirect(selected)})
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddMember(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-glow transition-base shrink-0"
              >
                <Plus size={12} /> Mời thành viên
              </button>
              {selected.members.length > 6 && (
                <div className="relative w-40">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={memberQuery}
                    onChange={e => setMemberQuery(e.target.value)}
                    placeholder="Lọc…"
                    className="ds-input pl-6 h-7 text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {selected.members.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-6 text-center">
              Chưa có thành viên trực tiếp trong unit này.
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="max-h-[320px] overflow-y-auto divide-y divide-border">
                {filteredMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-muted/60 transition-base group/row">
                    {deleteConfirmMemberId === m.id ? (
                      <>
                        <span className="text-xs text-foreground flex-1">
                          Gỡ "{m.name}" khỏi unit này? Hành động này không thể hoàn tác.
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => { removeMember(m.id); setDeleteConfirmMemberId(null); }}
                            className="h-7 px-3 rounded-lg bg-destructive text-white text-xs font-medium"
                          >
                            Xóa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmMemberId(null)}
                            className="h-7 px-3 rounded-lg border border-border text-xs font-medium"
                          >
                            Hủy
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {m.initials}
                        </div>
                        <span className="text-sm font-medium truncate flex-1">{m.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
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
                            onClick={() => setDeleteConfirmMemberId(m.id)}
                            aria-label={`Remove ${m.name}`}
                            className="w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {filteredMembers.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">Không có kết quả.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
