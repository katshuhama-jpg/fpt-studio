import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Trash2, ChevronRight, Lock, Info } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader } from "./shared";
import { featureGroups, SECTIONS, ALL_PERMISSION_IDS, FeatureGroup } from "./permissionsData";
import { useRoles } from "./rolesStore";
import { useOrg } from "./orgStore";
import { collectMembers } from "./orgData";
import { DEFAULT_ROLE_ID } from "./Members";

/* ─── Toggle switch ────────────────────────────────────────────────────── */
function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-200 focus:outline-none ${
        enabled ? "bg-primary border-primary" : "bg-surface-muted border-border"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      role="switch"
      aria-checked={enabled}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? "translate-x-4" : "translate-x-0.5"
      }`} />
    </button>
  );
}

/* Permission ids currently granted "for free" because some enabled permission implies them,
   mapped to the name of the permission that implies each one. */
function impliedOnMap(enabled: Set<string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const g of featureGroups) {
    for (const p of g.permissions) {
      if (enabled.has(p.id) && p.implies) {
        p.implies.forEach(id => map.set(id, p.name));
      }
    }
  }
  return map;
}

/* ─── Create / edit role modal ─────────────────────────────────────────── */
function RoleModal({
  title, initialName, initialPermissionIds, readOnly, onClose, onSave, existingNames = [],
}: {
  title: string;
  initialName?: string;
  initialPermissionIds?: Set<string>;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (name: string, permissionIds: Set<string>) => void;
  /** Names of other roles already in the workspace (excluding this one, if editing) — role names must be unique so admins can tell them apart when assigning. */
  existingNames?: string[];
}) {
  const isEdit = initialName !== undefined;
  const [name, setName] = useState(initialName ?? "");
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialPermissionIds ?? []));
  const trimmedName = name.trim();
  const isDuplicateName = trimmedName.length > 0 && existingNames.some(n => n.trim().toLowerCase() === trimmedName.toLowerCase());

  const implied = impliedOnMap(enabled);
  const effective = new Set([...enabled, ...implied.keys()]);

  const togglePerm = (id: string) => {
    if (readOnly) return;
    if (implied.has(id)) return; // locked on by another permission — can't toggle independently
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGroup = (group: FeatureGroup) => {
    if (readOnly) return;
    const ids = group.permissions.map(p => p.id);
    const allOn = ids.every(id => effective.has(id));
    setEnabled(prev => {
      const next = new Set(prev);
      ids.forEach(id => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const canSubmit = !!trimmedName && !isDuplicateName;
  const submit = () => {
    if (!canSubmit) return;
    onSave(trimmedName, effective);
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
            <p className="text-xs text-muted-foreground mt-0.5">
              {readOnly
                ? "This is a built-in system role — view only, can't be edited."
                : "Choose exactly what this role can do, permission by permission."}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Role name <span className="text-destructive">*</span>
            </label>
            <input
              autoFocus={!readOnly}
              disabled={readOnly}
              aria-invalid={isDuplicateName}
              className={`w-full h-10 px-3 rounded-xl border text-sm outline-none transition-base ${
                readOnly
                  ? "bg-surface-muted text-muted-foreground cursor-not-allowed border-border"
                  : isDuplicateName
                  ? "bg-surface border-destructive focus:border-destructive"
                  : "bg-surface border-border focus:border-ring"
              }`}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Support Team Lead"
            />
            {isDuplicateName && (
              <p className="text-xs text-destructive mt-1.5">This role name is already in use — please choose another.</p>
            )}
          </div>

          <div className="space-y-5">
            {featureGroups.map(group => {
              const ids = group.permissions.map(p => p.id);
              const allOn = ids.every(id => effective.has(id));
              return (
                <div key={group.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <group.icon size={14} className="text-muted-foreground" />
                      <span className="text-sm font-semibold">{group.label}</span>
                    </div>
                    {group.permissions.length > 1 && !readOnly && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group)}
                        className="text-xs font-medium text-primary hover:text-primary-glow transition-base"
                      >
                        {allOn ? "Deselect all" : "Select all"}
                      </button>
                    )}
                  </div>
                  <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                    {group.permissions.map(p => {
                      const impliedBy = implied.get(p.id);
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                          <button
                            type="button"
                            onClick={() => togglePerm(p.id)}
                            disabled={!!impliedBy || readOnly}
                            className={`min-w-0 flex-1 text-left ${impliedBy || readOnly ? "cursor-default" : "cursor-pointer"}`}
                          >
                            <div className="text-sm font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                            {impliedBy && (
                              <div className="text-[11px] text-primary mt-1 italic">Already included via "{impliedBy}"</div>
                            )}
                          </button>
                          <Toggle enabled={effective.has(p.id)} onChange={() => togglePerm(p.id)} disabled={!!impliedBy || readOnly} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">{effective.size}/{ALL_PERMISSION_IDS.length} permissions enabled</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
              {readOnly ? "Close" : "Cancel"}
            </button>
            {!readOnly && (
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isEdit ? "Save changes" : "Create role"}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}

/* ─── Delete role confirmation (popup) ─────────────────────────────────── */
function ConfirmDeleteRoleModal({
  roleName, memberCount, onClose, onConfirm,
}: {
  roleName: string;
  memberCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] sm:w-[420px] bg-white rounded-2xl shadow-2xl p-6" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[hsl(var(--destructive-soft))] text-destructive">
            <Trash2 size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Delete role "{roleName}"?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {memberCount > 0
                ? `${memberCount} member${memberCount === 1 ? "" : "s"} using this role will be moved to Viewer.`
                : "This action can't be undone."}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
            Cancel
          </button>
          <button onClick={onConfirm} className="h-9 px-4 rounded-xl bg-destructive text-white text-sm font-medium hover:opacity-90 transition-base">
            Delete
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}

/* ─── Permissions reference modal ──────────────────────────────────────── */
function PermissionsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-[92vw] sm:w-1/2 min-w-[50vw] max-w-[1100px] bg-white rounded-2xl flex flex-col shadow-2xl max-h-[90vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">Permissions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">A read-only reference — what each permission actually allows.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="rounded-xl border border-info/20 bg-info/5 p-4 flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-info/15 text-info flex items-center justify-center shrink-0">
              <Info size={15} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Using what you already have is always free. Creating something new — even just for yourself — now requires Create permission; publishing, editing, or deleting shared workspace resources requires the permissions below.
            </p>
          </div>

          {SECTIONS.map((section, i) => (
            <div key={section.id} className={`space-y-6 ${i > 0 ? "pt-6 border-t border-border" : ""}`}>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">{section.label}</h2>
                <p className="text-sm text-muted-foreground mt-1">{section.desc}</p>
              </div>
              {featureGroups.filter(g => g.section === section.id).map(group => (
                <Card key={group.id}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                      <group.icon size={15} />
                    </div>
                    <h2 className="font-display text-base font-semibold">{group.label}</h2>
                  </div>

                  <div className="divide-y divide-border border-t border-border">
                    {group.permissions.map(p => (
                      <div key={p.id} className="py-4">
                        <div className="text-sm font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
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
export default function Roles() {
  const { roles, createRole, updateRole, deleteRole } = useRoles();
  const { tree, assignRole } = useOrg();
  const [showCreate, setShowCreate] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const editingRole = roles.find(r => r.id === editingId) ?? null;
  const confirmDeleteRole = roles.find(r => r.id === confirmDeleteId) ?? null;

  const allMembers = useMemo(() => collectMembers(tree), [tree]);
  const roleIdSet = new Set(roles.map(r => r.id));
  const effectiveRoleId = (m: { roleId?: string }) => (m.roleId && roleIdSet.has(m.roleId) ? m.roleId : DEFAULT_ROLE_ID);
  const memberCountByRole = new Map(roles.map(r => [r.id, allMembers.filter(m => effectiveRoleId(m) === r.id).length]));

  const handleCreate = (name: string, permissionIds: Set<string>) => {
    createRole(name, permissionIds);
  };

  const handleSaveEdit = (name: string, permissionIds: Set<string>) => {
    if (editingId) updateRole(editingId, name, permissionIds);
  };

  const handleDelete = (id: string) => {
    const role = roles.find(r => r.id === id);
    if (!role) return;
    const affected = allMembers.filter(m => effectiveRoleId(m) === id);
    affected.forEach(m => assignRole(m.id, DEFAULT_ROLE_ID));
    deleteRole(id);
    toast.success(
      affected.length > 0
        ? `Deleted role "${role.name}". ${affected.length} member${affected.length === 1 ? "" : "s"} moved to Viewer.`
        : `Deleted role "${role.name}".`
    );
  };

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      {showCreate && (
        <RoleModal
          title="Create role"
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
          existingNames={roles.map(r => r.name)}
        />
      )}
      {showPermissions && <PermissionsModal onClose={() => setShowPermissions(false)} />}
      {confirmDeleteRole && (
        <ConfirmDeleteRoleModal
          roleName={confirmDeleteRole.name}
          memberCount={memberCountByRole.get(confirmDeleteRole.id) ?? 0}
          onClose={() => setConfirmDeleteId(null)}
          onConfirm={() => { handleDelete(confirmDeleteRole.id); setConfirmDeleteId(null); }}
        />
      )}
      {editingRole && (
        <RoleModal
          title={editingRole.isDefault ? `View ${editingRole.name}` : `Edit ${editingRole.name}`}
          initialName={editingRole.name}
          initialPermissionIds={editingRole.permissionIds}
          readOnly={editingRole.isDefault}
          onClose={() => setEditingId(null)}
          onSave={handleSaveEdit}
          existingNames={roles.filter(r => r.id !== editingRole.id).map(r => r.name)}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Roles" desc="The default roles are ready to use — create a custom role when you need finer-grained control." />
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowPermissions(true)} className="btn-secondary">
            <Lock size={14} /> View permissions
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary h-9 shrink-0">
            <Plus size={14} /> Create role
          </button>
        </div>
      </div>

      <Card>
        <div className="divide-y divide-border -mx-1">
          {roles.map(r => (
            <div
              key={r.id}
              onClick={() => setEditingId(r.id)}
              className="flex items-center justify-between gap-4 px-1 py-3.5 hover:bg-surface-muted/50 transition-base cursor-pointer group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{r.name}</span>
                  {r.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-muted-foreground font-medium">Default</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {r.permissionIds.size}/{ALL_PERMISSION_IDS.length} permissions · {memberCountByRole.get(r.id) ?? 0} member{(memberCountByRole.get(r.id) ?? 0) === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!r.isDefault && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(r.id); }}
                    className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                    aria-label={`Delete ${r.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
