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

export const WORKSPACE_BLOCKED_BY_TRIGGER_REASON =
  "Agent có trigger nên chỉ chạy dạng Automation — không thể phát hành lên Workspace.";
export const AUTOMATION_BLOCKED_BY_NO_TRIGGER_REASON =
  "Chưa có trigger nào — thêm trigger để phát hành dạng Automation.";
export const TRIGGER_BLOCKED_BY_PERSONAL_CONNECTOR_REASON =
  "Agent đang dùng kết nối riêng của từng người dùng — trigger chạy nền không có người dùng nào để mượn kết nối đó.";
export const CONNECTOR_BLOCKED_BY_TRIGGER_REASON =
  "Agent đã có trigger nên chạy nền không có người dùng trực — không thể dùng kết nối riêng của từng người dùng.";
