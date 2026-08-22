// In-memory store for personal triggers — a user's own trigger on an agent they installed
// from the Workspace. Deliberately isolated from triggerStore: personal triggers are keyed
// by (agentId, ownerUserId) instead of just agentId, are owned by that user rather than the
// Builder, and must never be read by any Console-side trigger list or query. Console-facing
// screens should only ever import triggerStore, never this file.
export interface PersonalTriggerRecord {
  id: string;
  agentId: string;
  ownerUserId: string;
  name: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

const store = new Map<string, PersonalTriggerRecord>();
const k = (agentId: string, ownerUserId: string, id: string) => `${agentId}:${ownerUserId}:${id}`;

export const personalTriggerStore = {
  list(agentId: string, ownerUserId: string): PersonalTriggerRecord[] {
    return [...store.values()]
      .filter(t => t.agentId === agentId && t.ownerUserId === ownerUserId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  create(agentId: string, ownerUserId: string, data: Pick<PersonalTriggerRecord, "name" | "enabled">) {
    const id = `ptrg-${Date.now().toString(36)}`;
    const rec: PersonalTriggerRecord = {
      ...data,
      id,
      agentId,
      ownerUserId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.set(k(agentId, ownerUserId, id), rec);
    return rec;
  },
  remove(agentId: string, ownerUserId: string, id: string) {
    store.delete(k(agentId, ownerUserId, id));
  },
};
