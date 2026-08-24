// In-memory per-agent publish state. An agent is published to exactly one placement —
// Workspace (people install it and chat with it) or Automation (it runs unattended for
// the whole org, driven by Console triggers) — plus an independent set of external
// channels available to either placement (their meaning differs: inbound for Workspace,
// outbound for Automation). Kind (agentKindStore.ts) is derived from trigger count, not
// stored here, so removing the last trigger instantly reopens the Workspace placement.
export type Placement = "workspace" | "automation" | null;

export interface AgentPublishState {
  placement: Placement;
  channels: string[];
}

const store = new Map<string, AgentPublishState>();

export const agentPublishStore = {
  get(agentId: string): AgentPublishState {
    return store.get(agentId) ?? { placement: null, channels: [] };
  },
  publish(agentId: string, placement: Placement, channels: string[]) {
    store.set(agentId, { placement, channels });
  },
  unpublish(agentId: string) {
    store.set(agentId, { placement: null, channels: [] });
  },
  isPublished(agentId: string): boolean {
    const s = store.get(agentId);
    return !!s && s.placement !== null;
  },
};

/** Deterministic mock install count for a Workspace-published agent — this prototype has
 * no real install data, so derive a stable, non-zero small number from the agentId, the
 * same way other mock counts are derived elsewhere in this app. */
export function mockInstallCount(agentId: string): number {
  let h = 0;
  for (const c of agentId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 8) + 1;
}

export const WORKSPACE_BLOCKED_BY_TRIGGER_REASON = (n: number) =>
  `Agent này đã có ${n} trigger do bạn đặt ở Console, nên chạy cho toàn doanh nghiệp ở chế độ Automation. Muốn người dùng cài về Workspace và tự đặt trigger riêng, hãy xoá trigger ở Console.`;
export const AUTOMATION_BLOCKED_BY_NO_TRIGGER_REASON =
  "Thêm ít nhất một trigger để dùng chế độ này.";
export const TRIGGER_BLOCKED_BY_PERSONAL_CONNECTOR_REASON = (connectorName: string) =>
  `Agent đang dùng kết nối riêng của từng người dùng (${connectorName}). Trigger chạy nền khi không có ai đăng nhập, nên không mượn được tài khoản cá nhân của người dùng.`;
export const CONNECTOR_BLOCKED_BY_TRIGGER_REASON = (n: number) =>
  `Agent đang có ${n} trigger chạy nền, nên đang ở chế độ Tự động hoá cho doanh nghiệp. Lúc trigger chạy không có người dùng nào đăng nhập để mượn tài khoản.`;
