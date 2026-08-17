import { createContext, useContext, useState, ReactNode } from "react";
import { getUser } from "@/lib/onboarding";
import { OrgUnit, OrgMember, orgTree as SEED_TREE } from "./orgData";

const ROOT_ID = SEED_TREE.id;

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

type OrgContextValue = {
  tree: OrgUnit;
  rootId: string;
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
  /** Grants/revokes Unit Admin on `unitId` for `memberId` (who must be a direct member of that unit). Approval rights this grants cascade down to every nested unit, never upward. */
  setUnitAdmin: (unitId: string, memberId: string, isAdmin: boolean) => void;
};

/**
 * Removes memberId from wherever it lives in the tree, returning the pruned tree
 * plus the removed member object (or null if not found) — the counterpart to
 * updateUnit's insert-only semantics, needed so moveMember can relocate a member
 * across two different parents in one atomic tree rebuild.
 */
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
  const [tree, setTree] = useState<OrgUnit>(SEED_TREE);

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
    if (!trimmed || unitId === ROOT_ID) return;
    setTree(prev => {
      const updated = updateUnit(prev, unitId, unit => ({ ...unit, name: trimmed }));
      return updated ?? prev;
    });
  };

  const deleteUnit = (unitId: string) => {
    if (unitId === ROOT_ID) return;
    setTree(prev => {
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

  const setUnitAdmin = (unitId: string, memberId: string, isAdmin: boolean) => {
    setTree(prev => {
      const updated = updateUnit(prev, unitId, unit => {
        const current = unit.unitAdminIds ?? [];
        const next = isAdmin ? [...new Set([...current, memberId])] : current.filter(id => id !== memberId);
        return { ...unit, unitAdminIds: next };
      });
      return updated ?? prev;
    });
  };

  return (
    <OrgContext.Provider
      value={{ tree, rootId: ROOT_ID, createUnit, renameUnit, deleteUnit, addMember, updateMember, assignRole, removeMember, moveMember, setMemberInactive, setUnitAdmin }}
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
