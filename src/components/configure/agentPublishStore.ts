// In-memory per-agent publish state, plus the Conversational/Automation gating rule.
// An Automation Agent (>=1 Console trigger) can never be published; a Conversational
// Agent (published or publishable) can never carry a Console trigger. Both sides are
// computed live from triggerStore/agentPublishStore, never stored as a separate flag,
// so removing the last trigger or unpublishing instantly clears the opposite gate.
import { triggerStore } from "./triggerStore";

export interface AgentPublishState {
  workspace: boolean;
  channels: string[];
}

const store = new Map<string, AgentPublishState>();

export const agentPublishStore = {
  get(agentId: string): AgentPublishState {
    return store.get(agentId) ?? { workspace: false, channels: [] };
  },
  publish(agentId: string, workspace: boolean, channels: string[]) {
    store.set(agentId, { workspace, channels });
  },
  unpublish(agentId: string) {
    store.set(agentId, { workspace: false, channels: [] });
  },
  isPublished(agentId: string): boolean {
    const s = store.get(agentId);
    return !!s && (s.workspace || s.channels.length > 0);
  },
};

/** An Automation Agent has >=1 Console trigger and can never be published or hold a
 * per-user connector — it runs unattended, so no end-user identity is ever present. */
export function isAutomationAgent(agentId: string): boolean {
  return triggerStore.list(agentId).length > 0;
}

export const PUBLISH_BLOCKED_REASON =
  "Agent có trigger nên chỉ chạy dạng automation, không thể publish làm agent hội thoại";
export const TRIGGER_BLOCKED_BY_PERSONAL_CONNECTOR_REASON =
  "Agent đang dùng connector riêng cá nhân — không thể thêm trigger vì trigger chạy không có người trực, sẽ không có danh tính người dùng để dùng connector đó.";
export const CONNECTOR_BLOCKED_BY_TRIGGER_REASON =
  "Agent đã có trigger nên chỉ chạy dạng automation — không thể chọn connector riêng cá nhân vì không có người trực khi trigger tự chạy.";
