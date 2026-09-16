// sessionStorage-backed audit trail for the Governance module — every submit/approve/reject/
// revoke action across all five resource types lands here, independent of the
// GovRequest record it came from, so the Audit Log page reads as an append-only history even
// after a request itself gets modified further. Written to exclusively by governanceStore.ts.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { GovResourceType } from "./governanceStore";

export type AuditAction = "submitted" | "approved" | "rejected" | "revoked";

export interface AuditEntry {
  id: string;
  at: number;
  actorId: string;
  actorName: string;
  action: AuditAction;
  resourceType: GovResourceType;
  resourceId: string;
  resourceName: string;
  requestId: string;
  note?: string;
}

const KEY = "governance_audit_log_v1";
const store = loadMap<string, AuditEntry>(KEY);
const persist = () => saveMap(KEY, store);
let seq = 1;

export const ACTION_LABEL: Record<AuditAction, string> = {
  submitted: "Đã gửi yêu cầu duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
  revoked: "Đã thu hồi",
};

export interface AuditFilter {
  actorId?: string;
  resourceType?: GovResourceType;
  resourceId?: string;
  from?: number;
  to?: number;
  query?: string;
}

export const auditLogStore = {
  log(entry: Omit<AuditEntry, "id"> & { id?: string }): AuditEntry {
    const e: AuditEntry = { ...entry, id: entry.id ?? `audit-${Date.now()}-${seq++}` };
    store.set(e.id, e);
    persist();
    return e;
  },

  list(filter: AuditFilter = {}): AuditEntry[] {
    let out = [...store.values()];
    if (filter.actorId) out = out.filter(e => e.actorId === filter.actorId);
    if (filter.resourceType) out = out.filter(e => e.resourceType === filter.resourceType);
    if (filter.resourceId) out = out.filter(e => e.resourceId === filter.resourceId);
    if (filter.from !== undefined) out = out.filter(e => e.at >= filter.from!);
    if (filter.to !== undefined) out = out.filter(e => e.at <= filter.to!);
    if (filter.query) {
      const q = filter.query.toLowerCase();
      out = out.filter(e => e.resourceName.toLowerCase().includes(q) || e.actorName.toLowerCase().includes(q));
    }
    return out.sort((a, b) => b.at - a.at);
  },

  /** Distinct actors seen so far, for the filter dropdown — {id, name} pairs, most recently
   * active first. */
  listActors(): { id: string; name: string }[] {
    const seen = new Map<string, { id: string; name: string; last: number }>();
    for (const e of store.values()) {
      const cur = seen.get(e.actorId);
      if (!cur || e.at > cur.last) seen.set(e.actorId, { id: e.actorId, name: e.actorName, last: e.at });
    }
    return [...seen.values()].sort((a, b) => b.last - a.last).map(({ id, name }) => ({ id, name }));
  },
};
