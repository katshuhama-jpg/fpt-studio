import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUser } from "@/lib/onboarding";
import { OrgUnit, OrgMember, findUnit, collectMembers, findMemberUnit, findPath, orgTree as SEED_TREE } from "./orgData";
import { getCurrentTenantId, subscribeTenantChange, markOrgConfigured, isOrgConfigured as isTenantOrgConfigured, isSeedTenant, getAllTenants, isPersonalSpace, PERSONAL_SPACE_MEMBER_CAP } from "@/lib/spaceStore";
import { getConnectedOrgId, subscribeOrgConnectionChange } from "@/lib/orgConnectionStore";

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

/**
 * Resolves which key this Space's Organization content actually lives under (§10,
 * BRAINSTORM_Governance_OrgTenantPublishScope.md — Space and Org are independent entities,
 * connected only via an explicit Super Admin action):
 * - A Personal Space always edits its own local member list under its own key — it can never
 *   connect to an Org (§10.3 #2), so this is never "the Org", just that Space's own roster.
 * - An enterprise Space resolves to the Org a Super Admin has connected it to. The 4 seed/
 *   pending Spaces are auto-connected 1-1 to an Org sharing their own tenantId (§10.3 #4), so
 *   this returns their own id and their existing tree content is picked up unchanged.
 * - An enterprise Space with no connection yet resolves to a stable per-Space placeholder key
 *   (never a real Org id) so it safely renders an empty tree instead of colliding with one.
 */
function resolveOrgKey(tenantId: string): string {
  if (isPersonalSpace(tenantId)) return tenantId;
  return getConnectedOrgId(tenantId) ?? `__unconnected__:${tenantId}`;
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
export type OrgProfile = {
  description?: string;
  logoDataUrl?: string;
  /** Segment after "app.fptai.com/" in the Org's sign-in URL — editable from General by an
   * Org Admin or Space (Tenant) Admin, same as name/logo/description below. */
  urlSlug?: string;
  /** Default UI language shown to new members of this Org until they pick their own. */
  defaultLanguage?: string;
};

/** One membership record: which unit, in which Org/Space (Tenant), a given email currently sits
 * in — used to surface "this person already exists elsewhere" across units and across orgs, now
 * that one email can belong to several units and/or several orgs at once. */
export type OrgMembershipRef = {
  tenantId: string;
  tenantName: string;
  unitId: string;
  unitName: string;
  /** Breadcrumb from that org's root down to the unit, e.g. "FPT Software / Phòng Kinh doanh". */
  unitPath: string;
};

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
  /**
   * Adds one member directly into `unitId`. A Personal Space stops accepting new members once
   * it holds `PERSONAL_SPACE_MEMBER_CAP` — returns `{ ok: false, reason: "personal_space_cap" }`
   * instead of adding anyone past that (existing over-cap Personal Spaces are grandfathered:
   * this only blocks going higher from here, see spaceStore.ts).
   */
  addMember: (unitId: string, name: string, email: string, roleId?: string) => { ok: boolean; reason?: "personal_space_cap" };
  updateMember: (memberId: string, name: string, email: string, roleId?: string) => void;
  assignRole: (memberId: string, roleId: string | undefined) => void;
  removeMember: (memberId: string) => void;
  /** Moves a member from wherever they currently sit to a different unit — used by conflict resolution ("apply Auto Sync's unit assignment"). */
  moveMember: (memberId: string, targetUnitId: string) => void;
  /** Marks a member Active/Inactive without removing them — used when Auto Sync no longer sees the person in the source system but an admin wants to keep the audit trail instead of hard-deleting. */
  setMemberInactive: (memberId: string, inactive: boolean) => void;
  /**
   * Makes `memberId` (who must be a direct member of `unitId`) a Unit Admin there when
   * `isAdmin` is true, or demotes them back to a plain Member when false. A Unit Admin can
   * approve Agent publish requests in `unitId` and every unit nested below it, never upward.
   */
  setUnitAdmin: (unitId: string, memberId: string, isAdmin: boolean) => void;
  /**
   * Completes the Organization setup wizard for the ACTIVE (new) Space: names the root unit
   * after the Org, stores its profile, and marks the Space configured. The tree is left at just
   * the (renamed) empty root — every Space's Company/Department/Group structure is always built
   * by hand from here on the Structure page (there is no Azure AD or other auto-sync option).
   */
  completeOrgSetup: (input: { name: string; description?: string; logoDataUrl?: string }) => void;
  /**
   * Edits the Organization's own profile from General — name (renames the root unit,
   * unlike `renameUnit` which refuses the root), logo, description, URL slug and default
   * language. Available to an Org Admin or Space (Tenant) Admin, seed Spaces included —
   * General is no longer view-only for anyone.
   */
  updateOrgProfile: (input: { name: string; description?: string; logoDataUrl?: string; urlSlug?: string; defaultLanguage?: string }) => void;
  /**
   * Bulk-imports members from a CSV — used by ImportMembersModal. Each entry's `unitPath` is
   * relative to `anchorUnitId` (empty path = add directly into the anchor); any unit along that
   * path that doesn't exist yet is created, nested exactly as given, in the SAME pass so two
   * entries sharing a not-yet-created path land in one new unit rather than each creating their
   * own copy. Everyone imported gets the "viewer" role — promote them afterward from
   * Members/Structure like any other member.
   *
   * In a Personal Space, only imports up to `PERSONAL_SPACE_MEMBER_CAP` total — any entries
   * past that are skipped (not partially created), and the returned `skipped` count tells the
   * caller how many to report back to the person importing.
   */
  importMembers: (anchorUnitId: string, entries: { name: string; email: string; unitPath: string[] }[]) => { imported: number; skipped: number };
  /**
   * Every membership record for `email` (case-insensitive) across EVERY Space/Org this prototype
   * knows about, current org included — one member can now sit in several units within the same
   * org, and/or hold separate memberships in different orgs entirely (each org's admin invites
   * independently, the same way a person joins several separate Slack workspaces with one email).
   * Used to show an informational note instead of blocking, wherever an email that's about to be
   * invited/imported already has a membership somewhere.
   */
  findMembershipsByEmail: (email: string) => OrgMembershipRef[];
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
  const [treesByOrgKey, setTreesByOrgKey] = useState<Record<string, OrgUnit>>({});
  const [configuredByOrgKey, setConfiguredByOrgKey] = useState<Record<string, boolean>>({});
  const [profilesByOrgKey, setProfilesByOrgKey] = useState<Record<string, OrgProfile>>({});
  // Bumped to force a re-render when a Super Admin connects/disconnects a Space elsewhere in
  // the app — orgKey below depends on that connection, so a stale render would keep showing
  // whatever Org (or lack of one) was resolved before the change.
  const [, forceUpdate] = useState(0);

  // Re-sync when the active Space changes — OrgProvider is mounted above the router, so it
  // can't rely on route props for this; spaceStore's tiny pub-sub fills that gap.
  useEffect(() => subscribeTenantChange(() => setTenantId(getCurrentTenantId())), []);
  useEffect(() => subscribeOrgConnectionChange(() => forceUpdate(n => n + 1)), []);

  // §10: Space and Org are independent entities — orgKey is the Org actually connected to the
  // active Space (or the Space's own key, for a Personal Space's local member list). hasOrg is
  // false only for an enterprise Space no Super Admin has connected to an Org yet — Structure/
  // Members/General show an empty, unconfigured state for it instead of a real Org's content.
  const orgKey = resolveOrgKey(tenantId);
  const hasOrg = isPersonalSpace(tenantId) || getConnectedOrgId(tenantId) !== null;

  const tree = treesByOrgKey[orgKey] ?? initialTreeFor(orgKey);
  // Local state wins once set this session; otherwise fall back to spaceStore's persisted flag
  // (true for every Space except the pending one, until its setup wizard completes).
  const isConfigured = hasOrg && (configuredByOrgKey[orgKey] ?? isTenantOrgConfigured(orgKey));
  const orgProfile: OrgProfile = profilesByOrgKey[orgKey] ?? (
    isSeedTenant(orgKey) ? { urlSlug: "fpt-corp", defaultLanguage: "Vietnamese" } : {}
  );

  const setTree = (updater: (prev: OrgUnit) => OrgUnit) => {
    setTreesByOrgKey(prev => {
      const current = prev[orgKey] ?? initialTreeFor(orgKey);
      return { ...prev, [orgKey]: updater(current) };
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

  const addMember = (unitId: string, name: string, email: string, roleId?: string): { ok: boolean; reason?: "personal_space_cap" } => {
    const trimmedName = name.trim();
    if (!trimmedName) return { ok: false };
    if (isPersonalSpace(tenantId) && collectMembers(tree).length >= PERSONAL_SPACE_MEMBER_CAP) {
      return { ok: false, reason: "personal_space_cap" };
    }
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
    return { ok: true };
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

  const setUnitAdmin = (unitId: string, memberId: string, isAdmin: boolean) => {
    setTree(prev => {
      const updated = updateUnit(prev, unitId, unit => {
        const withoutMember = (unit.unitAdmins ?? []).filter(a => a.memberId !== memberId);
        const next = isAdmin ? [...withoutMember, { memberId }] : withoutMember;
        return { ...unit, unitAdmins: next };
      });
      return updated ?? prev;
    });
  };

  const updateOrgProfile = (input: { name: string; description?: string; logoDataUrl?: string; urlSlug?: string; defaultLanguage?: string }) => {
    const trimmedName = input.name.trim();
    const activeOrgKey = orgKey;
    // Rename the root unit directly — `renameUnit` refuses to touch the root on purpose (it's
    // the "delete/rename a unit" affordance, not "rename my Org"), so General goes straight to
    // the tree instead of routing through it.
    if (trimmedName) {
      setTreesByOrgKey(prev => {
        const current = prev[activeOrgKey] ?? initialTreeFor(activeOrgKey);
        return { ...prev, [activeOrgKey]: { ...current, name: trimmedName } };
      });
    }
    setProfilesByOrgKey(prev => ({
      ...prev,
      [activeOrgKey]: {
        ...prev[activeOrgKey],
        description: input.description?.trim() || undefined,
        logoDataUrl: input.logoDataUrl,
        urlSlug: input.urlSlug?.trim() || undefined,
        defaultLanguage: input.defaultLanguage,
      },
    }));
  };

  const completeOrgSetup = ({ name, description, logoDataUrl }: { name: string; description?: string; logoDataUrl?: string }) => {
    const trimmedName = name.trim() || "Tổ chức mới";
    const activeOrgKey = orgKey;
    setTreesByOrgKey(prev => {
      const rootIdForOrg = `root-${activeOrgKey}`;
      const nextTree: OrgUnit = { id: rootIdForOrg, name: trimmedName, members: [], units: [] };
      return { ...prev, [activeOrgKey]: nextTree };
    });
    setProfilesByOrgKey(prev => ({ ...prev, [activeOrgKey]: { description, logoDataUrl } }));
    setConfiguredByOrgKey(prev => ({ ...prev, [activeOrgKey]: true }));
    markOrgConfigured(activeOrgKey);
  };

  const importMembers = (anchorUnitId: string, entries: { name: string; email: string; unitPath: string[] }[]): { imported: number; skipped: number } => {
    const invitedBy = { name: "Tran Nam", email: getUser()?.email || "tran.nam@fpt.com" };
    // Personal Space: only take as many entries as still fit under the cap — the rest are
    // skipped outright rather than partially imported, so the caller can report one clear count.
    const capApplies = isPersonalSpace(tenantId);
    const remainingSlots = capApplies ? Math.max(0, PERSONAL_SPACE_MEMBER_CAP - collectMembers(tree).length) : entries.length;
    const entriesToImport = capApplies ? entries.slice(0, remainingSlots) : entries;
    const skipped = entries.length - entriesToImport.length;
    setTree(prev => {
      let working = prev;
      for (const entry of entriesToImport) {
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
    return { imported: entriesToImport.length, skipped };
  };

  const findMembershipsByEmail = (email: string): OrgMembershipRef[] => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return [];
    const results: OrgMembershipRef[] = [];
    // Dedupe by resolved Org key — once an Org connects to several Spaces (§10.3 #1, not yet
    // exercised by any UI today but already possible in the data model), those Spaces would
    // otherwise report the same membership twice.
    const seenKeys = new Set<string>();
    for (const t of getAllTenants()) {
      const key = resolveOrgKey(t.id);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const tTree = treesByOrgKey[key] ?? initialTreeFor(key);
      for (const m of collectMembers(tTree)) {
        if ((m.email ?? "").trim().toLowerCase() !== normalized) continue;
        const unit = findMemberUnit(tTree, m.id);
        if (!unit) continue;
        const path = findPath(tTree, unit.id) ?? [unit];
        results.push({
          tenantId: t.id,
          tenantName: t.name,
          unitId: unit.id,
          unitName: unit.name,
          unitPath: path.map(u => u.name).join(" / "),
        });
      }
    }
    return results;
  };

  return (
    <OrgContext.Provider
      value={{
        tree, rootId: tree.id, isConfigured, orgProfile,
        createUnit, renameUnit, deleteUnit, addMember, updateMember, assignRole, removeMember,
        moveMember, setMemberInactive, setUnitAdmin, completeOrgSetup, updateOrgProfile, importMembers,
        findMembershipsByEmail,
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
