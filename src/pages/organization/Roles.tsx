import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Crown, Users, UserCog, Trash2 } from "lucide-react";
import { Card, PageHeader } from "./shared";
import { featureGroups, ALL_PERMISSION_IDS, FeatureGroup } from "./permissionsData";

/* ─── Default roles — ready to use, no setup required ────────────────── */
type RoleDef = {
  id: string;
  name: string;
  icon: any;
  color: string;
  bg: string;
  isDefault: boolean;
  permissionIds: Set<string>;
};

const ADMIN_IDS = new Set(ALL_PERMISSION_IDS);
const BUILDER_IDS = new Set([
  "agents.publish",
  "knowledge.publish",
  "skills.publish",
  "connectors.publish",
  "organization.view",
]);
const VIEWER_IDS = new Set([
  "organization.view",
]);

const SEED_ROLES: RoleDef[] = [
  { id: "admin", name: "Admin", icon: Crown, color: "text-warning", bg: "bg-warning-soft", isDefault: true, permissionIds: ADMIN_IDS },
  { id: "builder", name: "Builder", icon: Users, color: "text-primary", bg: "bg-primary-soft", isDefault: true, permissionIds: BUILDER_IDS },
  { id: "viewer", name: "Viewer", icon: Users, color: "text-muted-foreground", bg: "bg-surface-muted", isDefault: true, permissionIds: VIEWER_IDS },
];

/* ─── Toggle switch ────────────────────────────────────────────────────── */
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-200 focus:outline-none ${
        enabled ? "bg-primary border-primary" : "bg-surface-muted border-border"
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? "translate-x-4" : "translate-x-0.5"
      }`} />
    </button>
  );
}

/* ─── Create / edit role modal ─────────────────────────────────────────── */
function RoleModal({
  title, initialName, initialPermissionIds, onClose, onSave,
}: {
  title: string;
  initialName?: string;
  initialPermissionIds?: Set<string>;
  onClose: () => void;
  onSave: (name: string, permissionIds: Set<string>) => void;
}) {
  const isEdit = initialName !== undefined;
  const [name, setName] = useState(initialName ?? "");
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialPermissionIds ?? []));

  const togglePerm = (id: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGroup = (group: FeatureGroup) => {
    const ids = group.permissions.map(p => p.id);
    const allOn = ids.every(id => enabled.has(id));
    setEnabled(prev => {
      const next = new Set(prev);
      ids.forEach(id => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const submit = () => {
    if (!name.trim()) return;
    onSave(name.trim(), enabled);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Choose exactly what this role can do, permission by permission.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base mt-0.5">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Role name <span className="text-destructive">*</span>
            </label>
            <input
              autoFocus
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Support Lead"
            />
          </div>

          <div className="space-y-5">
            {featureGroups.map(group => {
              const ids = group.permissions.map(p => p.id);
              const allOn = ids.every(id => enabled.has(id));
              return (
                <div key={group.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <group.icon size={14} className="text-muted-foreground" />
                      <span className="text-sm font-semibold">{group.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className="text-xs font-medium text-primary hover:text-primary-glow transition-base"
                    >
                      {allOn ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                    {group.permissions.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                        <button
                          type="button"
                          onClick={() => togglePerm(p.id)}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                        </button>
                        <Toggle enabled={enabled.has(p.id)} onChange={() => togglePerm(p.id)} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 bg-white">
          <span className="text-xs text-muted-foreground">{enabled.size} of {ALL_PERMISSION_IDS.length} permissions enabled</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!name.trim()}
              className="h-9 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEdit ? "Save changes" : "Create role"}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeScaleIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }`}</style>
    </div>,
    document.body
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function Roles() {
  const [roles, setRoles] = useState<RoleDef[]>(SEED_ROLES);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingRole = roles.find(r => r.id === editingId) ?? null;

  const handleCreate = (name: string, permissionIds: Set<string>) => {
    setRoles(prev => [
      ...prev,
      { id: `custom-${Date.now()}`, name, icon: UserCog, color: "text-accent", bg: "bg-accent-soft", isDefault: false, permissionIds },
    ]);
  };

  const handleSaveEdit = (name: string, permissionIds: Set<string>) => {
    setRoles(prev => prev.map(r => (r.id === editingId ? { ...r, name, permissionIds } : r)));
  };

  const handleDelete = (id: string) => {
    setRoles(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      {showCreate && (
        <RoleModal title="Create role" onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
      {editingRole && (
        <RoleModal
          title={`Edit ${editingRole.name}`}
          initialName={editingRole.name}
          initialPermissionIds={editingRole.permissionIds}
          onClose={() => setEditingId(null)}
          onSave={handleSaveEdit}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Roles" desc="Default roles are ready to use — create custom roles when you need finer control." />
        <button onClick={() => setShowCreate(true)} className="btn-primary h-9 shrink-0">
          <Plus size={14} /> Create role
        </button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map(r => (
            <div
              key={r.id}
              onClick={() => setEditingId(r.id)}
              className="text-left rounded-xl border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-soft transition-base cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={`w-9 h-9 rounded-lg ${r.bg} flex items-center justify-center shrink-0`}>
                  <r.icon size={16} className={r.color} />
                </div>
                {!r.isDefault && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                    className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                    aria-label={`Delete ${r.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm font-semibold">{r.name}</span>
                {r.isDefault && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-muted-foreground font-medium">Default</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{r.permissionIds.size} of {ALL_PERMISSION_IDS.length} permissions</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
