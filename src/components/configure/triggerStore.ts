// In-memory trigger store for the Triggers feature prototype.
export type TriggerType = "manual" | "schedule" | "webhook" | "event" | "email";

export interface TriggerRecord {
  id: string;
  agentId: string;
  name: string;
  type: TriggerType;
  enabled: boolean;
  description: string;
  config: {
    cron?: string;          // schedule
    webhookUrl?: string;    // webhook (read-only generated)
    secret?: string;        // webhook
    keywords?: string[];    // event
    emailAddress?: string;  // email
  };
  lastFiredAt: number | null;
  updatedAt: number;
  isDefault?: boolean;      // Manual is the seeded default
}

const store = new Map<string, TriggerRecord>();
const k = (a: string, t: string) => `${a}:${t}`;

function seedAgent(agentId: string) {
  if ([...store.keys()].some(key => key.startsWith(`${agentId}:`))) return;
  const now = Date.now();
  const seed: Omit<TriggerRecord, "agentId">[] = [
    {
      id: "manual-default",
      name: "Manual run",
      type: "manual",
      enabled: true,
      description: "User manually invokes the agent from the chat UI or API.",
      config: {},
      lastFiredAt: now - 120_000,
      updatedAt: now - 86_400_000 * 7,
      isDefault: true,
    },
    {
      id: "weekly-report",
      name: "Weekly summary",
      type: "schedule",
      enabled: true,
      description: "Run the agent every Monday at 9:00 to generate weekly summary.",
      config: { cron: "0 9 * * 1" },
      lastFiredAt: now - 86_400_000 * 2,
      updatedAt: now - 86_400_000 * 14,
    },
    {
      id: "card-lock-webhook",
      name: "Card lock webhook",
      type: "webhook",
      enabled: false,
      description: "External system pushes a card-lock event to the agent.",
      config: {
        webhookUrl: "https://api.tova.ai/agents/cskh/triggers/card-lock-webhook",
        secret: "whsec_•••••••••",
      },
      lastFiredAt: null,
      updatedAt: now - 86_400_000 * 3,
    },
  ];
  for (const s of seed) store.set(k(agentId, s.id), { ...s, agentId });
}

export const triggerStore = {
  list(agentId: string): TriggerRecord[] {
    seedAgent(agentId);
    return [...store.values()]
      .filter(t => t.agentId === agentId)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  },
  get(agentId: string, id: string) {
    seedAgent(agentId);
    return store.get(k(agentId, id));
  },
  isDuplicateName(agentId: string, name: string, excludeId?: string) {
    return this.list(agentId).some(
      t => t.name.trim().toLowerCase() === name.trim().toLowerCase() && t.id !== excludeId,
    );
  },
  create(agentId: string, data: Omit<TriggerRecord, "id" | "agentId" | "updatedAt" | "lastFiredAt">) {
    const id = `trg-${Date.now().toString(36)}`;
    const rec: TriggerRecord = {
      ...data,
      id,
      agentId,
      lastFiredAt: null,
      updatedAt: Date.now(),
    };
    store.set(k(agentId, id), rec);
    return rec;
  },
  update(agentId: string, id: string, patch: Partial<TriggerRecord>) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, ...patch, updatedAt: Date.now() });
  },
  toggle(agentId: string, id: string) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, enabled: !cur.enabled, updatedAt: Date.now() });
  },
  remove(agentId: string, id: string) {
    const cur = store.get(k(agentId, id));
    if (!cur || cur.isDefault) return;
    store.delete(k(agentId, id));
  },
};
