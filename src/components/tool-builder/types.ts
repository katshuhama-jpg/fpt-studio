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

export type ToolSource = "builtin" | "api" | "ide" | "mcp";

export interface ToolRun {
  id: string;
  ts: number;
  ms: number;
  status: "ok" | "error" | "timeout";
  input?: any;
  output?: any;
  error?: string;
  retries?: number;
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

  // Source classification
  source?: ToolSource;

  // Built-in
  setId?: string;
  pluginAvatar?: string;
  requiresAuth?: boolean;

  // Code (IDE)
  code?: string;
  params?: ToolParam[];
  credentials?: ToolCredential[];
  cardBinding?: string;

  // API
  api?: {
    url: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: string;
    inputs?: ToolParam[];
    outputs?: ToolParam[];
  };

  // MCP
  mcpConnectionId?: string;
  remoteToolName?: string;

  // Audit
  runs?: ToolRun[];

  // Usage flag
  usedInBp?: boolean;
}

/* ============ Built-in catalog (UC-BT-01..03) ============ */

export interface BuiltinTool {
  name: string;
  description: string;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
}

export interface BuiltinToolSet {
  setId: string;
  name: string;
  description: string;
  category: "Communication" | "Data" | "Banking" | "AI" | "Productivity" | "Web";
  pluginAvatar: string; // emoji as cheap visual
  toolCount: number;
  requiresAuth: boolean;
  authFields?: { authName?: boolean; apiKey?: boolean; baseUrl?: boolean };
  docsUrl?: string;
  tools: BuiltinTool[];
}

export const builtinCatalog: BuiltinToolSet[] = [
  {
    setId: "core-banking",
    name: "Core Banking",
    description: "Customer lookup, card operations and account balance from the core banking system.",
    category: "Banking",
    pluginAvatar: "🏦",
    toolCount: 4,
    requiresAuth: true,
    authFields: { authName: true, apiKey: true, baseUrl: true },
    docsUrl: "https://example.com/docs/core-banking",
    tools: [
      { name: "verify_customer", description: "Verify a customer by phone or ID number.", inputSchema: { phone: "string" }, outputSchema: { customerId: "string", verified: "boolean" } },
      { name: "lock_card", description: "Lock a card after identity check.", inputSchema: { cardId: "string", reason: "string" }, outputSchema: { ok: "boolean" } },
      { name: "get_balance", description: "Return the current account balance.", inputSchema: { accountId: "string" }, outputSchema: { balance: "number", currency: "string" } },
      { name: "list_transactions", description: "List recent transactions on an account.", inputSchema: { accountId: "string", limit: "number" }, outputSchema: { items: "array" } },
    ],
  },
  {
    setId: "crm-lookup",
    name: "CRM Lookup",
    description: "Search and update customer records in the CRM.",
    category: "Data",
    pluginAvatar: "📇",
    toolCount: 3,
    requiresAuth: true,
    authFields: { authName: true, apiKey: true },
    tools: [
      { name: "find_customer", description: "Search a customer by email or phone.", inputSchema: { query: "string" }, outputSchema: { items: "array" } },
      { name: "create_ticket", description: "Open a support ticket.", inputSchema: { customerId: "string", subject: "string", body: "string" }, outputSchema: { ticketId: "string" } },
      { name: "update_note", description: "Append a note to a customer record.", inputSchema: { customerId: "string", note: "string" }, outputSchema: { ok: "boolean" } },
    ],
  },
  {
    setId: "email-sms",
    name: "Email & SMS",
    description: "Send transactional email and SMS messages.",
    category: "Communication",
    pluginAvatar: "✉️",
    toolCount: 2,
    requiresAuth: true,
    authFields: { authName: true, apiKey: true },
    tools: [
      { name: "send_email", description: "Send a transactional email.", inputSchema: { to: "string", subject: "string", body: "string" }, outputSchema: { messageId: "string" } },
      { name: "send_sms", description: "Send an SMS message.", inputSchema: { to: "string", body: "string" }, outputSchema: { messageId: "string" } },
    ],
  },
  {
    setId: "google-calendar",
    name: "Google Calendar",
    description: "Read availability and create meetings on Google Calendar.",
    category: "Productivity",
    pluginAvatar: "📅",
    toolCount: 2,
    requiresAuth: true,
    authFields: { authName: true, apiKey: true },
    tools: [
      { name: "list_events", description: "List events for a time range.", inputSchema: { from: "string", to: "string" }, outputSchema: { items: "array" } },
      { name: "create_event", description: "Create a new calendar event.", inputSchema: { title: "string", start: "string", end: "string" }, outputSchema: { eventId: "string" } },
    ],
  },
  {
    setId: "web-search",
    name: "Web Search",
    description: "Search the web and fetch page contents — no setup required.",
    category: "Web",
    pluginAvatar: "🌐",
    toolCount: 2,
    requiresAuth: false,
    tools: [
      { name: "web_search", description: "Search the web.", inputSchema: { query: "string" }, outputSchema: { results: "array" } },
      { name: "fetch_page", description: "Fetch and extract main content of a URL.", inputSchema: { url: "string" }, outputSchema: { content: "string" } },
    ],
  },
  {
    setId: "ai-helpers",
    name: "AI Helpers",
    description: "Built-in summarization and translation powered by the AI gateway.",
    category: "AI",
    pluginAvatar: "✨",
    toolCount: 2,
    requiresAuth: false,
    tools: [
      { name: "summarize", description: "Summarize a long text.", inputSchema: { text: "string" }, outputSchema: { summary: "string" } },
      { name: "translate", description: "Translate text into a target language.", inputSchema: { text: "string", target: "string" }, outputSchema: { translation: "string" } },
    ],
  },
];

export const getBuiltin = (setId: string) => builtinCatalog.find(s => s.setId === setId);

/* ============ Store ============ */

const store = new Map<string, ToolDefinition>();

export const toolStore = {
  list(agentId: string): ToolDefinition[] {
    return [...store.values()].filter(t => t.id.startsWith(`${agentId}:`));
  },
  get(agentId: string, toolId: string): ToolDefinition | undefined {
    return store.get(`${agentId}:${toolId}`);
  },
  save(agentId: string, def: ToolDefinition) {
    const localId = def.id.startsWith(`${agentId}:`) ? def.id.replace(`${agentId}:`, "") : def.id;
    store.set(`${agentId}:${localId}`, { ...def, id: `${agentId}:${localId}` });
  },
  remove(agentId: string, toolId: string) {
    const localId = toolId.startsWith(`${agentId}:`) ? toolId.replace(`${agentId}:`, "") : toolId;
    store.delete(`${agentId}:${localId}`);
  },
  isSetInstalled(agentId: string, setId: string): boolean {
    return [...store.values()].some(t => t.id.startsWith(`${agentId}:`) && t.source === "builtin" && t.setId === setId);
  },
  installBuiltin(agentId: string, set: BuiltinToolSet, credentials: ToolCredential[] = []) {
    const def: ToolDefinition = {
      id: `builtin-${set.setId}`,
      name: set.name,
      description: set.description,
      nodes: [],
      edges: [],
      updatedAt: Date.now(),
      status: "published",
      enabled: true,
      source: "builtin",
      setId: set.setId,
      pluginAvatar: set.pluginAvatar,
      requiresAuth: set.requiresAuth,
      credentials,
    };
    this.save(agentId, def);
  },
};

// Seed
if (store.size === 0) {
  store.set("cskh:verify-customer", {
    id: "cskh:verify-customer",
    name: "verify_customer",
    description: "Verify a customer by phone number against the CRM.",
    nodes: [],
    edges: [],
    updatedAt: Date.now() - 86_400_000,
    status: "published",
    source: "ide",
    enabled: true,
    usedInBp: true,
  });
  store.set("cskh:lock-card", {
    id: "cskh:lock-card",
    name: "lock_card",
    description: "Lock a card via core banking API after identity check.",
    nodes: [],
    edges: [],
    updatedAt: Date.now() - 3_600_000,
    status: "draft",
    source: "ide",
    enabled: true,
  });
}
