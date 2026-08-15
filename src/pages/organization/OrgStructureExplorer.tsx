import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, ChevronRight, ChevronLeft, ChevronDown, Search, Users, Trash2, Plus, X, FolderInput, Crown, Check, User } from "lucide-react";
import { OrgUnit, OrgMember, countAll, countDirect, findUnit, findPath, unitMatches, collectMembers } from "./orgData";
import { useOrg, deriveNameFromEmail } from "./orgStore";
import { useRoles, RoleDef } from "./rolesStore";
import { MoveMemberModal } from "./MoveMemberModal";

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

/* ─── Invite/edit-member modal ──────────────────────────────────────────── */
function MemberModal({
  title, desc, initialName, initialEmail, initialRoleId, roles, submitLabel, onClose, onSave, existingEmails = [], unitName,
}: {
  title: string; desc: string; initialName?: string; initialEmail?: string; initialRoleId?: string; roles: RoleDef[]; submitLabel: string;
  onClose: () => void; onSave: (name: string, email: string, roleId: string | undefined) => void;
  /** Emails already used elsewhere in the org (lowercased, own current email already excluded when editing) — blocks inviting/renaming into a duplicate. */
  existingEmails?: string[];
  /** Unit the invited member will belong to — role/permission chosen below only applies within this unit. */
  unitName?: string;
}) {
  const isEdit = initialName !== undefined;
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [roleId, setRoleId] = useState(initialRoleId ?? (isEdit ? "" : "viewer"));
  const trimmedEmail = email.trim();
  // Standard local@domain.tld shape — good enough to catch missing "@"/domain without being a full RFC 5322 validator.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailInvalid = trimmedEmail.length > 0 && !EMAIL_RE.test(trimmedEmail);
  const isEmailDuplicate = trimmedEmail.length > 0 && !isEmailInvalid && existingEmails.includes(trimmedEmail.toLowerCase());
  const canSubmit = (isEdit ? !!name.trim() && !!trimmedEmail : !!trimmedEmail) && !isEmailInvalid && !isEmailDuplicate;
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
              <label className="text-sm font-medium block mb-1.5">Full name <span className="text-destructive">*</span></label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Mai Hoang"
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
              placeholder="e.g. mai.hoang@fpt.com"
              aria-invalid={isEmailInvalid || isEmailDuplicate}
              className={`w-full h-10 px-3 rounded-xl border bg-surface text-sm outline-none transition-base ${
                isEmailInvalid || isEmailDuplicate ? "border-destructive focus:border-destructive" : "border-border focus:border-ring"
              }`}
            />
            {isEmailInvalid ? (
              <p className="text-xs text-destructive mt-1.5">That email doesn't look right (e.g. mai.hoang@fpt.com).</p>
            ) : isEmailDuplicate ? (
              <p className="text-xs text-destructive mt-1.5">This email is already used by another member in the organization.</p>
            ) : !isEdit && (
              <p className="text-xs text-muted-foreground mt-1.5">Their name will be picked up automatically once they accept the invite.</p>
            )}
          </div>
          {!isEdit && (
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Role{unitName ? ` in ${unitName}` : ""}
              </label>
              <div className="relative">
                <select
                  value={roleId}
                  onChange={e => setRoleId(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") submit(); }}
                  className="ds-input h-10 appearance-none pr-9 cursor-pointer"
                >
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                This role's permissions only apply within {unitName ?? "the current unit"} — not other units. If the member moves to a different unit, the scope moves with them.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
            Cancel
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

/* ─── Member type cell (Member vs. Unit Admin, each option explained inline like RoleCell) ─── */
function MemberTypeCell({
  memberName, isAdmin, onChange,
}: {
  memberName: string;
  isAdmin: boolean;
  onChange: (isAdmin: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={`Change ${memberName}'s type`}
        className={`chip ${isAdmin ? "chip-warning" : "chip-success"} hover:opacity-80 transition-base cursor-pointer`}
      >
        {isAdmin ? <Crown size={11} /> : <User size={11} />}
        {isAdmin ? "Admin" : "Member"}
        <ChevronDown size={11} className={`transition-base ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] w-80 bg-surface rounded-xl ring-1 ring-border shadow-xl z-20 p-1">
          <button
            type="button"
            onClick={() => { onChange(false); setOpen(false); }}
            className={`w-full flex items-start justify-between gap-2 text-left px-3 py-2.5 rounded-lg transition-base hover:bg-surface-muted ${!isAdmin ? "bg-[hsl(var(--success-soft))]" : ""}`}
          >
            <div className="min-w-0">
              <div className={`text-sm font-medium flex items-center gap-1.5 ${!isAdmin ? "text-success" : "text-foreground"}`}>
                <User size={12} /> Member
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">Can create and use Agents, Skills, and Knowledge.</div>
            </div>
            {!isAdmin && <Check size={13} className="text-success shrink-0 mt-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => { onChange(true); setOpen(false); }}
            className={`w-full flex items-start justify-between gap-2 text-left px-3 py-2.5 rounded-lg transition-base hover:bg-surface-muted ${isAdmin ? "bg-[hsl(var(--warning-soft))]" : ""}`}
          >
            <div className="min-w-0">
              <div className={`text-sm font-medium flex items-center gap-1.5 ${isAdmin ? "text-warning" : "text-foreground"}`}>
                <Crown size={12} /> Admin
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Also approves Agents, Skills, and Knowledge published into this unit — and every unit nested below it.
              </div>
            </div>
            {isAdmin && <Check size={13} className="text-warning shrink-0 mt-0.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Delete confirmation (popup, reused for units and members) ────────── */
// `blocked` turns this into an info-only "cannot delete" dialog (single "Got it" button,
// no destructive action) — used when a unit still has members/child units (rule: unit must
// be emptied first, no cascade-delete).
function ConfirmDeleteModal({
  title, desc, confirmLabel, onClose, onConfirm, blocked,
}: {
  title: string; desc: string; confirmLabel: string; onClose: () => void; onConfirm: () => void; blocked?: boolean;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] sm:w-[420px] bg-white rounded-2xl shadow-2xl p-6" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        <div className="flex items-start gap-3 mb-6">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${blocked ? "bg-warning-soft text-warning" : "bg-destructive-soft text-destructive"}`}>
            <Trash2 size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{desc}</p>
          </div>
        </div>
        {blocked ? (
          <div className="flex items-center justify-end">
            <button onClick={onClose} className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base">
              Got it
            </button>
          </div>
        ) : (
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
            Cancel
          </button>
          <button onClick={onConfirm} className="h-9 px-4 rounded-xl bg-destructive text-white text-sm font-medium hover:opacity-90 transition-base">
            {confirmLabel}
          </button>
        </div>
        )}
      </div>
      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}

/* ─── Assign-admin popover — pick a member of this unit who isn't already an admin ─── */
function AssignAdminPopover({
  candidates, onAssign,
}: {
  candidates: OrgMember[];
  onAssign: (memberId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query ? candidates.filter(m => m.name.toLowerCase().includes(query)) : candidates;

  return (
    <div
      className="relative"
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        disabled={candidates.length === 0}
        title={candidates.length === 0 ? "Every member of this unit is already an admin" : undefined}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-glow transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-primary shrink-0"
      >
        <Plus size={12} /> Assign admin
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] w-64 max-h-72 bg-surface rounded-xl ring-1 ring-border shadow-xl z-50 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search members…"
                className="ds-input pl-7 h-8 text-sm"
              />
            </div>
          </div>
          <div className="overflow-y-auto p-1">
            {filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onAssign(m.id); setOpen(false); setQ(""); }}
                className="w-full flex items-center gap-2.5 text-left py-2 px-2 rounded-lg text-sm hover:bg-surface-muted transition-base"
              >
                <div className="w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[9px] font-semibold shrink-0">
                  {m.initials}
                </div>
                <span className="truncate">{m.name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">No eligible members.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgStructureExplorer() {
  const { tree, rootId, addMember, removeMember, setUnitAdmin } = useOrg();
  const { roles } = useRoles();
  const [selectedId, setSelectedId] = useState(rootId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([tree.id, ...tree.units.map(u => u.id)]));
  const [treeQuery, setTreeQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const MEMBER_PAGE_SIZE = 10;
  const [showAddMember, setShowAddMember] = useState(false);
  const [movingMember, setMovingMember] = useState<OrgMember | null>(null);
  const [deleteConfirmMemberId, setDeleteConfirmMemberId] = useState<string | null>(null);

  const allEmails = useMemo(
    () => collectMembers(tree).map(m => (m.email ?? "").trim().toLowerCase()).filter(Boolean),
    [tree]
  );
  const path = useMemo(() => findPath(tree, selectedId) ?? [tree], [tree, selectedId]);
  const selected = path[path.length - 1];
  const deleteTargetMember = deleteConfirmMemberId ? selected.members.find(m => m.id === deleteConfirmMemberId) ?? null : null;

  // Approval rights are one-way inheritable: a Unit Admin assigned on an ancestor unit can also
  // approve here, but a Unit Admin assigned here can't approve on ancestors. Walking `path` (root
  // → selected) and collecting each unit's own unitAdminIds gives exactly that effective set.
  const effectiveAdmins = path.flatMap(u =>
    (u.unitAdminIds ?? [])
      .map(id => ({ member: u.members.find(m => m.id === id), sourceUnit: u }))
      .filter((x): x is { member: OrgMember; sourceUnit: OrgUnit } => !!x.member)
  );

  const selectUnit = (id: string) => {
    setSelectedId(id);
    setMemberQuery("");
    setMemberPage(1);
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

  const filteredMembers = selected.members.filter(m => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
  });
  useEffect(() => { setMemberPage(1); }, [memberQuery]);
  const memberTotalPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBER_PAGE_SIZE));
  const memberCurrentPage = Math.min(memberPage, memberTotalPages);
  const shownFilteredMembers = filteredMembers.slice(
    (memberCurrentPage - 1) * MEMBER_PAGE_SIZE,
    memberCurrentPage * MEMBER_PAGE_SIZE
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-5">
      {showAddMember && (
        <MemberModal
          title="Invite member"
          desc={`Invite someone new to join ${selected.name}.`}
          roles={roles}
          submitLabel="Invite member"
          onClose={() => setShowAddMember(false)}
          onSave={(name, email, roleId) => addMember(selected.id, name, email, roleId)}
          existingEmails={allEmails}
          unitName={selected.name}
        />
      )}
      {movingMember && (
        <MoveMemberModal member={movingMember} currentUnitId={selected.id} onClose={() => setMovingMember(null)} />
      )}
      {deleteTargetMember && (
        <ConfirmDeleteModal
          title={`Remove "${deleteTargetMember.name}"?`}
          desc="This person will be removed from the unit. This action can't be undone."
          confirmLabel="Remove member"
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
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-surface-muted border border-border text-muted-foreground shrink-0">
            <Users size={12} /> {countAll(selected)} people
          </span>
        </div>

        {/* Unit Admins — who can currently approve publishes into this unit, direct + inherited */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Unit Admins ({effectiveAdmins.length})
            </div>
            <AssignAdminPopover
              candidates={selected.members.filter(m => !(selected.unitAdminIds ?? []).includes(m.id))}
              onAssign={memberId => setUnitAdmin(selected.id, memberId, true)}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Unit Admins can approve Agents, Skills, and Knowledge published into this unit and every unit nested below it.
          </p>
          {effectiveAdmins.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-4 text-center">
              No unit admins yet — assign one above.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {effectiveAdmins.map(({ member, sourceUnit }) => (
                <div
                  key={`${sourceUnit.id}-${member.id}`}
                  className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-[hsl(var(--warning-soft))] ring-1 ring-warning/20"
                >
                  <div className="w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[9px] font-semibold shrink-0">
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate leading-tight">{member.name}</div>
                    {sourceUnit.id !== selected.id && (
                      <div className="text-[10px] text-muted-foreground truncate leading-tight">via {sourceUnit.name}</div>
                    )}
                  </div>
                  <Crown size={12} className="text-warning shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sub-units */}
        <div className="mb-8 pt-6 border-t border-border">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Unit ({selected.units.length})
          </div>
          {selected.units.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-6 text-center">
              No units yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selected.units.map(u => {
                const preview = u.members.slice(0, 3);
                const previewExtra = countAll(u) - preview.length;
                return (
                  <button
                    key={u.id}
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
                );
              })}
            </div>
          )}
        </div>

        {/* Direct members */}
        <div className="pt-6 border-t border-border">
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
                <Plus size={12} /> Invite member
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
              No direct members in this unit yet.
            </div>
          ) : (
            <>
              <div className="border-t border-border divide-y divide-border">
                {shownFilteredMembers.map(m => {
                  const isUnitAdmin = (selected.unitAdminIds ?? []).includes(m.id);
                  return (
                  <div key={m.id} className="flex items-center gap-3 py-2.5 hover:bg-surface-muted/60 transition-base group/row">
                    <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {m.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-medium truncate">{m.name}</span>
                        {m.inactive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive-soft text-destructive font-medium shrink-0">Inactive</span>
                        )}
                      </div>
                      {m.email && <div className="text-xs text-muted-foreground truncate">{m.email}</div>}
                    </div>
                    <MemberTypeCell
                      memberName={m.name}
                      isAdmin={isUnitAdmin}
                      onChange={isAdmin => setUnitAdmin(selected.id, m.id, isAdmin)}
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMovingMember(m)}
                        aria-label={`Move ${m.name} to another unit`}
                        title="Move to another unit"
                        className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                      >
                        <FolderInput size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmMemberId(m.id)}
                        aria-label={`Remove ${m.name}`}
                        className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">No results.</div>
                )}
              </div>
              {memberTotalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    Page {memberCurrentPage}/{memberTotalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                      disabled={memberCurrentPage === 1}
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberPage(p => Math.min(memberTotalPages, p + 1))}
                      disabled={memberCurrentPage === memberTotalPages}
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
