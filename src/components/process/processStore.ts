import { AGENTS, type AgentRecord } from "@/components/configure/agentStore";
import { workforceStore } from "@/components/workforce/workforceStore";
import { currentPersona } from "@/lib/demoPersona";

/**
 * Nhân sự số Quy trình are ordinary AgentRecords (kind "process") so they share every Nhân sự số
 * surface: the /agents/:id shell, Role permissions, Cấp quyền, the publish-approval queue,
 * Evaluate, Channels, Insights. This store only adds what a Quy trình needs on top: creating one,
 * and keeping its canvas (nodes, edges, name, description, guardrails) for the demo session.
 */
export interface ProcessGraph {
  nodes: any[];
  edges: any[];
  name: string;
  desc: string;
  guard?: Record<string, boolean>;
  dir?: "h" | "v";
}

const CREATED_KEY = "process_agents_v1";
const GRAPH_KEY = (id: string) => `process_graph_v1:${id}`;

function read<T>(key: string, fallback: T): T {
  try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// Re-attach Quy trình created earlier in this demo session (persona switches reload the app).
for (const rec of read<AgentRecord[]>(CREATED_KEY, [])) {
  if (!AGENTS.some(a => a.id === rec.id)) AGENTS.push(rec);
}

function persistCreated() {
  write(CREATED_KEY, AGENTS.filter(a => a.kind === "process" && a.id.startsWith("qt-new-")));
}

export const processStore = {
  list(): AgentRecord[] {
    return AGENTS.filter(a => a.kind === "process");
  },
  get(id: string): AgentRecord | undefined {
    return AGENTS.find(a => a.id === id && a.kind === "process");
  },
  byDraftKey(key: string): AgentRecord | undefined {
    return AGENTS.find(a => a.kind === "process" && a.processId === key);
  },
  create({ name, draftKey, prompt }: { name: string; draftKey: string | null; prompt?: string }): AgentRecord {
    const id = `qt-new-${Date.now().toString(36)}`;
    const rec: AgentRecord = {
      id, name: name.trim().slice(0, 100) || "Quy trình chưa đặt tên", emoji: "🔀", bg: "bg-primary-soft", accent: "bg-gradient-brand",
      status: "Draft", desc: "", model: "Quy trình", convs: 0, success: 0, channels: [], updated: "Just now",
      instructions: prompt || "", ownerId: currentPersona().id, kind: "process", processId: draftKey ?? undefined,
    };
    AGENTS.push(rec);
    persistCreated();
    return rec;
  },
  rename(id: string, name: string, desc: string) {
    const rec = AGENTS.find(a => a.id === id);
    if (!rec) return;
    rec.name = name;
    rec.desc = desc;
    rec.updated = "Just now";
    persistCreated();
  },
  getGraph(id: string): ProcessGraph | null {
    return read<ProcessGraph | null>(GRAPH_KEY(id), null);
  },
  saveGraph(id: string, g: ProcessGraph) {
    write(GRAPH_KEY(id), g);
  },
  /** Where this Quy trình is used as a step, so it can't be deleted from under them (BR: Xoá). */
  usages(id: string): { kind: "workforce"; id: string; name: string }[] {
    return workforceStore.list()
      .filter(wf => wf.nodes.some(n => n.data.kind === "agent" && (n.data as any).agentId === id))
      .map(wf => ({ kind: "workforce" as const, id: wf.id, name: wf.name }));
  },
};
