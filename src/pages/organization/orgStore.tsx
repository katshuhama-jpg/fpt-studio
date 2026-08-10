import { createContext, useContext, useState, ReactNode } from "react";
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
  addMember: (unitId: string, name: string, email: string) => void;
  updateMember: (memberId: string, name: string, email: string) => void;
  removeMember: (memberId: string) => void;
};

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
      const updated = updateUnit(prev, unitId, () => null);
      return updated ?? prev;
    });
  };

  const addMember = (unitId: string, name: string, title: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const trimmedTitle = title.trim();
    setTree(prev => {
      const updated = updateUnit(prev, unitId, unit => ({
        ...unit,
        members: [
          ...unit.members,
          { id: nextId("member"), name: trimmedName, role: trimmedTitle, initials: deriveInitials(trimmedName) },
        ],
      }));
      return updated ?? prev;
    });
  };

  const updateMember = (memberId: string, name: string, title: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const trimmedTitle = title.trim();
    setTree(prev =>
      updateMemberOwner(prev, memberId, members =>
        members.map(m =>
          m.id === memberId
            ? { ...m, name: trimmedName, role: trimmedTitle, initials: deriveInitials(trimmedName) }
            : m
        )
      )
    );
  };

  const removeMember = (memberId: string) => {
    setTree(prev => updateMemberOwner(prev, memberId, members => members.filter(m => m.id !== memberId)));
  };

  return (
    <OrgContext.Provider value={{ tree, rootId: ROOT_ID, createUnit, renameUnit, deleteUnit, addMember, updateMember, removeMember }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within an OrgProvider");
  return ctx;
}
