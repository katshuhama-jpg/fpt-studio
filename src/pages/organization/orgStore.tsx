import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUser } from "@/lib/onboarding";
import { OrgUnit, OrgMember, ApprovalResource, findUnit, orgTree as SEED_TREE } from "./orgData";
import { getCurrentTenantId, subscribeTenantChange, markOrgConfigured, isOrgConfigured as isTenantOrgConfigured, isSeedTenant } from "@/lib/spaceStore";

/** A brand-new Space starts with an empty Organization — a single root unit named after the
 * Space, no members, no sub-units — until its assigned Org Admin runs the Organization setup
 * wizard (`completeOrgSetup` below), which is always built by hand from there (no Azure AD or
 * other auto-sync option). This is what "org rỗng" (empty Org) for a new Space means. */
function emptyOrgTreeFor(tenantId: string): OrgUnit {
  return { id: `root-${tenantId}`, name: "Tổ chức mới", members: [], units: [] };
}

/** Which Organization tree is shown depends on the ACTIVE Space: FPT's existing seed Spaces
 * keep their long-standing seeded tree (untouched); any newly-created Space starts empty. */
function initialTreeFor(tenantId: string): OrgUnit {
  return isSeedTenant(tenantId) ? SEED_TREE : emptyOrgTreeFor(tenantId);
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/** First letter of first word + first letter of last word, uppercased. */
export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Placeholder display name derived from an email's local part (e.g. "mai.hoang@fpt.com" -> "Mai Hoang"), used when inviting someone without asking for their name up front. */
export function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return "New member";
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

/**
 * Rebuilds the tree, replacing the unit with id `unitId` via `updater`.
 * `updater` returns the new unit, or `null` to delete it (and its whole subtree).
 * Only nodes on the path from root to the target are cloned — untouched
 * siblings/subtrees keep their original object identity.
 */
function updateUnit(
  node: OrgUnit,
  unitId: string,
  updater: (unit: OrgUnit) => OrgUnit | null
): OrgUnit | null {
  if (node.id === unitId) return updater(node);

  let changed = false;
  const nextUnits: OrgUnit[] = [];
  for (const child of node.units) {
    const result = updateUnit(child, unitId, updater);
    if (result !== child) changed = true;
    if (result !== null) nextUnits.push(result);
  }
  if (!changed) return node;
  return { ...node, units: nextUnits };
}

/**
 * Walks `segments` starting at `unit`, creating any missing unit along the way as a new direct
 * child of wherever the existing path runs out — used by CSV import ("Unit" column) so a path
 * like "Sales/Team North" creates "Sales" under `unit` first (if missing), then "Team North"
 * inside that. Returns the updated `unit` subtree plus the id of the final (existing or freshly
 * created) unit that members should be added into.
 */
function ensureUnitPath(unit: OrgUnit, segments: string[]): { unit: OrgUnit; targetId: string } {
  if (segments.length === 0) return { unit, targetId: unit.id };
  const [head, ...rest] = segments;
  const trimmedHead = head.trim();
  if (!trimmedHead) return ensureUnitPath(unit, rest);
  const existing = unit.units.find(u => u.name.toLowerCase() === trimmedHead.toLowerCase());
  if (existing) {
    const { unit: updatedChild, targetId } = ensureUnitPath(existing, rest);
    return {
      unit: { ...unit, units: unit.units.map(u => (u.id === existing.id ? updatedChild : u)) },
      targetId,
    };
  }
  const created: OrgUnit = { id: nextId("unit"), name: trimmedHead, members: [], units: [] };
  const { unit: updatedCreated, targetId } = ensureUnitPath(created, rest);
  return { unit: { ...unit, units: [...unit.units, updatedCreated] }, targetId };
}

/**
 * Rebuilds the tree, applying `fn` to whichever unit's `members` array
 * directly contains `memberId`.
 */
function updateMemberOwner(
  node: OrgUnit,
  memberId: string,
  fn: (members: OrgMember[]) => OrgMember[]
): OrgUnit {
  if (node.members.some(m => m.id === memberId)) {
    return { ...node, members: fn(node.members) };
  }
  let changed = false;
  const nextUnits = node.units.map(child => {
    const updated = updateMemberOwner(child, memberId, fn);
    if (updated !== child) changed = true;
    return updated;
  });
  if (!changed) return node;
  return { ...node, units: nextUnits };
}

/** The Org profile fields collected by the setup wizard (Tổng quan / General beyond just the
 * tree's root name) — kept alongside the tree, per Space, rather than on the Tenant record in
 * spaceStore.ts, since these are Organization details, not Space/plan details. */
export type OrgProfile = { description?: string; logoDataUrl?: string };

type OrgContextValue = {
  tree: OrgUnit;
  rootId: string;
  /** False only for a freshly-created Space, until its Tenant Admin completes the
   * Organization setup wizard — drives `RequireOrgConfigured` in App.tsx. */
  isConfigured: boolean;
  orgProfile: OrgProfile;
  createUnit: (parentId: string, name: string) => void;
  renameUnit: (unitId: string, name: string) => void;
  deleteUnit: (unitId: string) => void;
  addMember: (unitId: string, name: string, email: string, roleId?: string) => void;
  updateMember: (memberId: string, name: string, email: string, roleId?: string) => void;
  assignRole: (memberId: string, roleId: string | undefined) => void;
  removeMember: (memberId: string) => void;
  /** Moves a member from wherever they currently sit to a different unit — used by conflict resolution ("apply Auto Sync's unit assignment"). */
  moveMember: (memberId: string, targetUnitId: string) => void;
  /** Marks a member Active/Inactive without removing them — used when Auto Sync no longer sees the person in the source system but an admin wants to keep the audit trail instead of hard-deleting. */
  setMemberInactive: (memberId: string, inactive: boolean) => void;
  /**
   * Sets `memberId`'s Unit Admin approval scope on `unitId` (who must be a direct member of
   * that unit) to exactly `scope` — replacing whatever scope they had before. Passing an empty
   * array removes the grant entirely (demotes them back to a plain Member). Approval rights
   * cascade down to every nested unit, never upward.
   */
  setUnitAdminScope: (unitId: string, memberId: string, scope: ApprovalResource[]) => void;
  /**
   * Completes the Organization setup wizard for the ACTIVE (new) Space: names the root unit
   * after the Org, stores its profile, and marks the Space configured. The tree is left at just
   * the (renamed) empty root — every Space's Company/Department/Group structure is always built
   * by hand from here on the Structure page (there is no Azure AD or other auto-sync option).
   */
  completeOrgSetup: (input: { name: string; description?: string; logoDataUrl?: string }) => void;
  /**
   * Bulk-imports members from a CSV — used by ImportMembersModal. Each entry's `unitPath` is
   * relative to `anchorUnitId` (empty path = add directly into the anchor); any unit along that
   * path that doesn't exist yet is created, nested exactly as given, in the SAME pass so two
   * entries sharing a not-yet-created path land in one new unit rather than each creating their
   * own copy. Everyone imported gets the "viewer" role — promote them afterward from
   * Members/Structure like any other member.
   */
  importMembers: (anchorUnitId: string, entries: { name: string; email: string; unitPath: string[] }[]) => void;
};

function removeMemberFromTree(node: OrgUnit, memberId: string): { tree: OrgUnit; removed: OrgMember | null } {
  const direct = node.members.find(m => m.id === memberId);
  if (direct) {
    return { tree: { ...node, members: node.members.filter(m => m.id !== memberId) }, removed: direct };
  }
  let removed: OrgMember | null = null;
  let changed = false;
  const nextUnits = node.units.map(child => {
    if (removed) return child;
    const result = removeMemberFromTree(child, memberId);
    if (result.removed) {
      removed = result.removed;
      changed = true;
      return result.tree;
    }
    return child;
  });
  if (!changed) return { tree: node, removed: null };
  return { tree: { ...node, units: nextUnits }, removed };
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState(getCurrentTenantId());
  const [treesByTenant, setTreesByTenant] = useState<Record<string, OrgUnit>>({});
  const [configuredByTenant, setConfiguredByTenant] = useState<Record<string, boolean>>({});
  const [profilesByTenant, setProfilesByTenant] = useState<Record<string, OrgProfile>>({});

  // Re-sync when the active Space changes — OrgProvider is mounted above the router, so it
  // can't rely on route props for this; spaceStore's tiny pub-sub fills that gap.
  useEffect(() => subscribeTenantChange(() => setTenantId(getCurrentTenantId())), []);

  const tree = treesByTenant[tenantId] ?? initialTreeFor(tenantId);
  // Local state wins once set this session; otherwise fall back to spaceStore's persisted flag
  // (true for every Space except the pending one, until its setup wizard completes).
  const isConfigured = configuredByTenant[tenantId] ?? isTenantOrgConfigured(tenantId);
  const orgProfile = profilesByTenant[tenantId] ?? {};

  const setTree = (updater: (prev: OrgUnit) => OrgUnit) => {
    setTreesByTenant(prev => {
      const current = prev[tenantId] ?? initialTreeFor(tenantId);
      return { ...prev, [tenantId]: updater(current) };
    });
  };

  const createUnit = (parentId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTree(prev => {
      const updated = updateUnit(prev, parentId, unit => ({
        ...unit,
        units: [...unit.units, { id: nextId("unit"), name: trimmed, members: [], units: [] }],
      }));
      return updated ?? prev;
    });
  };

  const renameUnit = (unitId: string, name: string) => {
    const trimmed = name.trim();
    setTree(prev => {
      if (!trimmed || unitId === prev.id) return prev;
      const updated = updateUnit(prev, unitId, unit => ({ ...unit, name: trimmed }));
      return updated ?? prev;
    });
  };

  const deleteUnit = (unitId: string) => {
    setTree(prev => {
      if (unitId === prev.id) return prev;
      const updated = updateUnit(prev, unitId, unit => {
        // Defensive guard — the UI already blocks this via ConfirmDeleteModal's `blocked` state,
        // but never allow a non-empty unit to be deleted even if called directly.
        if (unit.members.length > 0 || unit.units.length > 0) return unit;
        return null;
      });
      return updated ?? prev;
    });
  };

  const addMember = (unitId: string, name: string, email: string, roleId?: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const trimmedEmail = email.trim();
    const invitedBy = { name: "Tran Nam", email: getUser()?.email || "tran.nam@fpt.com" };
    setTree(prev => {
      const updated = updateUnit(prev, unitId, unit => ({
        ...unit,
        members: [
          ...unit.members,
          {
            id: nextId("member"),
            name: trimmedName,
            role: "",
            email: trimmedEmail,
            initials: deriveInitials(trimmedName),
            roleId,
            invitedBy,
            joinedAt: new Date().toISOString(),
          },
        ],
      }));
      return updated ?? prev;
    });
  };

  const updateMember = (memberId: string, name: string, email: string, roleId?: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const trimmedEmail = email.trim();
    setTree(prev =>
      updateMemberOwner(prev, memberId, members =>
        members.map(m =>
          m.id === memberId
            ? { ...m, name: trimmedName, email: trimmedEmail, initials: deriveInitials(trimmedName), roleId }
            : m
        )
      )
    );
  };

  const assignRole = (memberId: string, roleId: string | undefined) => {
    setTree(prev => updateMemberOwner(prev, memberId, members => members.map(m => (m.id === memberId ? { ...m, roleId } : m))));
  };

  const removeMember = (memberId: string) => {
    setTree(prev => updateMemberOwner(prev, memberId, members => members.filter(m => m.id !== memberId)));
  };

  const moveMember = (memberId: string, targetUnitId: string) => {
    setTree(prev => {
      const { tree: stripped, removed } = removeMemberFromTree(prev, memberId);
      if (!removed) return prev;
      const updated = updateUnit(stripped, targetUnitId, unit => ({ ...unit, members: [...unit.members, removed as OrgMember] }));
      return updated ?? stripped;
    });
  };

  const setMemberInactive = (memberId: string, inactive: boolean) => {
    setTree(prev => updateMemberOwner(prev, memberId, members => members.map(m => (m.id === memberId ? { ...m, inactive } : m))));
  };

  const setUnitAdminScope = (unitId: string, memberId: string, scope: ApprovalResource[]) => {
    setTree(prev => {
      const updated = updateUnit(prev, unitId, unit => {
        const withoutMember = (unit.unitAdmins ?? []).filter(a => a.memberId !== memberId);
        const next = scope.length > 0 ? [...withoutMember, { memberId, scope }] : withoutMember;
        return { ...unit, unitAdmins: next };
      });
      return updated ?? prev;
    });
  };

  const completeOrgSetup = ({ name, description, logoDataUrl }: { name: string; description?: string; logoDataUrl?: string }) => {
    const trimmedName = name.trim() || "Tổ chức mới";
    const activeTenantId = tenantId;
    setTreesByTenant(prev => {
      const rootIdForTenant = `root-${activeTenantId}`;
      const nextTree: OrgUnit = { id: rootIdForTenant, name: trimmedName, members: [], units: [] };
      return { ...prev, [activeTenantId]: nextTree };
    });
    setProfilesByTenant(prev => ({ ...prev, [activeTenantId]: { description, logoDataUrl } }));
    setConfiguredByTenant(prev => ({ ...prev, [activeTenantId]: true }));
    markOrgConfigured(activeTenantId);
  };

  const importMembers = (anchorUnitId: string, entries: { name: string; email: string; unitPath: string[] }[]) => {
    const invitedBy = { name: "Tran Nam", email: getUser()?.email || "tran.nam@fpt.com" };
    setTree(prev => {
      let working = prev;
      for (const entry of entries) {
        const trimmedName = entry.name.trim();
        if (!trimmedName) continue;
        let targetId = anchorUnitId;
        if (entry.unitPath.length > 0) {
          const anchor = findUnit(working, anchorUnitId);
          if (anchor) {
            const { unit: updatedAnchor, targetId: resolvedId } = ensureUnitPath(anchor, entry.unitPath);
            working = updateUnit(working, anchorUnitId, () => updatedAnchor) ?? working;
            targetId = resolvedId;
          }
        }
        working = updateUnit(working, targetId, unit => ({
          ...unit,
          members: [
            ...unit.members,
            {
              id: nextId("member"),
              name: trimmedName,
              role: "",
              email: entry.email.trim(),
              initials: deriveInitials(trimmedName),
              roleId: "viewer",
              invitedBy,
              joinedAt: new Date().toISOString(),
            },
          ],
        })) ?? working;
      }
      return working;
    });
  };

  return (
    <OrgContext.Provider
      value={{
        tree, rootId: tree.id, isConfigured, orgProfile,
        createUnit, renameUnit, deleteUnit, addMember, updateMember, assignRole, removeMember,
        moveMember, setMemberInactive, setUnitAdminScope, completeOrgSetup, importMembers,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within an OrgProvider");
  return ctx;
}
