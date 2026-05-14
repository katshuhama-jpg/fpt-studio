// In-memory guardrail store for the Guardrails feature prototype.
export type GuardrailKind = "block" | "warn";
export type GuardrailScope = "input" | "output" | "both";

export interface GuardrailRecord {
  id: string;
  agentId: string;
  name: string;
  rule: string;
  kind: GuardrailKind;
  scope: GuardrailScope;
  example?: string;
  enabled: boolean;
  updatedAt: number;
}

const store = new Map<string, GuardrailRecord>();
const k = (a: string, id: string) => `${a}:${id}`;

function seedAgent(agentId: string) {
  if ([...store.keys()].some(key => key.startsWith(`${agentId}:`))) return;
  const now = Date.now();
  const seed: Omit<GuardrailRecord, "agentId">[] = [
    {
      id: "g1",
      name: "No legal advice",
      rule: "Never provide legal advice. Refer the user to a qualified lawyer.",
      kind: "block",
      scope: "output",
      example: "User: Can I sue my bank? → Refuse and refer to legal counsel.",
      enabled: true,
      updatedAt: now - 86_400_000,
    },
    {
      id: "g2",
      name: "Verify before sensitive action",
      rule: "Always verify customer identity before performing any sensitive action (transfer, lock card, change password).",
      kind: "block",
      scope: "both",
      enabled: true,
      updatedAt: now - 86_400_000 * 3,
    },
    {
      id: "g3",
      name: "Profanity warning",
      rule: "Warn the user if their message contains profanity, do not respond in kind.",
      kind: "warn",
      scope: "input",
      enabled: true,
      updatedAt: now - 86_400_000 * 5,
    },
    {
      id: "g4",
      name: "No competitor recommendations",
      rule: "Do not recommend competitor banking products or services.",
      kind: "block",
      scope: "output",
      enabled: false,
      updatedAt: now - 86_400_000 * 10,
    },
  ];
  for (const s of seed) store.set(k(agentId, s.id), { ...s, agentId });
}

export const guardrailStore = {
  list(agentId: string): GuardrailRecord[] {
    seedAgent(agentId);
    return [...store.values()]
      .filter(g => g.agentId === agentId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(agentId: string, id: string) {
    seedAgent(agentId);
    return store.get(k(agentId, id));
  },
  isDuplicateName(agentId: string, name: string, excludeId?: string) {
    return this.list(agentId).some(
      g => g.name.trim().toLowerCase() === name.trim().toLowerCase() && g.id !== excludeId,
    );
  },
  create(agentId: string, data: Omit<GuardrailRecord, "id" | "agentId" | "updatedAt">) {
    const id = `g-${Date.now().toString(36)}`;
    const rec: GuardrailRecord = { ...data, id, agentId, updatedAt: Date.now() };
    store.set(k(agentId, id), rec);
    return rec;
  },
  update(agentId: string, id: string, patch: Partial<GuardrailRecord>) {
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
    store.delete(k(agentId, id));
  },
};
