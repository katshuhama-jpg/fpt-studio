// In-memory activation-state store for Automation Agents — the automation equivalent of
// agentPublishStore's publish/unpublish, since "activate" is a distinct action (no channel
// picker, no workspace audience) rather than a disabled version of Publish.
export type AutomationStatus = "draft" | "running" | "paused";

const store = new Map<string, AutomationStatus>();

export const automationStore = {
  get(agentId: string): AutomationStatus {
    return store.get(agentId) ?? "draft";
  },
  activate(agentId: string) {
    store.set(agentId, "running");
  },
  pause(agentId: string) {
    store.set(agentId, "paused");
  },
  resume(agentId: string) {
    store.set(agentId, "running");
  },
  isActivated(agentId: string): boolean {
    return this.get(agentId) !== "draft";
  },
};
