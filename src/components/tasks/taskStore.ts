// In-memory task store for the Task feature prototype.
// Mirrors the Tool store pattern. Replace with API calls when wiring backend.

export type TaskKind = "system" | "user";

export interface TaskVersion {
  id: string;
  commit: string;
  at: number;
  active: boolean;
}

export interface TaskRecord {
  id: string;
  agentId: string;
  name: string;
  purpose: string;
  kind: TaskKind;
  updatedAt: number;
  publishedAt: number | null;        // null = unpublished after edit
  status: "Published" | "Unpublished";
  history: TaskVersion[];
}

const store = new Map<string, TaskRecord>();
const k = (a: string, t: string) => `${a}:${t}`;

export const SYSTEM_TASK_IDS = ["sys-knowledge-retrieval", "sys-generate-knowledge-response"] as const;

function seedAgent(agentId: string) {
  if ([...store.keys()].some(key => key.startsWith(`${agentId}:`))) return;
  const now = Date.now();
  const seed: Omit<TaskRecord, "agentId">[] = [
    {
      id: "sys-knowledge-retrieval",
      name: "Knowledge Retrieval",
      purpose: "Default system task. Retrieves relevant knowledge chunks for the user query.",
      kind: "system",
      updatedAt: now - 86_400_000 * 7,
      publishedAt: now - 86_400_000 * 7,
      status: "Published",
      history: [{ id: "v1", commit: "Initial system task", at: now - 86_400_000 * 7, active: true }],
    },
    {
      id: "sys-generate-knowledge-response",
      name: "Generate Knowledge Response",
      purpose: "Default system task. 15-node flow that handles 3 cases: file on MyAgent, KB answer, other.",
      kind: "system",
      updatedAt: now - 86_400_000 * 7,
      publishedAt: now - 86_400_000 * 7,
      status: "Published",
      history: [{ id: "v1", commit: "Initial system task", at: now - 86_400_000 * 7, active: true }],
    },
    {
      id: "lock-card",
      name: "Lock credit card",
      purpose: "Verify customer identity then call the lock_card_api tool to lock the user's card.",
      kind: "user",
      updatedAt: now - 120_000,
      publishedAt: now - 7_200_000,
      status: "Published",
      history: [
        { id: "v3", commit: "Add escalation branch", at: now - 7_200_000, active: true },
        { id: "v2", commit: "Hook lock_card_api", at: now - 86_400_000, active: false },
        { id: "v1", commit: "Initial draft", at: now - 86_400_000 * 3, active: false },
      ],
    },
    {
      id: "schedule",
      name: "Schedule consultation",
      purpose: "Help the customer book a consultation slot with a banking advisor.",
      kind: "user",
      updatedAt: now - 86_400_000 * 3,
      publishedAt: now - 86_400_000 * 3,
      status: "Published",
      history: [{ id: "v2", commit: "Wire calendar API", at: now - 86_400_000 * 3, active: true }],
    },
  ];
  for (const s of seed) store.set(k(agentId, s.id), { ...s, agentId });
}

export const taskStore = {
  list(agentId: string): TaskRecord[] {
    seedAgent(agentId);
    return [...store.values()]
      .filter(t => t.agentId === agentId)
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "system" ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  },
  get(agentId: string, taskId: string): TaskRecord | undefined {
    seedAgent(agentId);
    return store.get(k(agentId, taskId));
  },
  isDuplicateName(agentId: string, name: string, excludeId?: string): boolean {
    return this.list(agentId).some(
      t => t.name.trim().toLowerCase() === name.trim().toLowerCase() && t.id !== excludeId,
    );
  },
  create(agentId: string, name: string, purpose: string): TaskRecord {
    const id = `task-${Date.now().toString(36)}`;
    const now = Date.now();
    const rec: TaskRecord = {
      id,
      agentId,
      name: name.trim(),
      purpose: purpose.trim(),
      kind: "user",
      updatedAt: now,
      publishedAt: now,
      status: "Published",
      history: [{ id: "v1", commit: "Created task", at: now, active: true }],
    };
    store.set(k(agentId, id), rec);
    return rec;
  },
  update(agentId: string, taskId: string, patch: Partial<Pick<TaskRecord, "name" | "purpose" | "status" | "publishedAt">>) {
    const cur = store.get(k(agentId, taskId));
    if (!cur) return;
    store.set(k(agentId, taskId), { ...cur, ...patch, updatedAt: Date.now() });
  },
  publish(agentId: string, taskId: string, commit: string) {
    const cur = store.get(k(agentId, taskId));
    if (!cur) return;
    const now = Date.now();
    const nextNum = cur.history.length + 1;
    const newHist: TaskVersion[] = [
      { id: `v${nextNum}`, commit, at: now, active: true },
      ...cur.history.map(h => ({ ...h, active: false })),
    ];
    store.set(k(agentId, taskId), {
      ...cur, status: "Published", publishedAt: now, updatedAt: now, history: newHist,
    });
  },
  remove(agentId: string, taskId: string) {
    const cur = store.get(k(agentId, taskId));
    if (!cur || cur.kind === "system") return;
    store.delete(k(agentId, taskId));
  },
  resetSystem(agentId: string, taskId: string) {
    const cur = store.get(k(agentId, taskId));
    if (!cur || cur.kind !== "system") return;
    store.set(k(agentId, taskId), { ...cur, updatedAt: Date.now() });
  },
};
