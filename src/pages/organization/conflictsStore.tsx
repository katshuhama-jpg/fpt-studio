import { createContext, useContext, useState, ReactNode } from "react";

export type ConflictType = "member_unit_mismatch" | "duplicate_unit_name" | "member_removed_source";
export type ConflictStatus = "open" | "resolved";

export type MemberUnitMismatchConflict = {
  id: string;
  type: "member_unit_mismatch";
  status: ConflictStatus;
  detectedAt: string;
  reason: string;
  resolution?: string;
  memberId: string;
  currentUnitId: string;
  syncedUnitId: string;
};

export type DuplicateUnitNameConflict = {
  id: string;
  type: "duplicate_unit_name";
  status: ConflictStatus;
  detectedAt: string;
  reason: string;
  resolution?: string;
  existingUnitId: string;
  incomingUnitName: string;
  incomingParentUnitId: string;
};

export type MemberRemovedSourceConflict = {
  id: string;
  type: "member_removed_source";
  status: ConflictStatus;
  detectedAt: string;
  reason: string;
  resolution?: string;
  memberId: string;
};

export type Conflict = MemberUnitMismatchConflict | DuplicateUnitNameConflict | MemberRemovedSourceConflict;

/**
 * Mock output of a sync-diff run between the last Auto Sync payload from FPT Identity
 * and the data currently managed in Agent Console (manually, or from an earlier sync).
 * In a real system this list would be produced server-side after every sync run;
 * here it's seeded once to demonstrate the review + resolve flow end to end.
 */
const SEED_CONFLICTS: Conflict[] = [
  {
    id: "conflict-1",
    type: "member_unit_mismatch",
    status: "open",
    detectedAt: "08:00, 13/08/2026",
    reason: 'FPT Identity shows this member moved units on 10/08/2026, but Agent Console hasn\'t been updated yet.',
    memberId: "m-plat-1",
    currentUnitId: "fsoft-vn-platform",
    syncedUnitId: "fsoft-vn-aiml",
  },
  {
    id: "conflict-2",
    type: "duplicate_unit_name",
    status: "open",
    detectedAt: "08:00, 13/08/2026",
    reason: 'FPT Identity sent back a unit with the same name but under a different branch of the org — could be two different teams that happen to share a name, or the same team declared in two places.',
    existingUnitId: "fsc-infra",
    incomingUnitName: "Cloud Infrastructure",
    incomingParentUnitId: "ftel-it",
  },
  {
    id: "conflict-3",
    type: "member_removed_source",
    status: "open",
    detectedAt: "08:00, 13/08/2026",
    reason: 'FPT Identity no longer sees this member in the HR system (account deactivated on 12/08/2026), but they\'re still Active in Agent Console.',
    memberId: "m-plat-2",
  },
];

type ConflictsContextValue = {
  conflicts: Conflict[];
  resolveConflict: (id: string, resolution: string) => void;
};

const ConflictsContext = createContext<ConflictsContextValue | null>(null);

export function ConflictsProvider({ children }: { children: ReactNode }) {
  const [conflicts, setConflicts] = useState<Conflict[]>(SEED_CONFLICTS);

  const resolveConflict = (id: string, resolution: string) => {
    setConflicts(prev => prev.map(c => (c.id === id ? { ...c, status: "resolved", resolution } : c)));
  };

  return <ConflictsContext.Provider value={{ conflicts, resolveConflict }}>{children}</ConflictsContext.Provider>;
}

export function useConflicts(): ConflictsContextValue {
  const ctx = useContext(ConflictsContext);
  if (!ctx) throw new Error("useConflicts must be used within a ConflictsProvider");
  return ctx;
}
