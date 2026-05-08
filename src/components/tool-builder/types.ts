import type { Node, Edge } from "reactflow";

export type NodeKind =
  | "trigger"
  | "http"
  | "if"
  | "loop"
  | "setvar"
  | "knowledge"
  | "llm"
  | "extract"
  | "classify"
  | "output";

export type NodeCategory = "trigger" | "logic" | "data" | "ai" | "output";

export interface NodeData {
  kind: NodeKind;
  label: string;
  config?: Record<string, any>;
}

export type ToolNode = Node<NodeData>;
export type ToolEdge = Edge;

export interface ToolParam {
  name: string;
  type: "string" | "number" | "boolean" | "object";
  required: boolean;
  description: string;
}

export interface ToolCredential {
  key: string;
  value: string;
  masked?: boolean;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  nodes: ToolNode[];
  edges: ToolEdge[];
  updatedAt: number;
  status: "draft" | "published";
  enabled?: boolean;
  code?: string;
  params?: ToolParam[];
  credentials?: ToolCredential[];
  cardBinding?: string;
}

// In-memory store keyed by `${agentId}:${toolId}` for the prototype
const store = new Map<string, ToolDefinition>();

export const toolStore = {
  list(agentId: string): ToolDefinition[] {
    return [...store.values()].filter(t => t.id.startsWith(`${agentId}:`));
  },
  get(agentId: string, toolId: string): ToolDefinition | undefined {
    return store.get(`${agentId}:${toolId}`);
  },
  save(agentId: string, def: ToolDefinition) {
    store.set(`${agentId}:${def.id.replace(`${agentId}:`, "")}`,
      { ...def, id: def.id.startsWith(`${agentId}:`) ? def.id : `${agentId}:${def.id}` });
  },
  remove(agentId: string, toolId: string) {
    store.delete(`${agentId}:${toolId}`);
  },
};

// Seed a couple of tools so the list isn't empty on first visit
if (store.size === 0) {
  store.set("cskh:verify-customer", {
    id: "cskh:verify-customer",
    name: "verify_customer",
    description: "Verify a customer by phone number against the CRM.",
    nodes: [],
    edges: [],
    updatedAt: Date.now() - 86_400_000,
    status: "published",
  });
  store.set("cskh:lock-card", {
    id: "cskh:lock-card",
    name: "lock_card",
    description: "Lock a card via core banking API after identity check.",
    nodes: [],
    edges: [],
    updatedAt: Date.now() - 3_600_000,
    status: "draft",
  });
}
