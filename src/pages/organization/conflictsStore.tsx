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
 * and the data currently managed in Agent Studio (manually, or from an earlier sync).
 * In a real system this list would be produced server-side after every sync run;
 * here it's seeded once to demonstrate the review + resolve flow end to end.
 */
const SEED_CONFLICTS: Conflict[] = [
  {
    id: "conflict-1",
    type: "member_unit_mismatch",
    status: "open",
    detectedAt: "08:00, 13/08/2026",
    reason: 'FPT Identity ghi nhận thành viên đã chuyển unit từ 10/08/2026, nhưng Agent Studio chưa được cập nhật.',
    memberId: "m-plat-1",
    currentUnitId: "fsoft-vn-platform",
    syncedUnitId: "fsoft-vn-aiml",
  },
  {
    id: "conflict-2",
    type: "duplicate_unit_name",
    status: "open",
    detectedAt: "08:00, 13/08/2026",
    reason: 'FPT Identity gửi về một unit cùng tên nhưng thuộc nhánh tổ chức khác — có thể là 2 team khác nhau đặt trùng tên, hoặc cùng một team bị khai báo 2 nơi.',
    existingUnitId: "fsc-infra",
    incomingUnitName: "Cloud Infrastructure",
    incomingParentUnitId: "ftel-it",
  },
  {
    id: "conflict-3",
    type: "member_removed_source",
    status: "open",
    detectedAt: "08:00, 13/08/2026",
    reason: 'FPT Identity không còn ghi nhận thành viên này trong hệ thống nhân sự (tài khoản bị vô hiệu hóa ngày 12/08/2026), nhưng vẫn đang Active trong Agent Studio.',
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
