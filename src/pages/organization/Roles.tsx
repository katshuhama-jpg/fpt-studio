import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Trash2, ChevronRight, Lock, Info } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader } from "./shared";
import { Checkbox } from "@/components/ui/checkbox";
import { featureGroups, SECTIONS, ALL_PERMISSION_IDS, RESOURCE_WORDS, FeatureGroup } from "./permissionsData";
import { useRoles, isScopablePermission, defaultScope, type ScopeMap, type ScopeValue } from "./rolesStore";
import { useOrg } from "./orgStore";
import { collectMembers } from "./orgData";
import { DEFAULT_ROLE_ID } from "./Members";

/* ─── Inline per-permission Scope control — editable on Create/Edit Role,
   the exact same visual (just non-interactive, via readOnly) on View Role. ─── */
function ScopePill({ value, onChange, readOnly }: { value: ScopeValue; onChange?: (v: ScopeValue) => void; readOnly?: boolean }) {
  const optionClass = (active: boolean, variant: "all" | "own_shared") =>
    `px-3.5 py-[7px] rounded-full text-[13px] font-bold whitespace-nowrap transition-base ${
      active ? (variant === "all" ? "bg-primary-soft text-primary" : "sp-active-own") : "text-muted-foreground"
    } ${readOnly ? "cursor-default" : active ? "" : "hover:text-foreground"}`;
  return (
    <div className="rp-pill inline-flex items-center gap-0.5 p-[3px] rounded-full bg-surface border border-border">
      <button
        type="button"
        onClick={readOnly ? undefined : () => onChange?.("all")}
        disabled={readOnly}
        className={optionClass(value === "all", "all")}
      >
        All in Console
      </button>
      <button
        type="button"
        onClick={readOnly ? undefined : () => onChange?.("own_shared")}
        disabled={readOnly}
        className={optionClass(value === "own_shared", "own_shared")}
      >
        Own & Shared
      </button>
    </div>
  );
}

/* ─── Scope summary banner (View Role) — answers "where is this role limited to Own & Shared"
   without reading every row. Only ever shown read-only, and only when at least one enabled
   permission is scoped to Own & Shared. ─── */
const SCOPE_VERB_ORDER = ["view", "publish", "manage", "pause", "delete"] as const;
const SCOPE_VERB_LABELS: Record<(typeof SCOPE_VERB_ORDER)[number], string> = {
  view: "View", publish: "Publish", manage: "Build", pause: "Pause", delete: "Delete",
};

function buildScopeSummary(effective: Set<string>, scope: ScopeMap): { ownShared: { verbs: string; groups: string }[]; noPermissionGroups: string[] } | null {
  // Group id -> set of verbs enabled on it that are scoped Own & Shared.
  const ownSharedVerbsByGroup = new Map<string, Set<(typeof SCOPE_VERB_ORDER)[number]>>();
  for (const g of featureGroups) {
    for (const p of g.permissions) {
      if (!effective.has(p.id) || !isScopablePermission(p.id) || scope[p.id] !== "own_shared") continue;
      const verb = p.id.split(".")[1] as (typeof SCOPE_VERB_ORDER)[number];
      if (!ownSharedVerbsByGroup.has(g.id)) ownSharedVerbsByGroup.set(g.id, new Set());
      ownSharedVerbsByGroup.get(g.id)!.add(verb);
    }
  }
  // Collapse groups that share the exact same set of Own & Shared verbs into one row.
  const rowsBySignature = new Map<string, { verbs: string[]; groupLabels: string[] }>();
  for (const g of featureGroups) {
    const verbSet = ownSharedVerbsByGroup.get(g.id);
    if (!verbSet || verbSet.size === 0) continue;
    const orderedVerbs = SCOPE_VERB_ORDER.filter(v => verbSet.has(v));
    const signature = orderedVerbs.join(",");
    if (!rowsBySignature.has(signature)) rowsBySignature.set(signature, { verbs: orderedVerbs, groupLabels: [] });
    rowsBySignature.get(signature)!.groupLabels.push(g.label);
  }
  const ownShared = [...rowsBySignature.values()].map(row => ({
    verbs: row.verbs.map(v => SCOPE_VERB_LABELS[v]).join(", "),
    groups: row.groupLabels.join(", "),
  }));
  if (ownShared.length === 0) return null;

  const noPermissionGroups = featureGroups
    .filter(g => !g.permissions.some(p => effective.has(p.id)))
    .map(g => g.label);

  return { ownShared, noPermissionGroups };
}

function ScopeSummaryBanner({ summary }: { summary: NonNullable<ReturnType<typeof buildScopeSummary>> }) {
  return (
    <div className="p-3.5 rounded-xl bg-surface-muted border border-border-strong">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Scope summary</div>
      <div>
        {summary.ownShared.map((row, i) => (
          <div key={i} className="flex items-baseline gap-2.5 py-1.5 text-[13.5px] leading-snug border-t border-dashed border-border first:border-t-0 first:pt-0">
            <span className="scope-summary-chip scope-summary-chip--shared">Own &amp; Shared</span>
            <span className="text-muted-foreground">{row.verbs} — <b className="text-foreground font-semibold">{row.groups}</b></span>
          </div>
        ))}
        {summary.noPermissionGroups.length > 0 && (
          <div className="flex items-baseline gap-2.5 py-1.5 text-[13.5px] leading-snug border-t border-dashed border-border">
            <span className="scope-summary-chip scope-summary-chip--none">No permissions</span>
            <span className="text-muted-foreground"><b className="text-foreground font-semibold">{summary.noPermissionGroups.join(", ")}</b></span>
          </div>
        )}
      </div>
    </div>
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
  title, initialName, initialPermissionIds, initialScope, readOnly, onClose, onSave, existingNames = [],
}: {
  title: string;
  initialName?: string;
  initialPermissionIds?: Set<string>;
  initialScope?: ScopeMap;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (name: string, permissionIds: Set<string>, scope: ScopeMap) => void;
  /** Names of other roles already in the workspace (excluding this one, if editing) — role names must be unique so admins can tell them apart when assigning. */
  existingNames?: string[];
}) {
  const isEdit = initialName !== undefined;
  const [name, setName] = useState(initialName ?? "");
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialPermissionIds ?? []));
  const [scope, setScope] = useState<ScopeMap>({ ...defaultScope(), ...initialScope });
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
    onSave(trimmedName, effective, scope);
    onClose();
  };

  const scopeSummary = readOnly ? buildScopeSummary(effective, scope) : null;

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
        <div className="flex-1 overflow-y-auto py-5 space-y-5">
          {scopeSummary && <div className="px-6"><ScopeSummaryBanner summary={scopeSummary} /></div>}
          <div className="px-6 space-y-5">
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
                  <div className="rounded-xl border border-border divide-y divide-border overflow-hidden" style={{ containerType: "inline-size" }}>
                    {group.permissions.map(p => {
                      const impliedBy = implied.get(p.id);
                      const showPill = isScopablePermission(p.id);
                      const scopeValue: ScopeValue = scope[p.id] ?? "all";
                      return (
                        <div key={p.id} className={`rp-row px-3.5 py-2.5 ${showPill ? "rp-row--with-pill" : ""}`}>
                          <div className="rp-check flex items-center">
                            <Checkbox
                              checked={effective.has(p.id)}
                              onCheckedChange={() => togglePerm(p.id)}
                              disabled={!!impliedBy || readOnly}
                              aria-label={p.name}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePerm(p.id)}
                            disabled={!!impliedBy || readOnly}
                            className={`rp-title min-w-0 text-left text-sm font-medium ${impliedBy || readOnly ? "cursor-default" : "cursor-pointer"}`}
                          >
                            {p.name}
                          </button>
                          {showPill && (
                            <div className="rp-pill-cell">
                              <ScopePill
                                value={scopeValue}
                                onChange={v => setScope(s => ({ ...s, [p.id]: v }))}
                                readOnly={readOnly}
                              />
                            </div>
                          )}
                          <div className="rp-desc text-xs text-muted-foreground">
                            {p.desc}
                            {impliedBy && (
                              <div className="text-[11px] text-primary mt-1 italic">Already included via "{impliedBy}"</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
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

      <style>{`
        @keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        .rp-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          grid-template-rows: auto auto;
          column-gap: 12px;
          row-gap: 6px;
          align-items: start;
        }
        .sp-active-own { background: hsl(var(--warning-soft)); color: hsl(var(--warning)); }
        .scope-summary-chip { flex: 0 0 auto; font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
        .scope-summary-chip--shared { background: hsl(var(--warning-soft)); color: hsl(var(--warning)); }
        .scope-summary-chip--none { background: hsl(var(--surface)); color: hsl(var(--muted-foreground)); border: 1px solid hsl(var(--border-strong)); }
        .rp-check { grid-column: 1; grid-row: 1 / -1; align-self: center; }
        .rp-title { grid-column: 2; grid-row: 1; align-self: center; min-height: 36px; display: flex; align-items: center; }
        .rp-desc { grid-column: 2; grid-row: 2; }
        .rp-pill-cell { grid-column: 3; grid-row: 1; align-self: center; justify-self: end; }
        .rp-row--with-pill { grid-template-columns: auto 1fr auto; grid-template-rows: auto auto; }
        @container (max-width: 340px) {
          .rp-row--with-pill { grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto auto auto; }
          .rp-row--with-pill .rp-pill-cell { grid-column: 2; grid-row: 2; justify-self: start; }
          .rp-row--with-pill .rp-desc { grid-row: 3; }
          .rp-row--with-pill .rp-pill { flex-direction: column; align-items: stretch; width: fit-content; }
        }
      `}</style>
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

/* ─── Scope-neutral copy template for the View Permissions reference ─────
   One small set of copy patterns (not 25 hand-written strings) keyed by the
   permission's verb suffix (view/publish/manage/pause/delete), parameterized
   by the group's resource wording. The base description never asserts a
   Scope-specific behavior; the Scope line spells out both values explicitly. */
type ScopableVerb = "view" | "publish" | "manage" | "pause" | "delete";
type ResourceWords = { thing: string; singular: string };

function scopeNeutralDesc(verb: ScopableVerb, r: ResourceWords): string {
  switch (verb) {
    case "view": return `See ${r.thing}' configuration and details.`;
    case "publish": return `Make a personal ${r.singular} available to the whole workspace, or share it with a specific group.`;
    case "manage": return `Edit the configuration of a live ${r.singular}.`;
    case "pause": return `Pause or resume a live ${r.singular} without deleting it.`;
    case "delete": return `Permanently delete a live ${r.singular}.`;
  }
}

function scopeLineParts(verb: ScopableVerb, r: ResourceWords): { all: string; ownShared: string } {
  const ownShared = `only ${r.thing} you created or that were shared with you.`;
  switch (verb) {
    case "view": return { all: `every ${r.singular} in the Console, including ones not shared with you.`, ownShared };
    case "publish": return { all: `publish any ${r.singular} in the Console.`, ownShared };
    case "manage": return { all: `edit any ${r.singular} in the Console.`, ownShared };
    case "pause": return { all: `pause any ${r.singular} in the Console.`, ownShared };
    case "delete": return { all: `delete any ${r.singular} in the Console.`, ownShared };
  }
}

function ScopeLine({ verb, resource }: { verb: ScopableVerb; resource: ResourceWords }) {
  const { all, ownShared } = scopeLineParts(verb, resource);
  return (
    <div className="mt-2 px-3.5 py-2.5 rounded-lg bg-surface-muted border border-dashed border-border-strong text-[13.5px] leading-relaxed text-muted-foreground">
      <b className="text-primary">All in Console:</b> {all}
      <span className="text-border-strong mx-1.5">·</span>
      <b className="text-warning">Own &amp; Shared:</b> {ownShared}
    </div>
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
            <p className="text-sm text-muted-foreground leading-relaxed">
              Using what you already have is always free. Creating something new — even just for yourself — now requires Create permission; publishing, editing, or deleting shared workspace resources requires the permissions below.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <b className="text-foreground">Scope:</b> Some permissions can also be scoped. <b className="text-primary">All in Console</b> applies to every resource of that type. <b className="text-warning">Own &amp; Shared</b> limits it to resources this role's member created or was shared with.
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
                    {group.permissions.map(p => {
                      const verb = p.id.split(".")[1] as ScopableVerb;
                      const resource = RESOURCE_WORDS[group.id];
                      const scopable = isScopablePermission(p.id) && !!resource;
                      return (
                        <div key={p.id} className="py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[15px] font-semibold">{p.name}</span>
                            {scopable && (
                              <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-primary-soft text-primary whitespace-nowrap">
                                Can be scoped
                              </span>
                            )}
                          </div>
                          <div className="text-[13.5px] text-muted-foreground mt-1 leading-relaxed">
                            {scopable ? scopeNeutralDesc(verb, resource) : p.desc}
                          </div>
                          {scopable && <ScopeLine verb={verb} resource={resource} />}
                        </div>
                      );
                    })}
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

  const handleCreate = (name: string, permissionIds: Set<string>, scope: ScopeMap) => {
    createRole(name, permissionIds, scope);
  };

  const handleSaveEdit = (name: string, permissionIds: Set<string>, scope: ScopeMap) => {
    if (editingId) updateRole(editingId, name, permissionIds, scope);
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
          initialScope={editingRole.scope}
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
