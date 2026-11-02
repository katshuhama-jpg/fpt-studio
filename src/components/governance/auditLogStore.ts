// sessionStorage-backed audit trail for the Governance module — every submit/approve/reject/
// revoke action across all five resource types lands here, independent of the
// GovRequest record it came from, so the Audit Log page reads as an append-only history even
// after a request itself gets modified further. Written to exclusively by governanceStore.ts.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { GovResourceType } from "./governanceStore";

export type AuditAction = "submitted" | "approved" | "rejected" | "revoked" | "withdrawn" | "rolled_back" | "channel_off" | "exported"
  /** Gói và hạn mức (Hạn mức sử dụng) */
  | "usage_request_sent" | "usage_request_cancelled" | "usage_request_activated" | "usage_fallback_changed"
  | "usage_cap_changed" | "usage_cap_request_approved" | "usage_cap_request_rejected";
/** Audit Log also records Space-level actions on "Gói và hạn mức", outside the five governed resource types. */
export type AuditResourceType = GovResourceType | "usage";

export interface AuditEntry {
  id: string;
  at: number;
  actorId: string;
  actorName: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  resourceName: string;
  requestId?: string;
  note?: string;
  /** What the action was about — "v1.2.0" or "Bật kênh API" (Agent requests). */
  detail?: string;
}

const KEY = "governance_audit_log_v10";
const store = loadMap<string, AuditEntry>(KEY);
const persist = () => saveMap(KEY, store);
let seq = 1;

export const ACTION_LABEL: Record<AuditAction, string> = {
  submitted: "Đã gửi yêu cầu duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
  revoked: "Đã thu hồi",
  withdrawn: "Đã rút yêu cầu",
  rolled_back: "Đã khôi phục phiên bản cũ",
  channel_off: "Đã tắt kênh ngoài",
  exported: "Đã xuất dữ liệu hội thoại",
  usage_request_sent: "Đã gửi yêu cầu mua thêm",
  usage_request_cancelled: "Đã hủy yêu cầu mua thêm",
  usage_request_activated: "Đã kích hoạt mua thêm",
  usage_fallback_changed: "Đã sửa câu trả lời khi hết credit",
  usage_cap_changed: "Đã đổi trần chạy thử",
  usage_cap_request_approved: "Đã duyệt thêm hạn mức chạy thử",
  usage_cap_request_rejected: "Đã từ chối xin thêm hạn mức chạy thử",
};

export interface AuditFilter {
  actorId?: string;
  resourceType?: AuditResourceType;
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
