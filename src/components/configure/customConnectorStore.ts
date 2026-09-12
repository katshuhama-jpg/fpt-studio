// sessionStorage-backed CONSOLE-level Custom Connector store — tracks self-added ("Custom MCP")
// connector definitions a builder registers so their Agents can use that MCP server's tools.
// Scope is deliberately narrow: this store only ever holds CUSTOM connectors a user added
// themselves — the built-in Marketplace catalog (src/pages/WorkspaceConnectors.tsx's CONNECTORS)
// and the Agent-level "Kết nối" catalog (ConnectionsTab.tsx's CATALOG) are unrelated, fixed lists
// and never touch this store. Mirrors guardrailConsoleStore.ts's ownership/sharing/attached-agent
// bookkeeping field-for-field, since Knowledge is the reference pattern every shareable
// Console-level resource in this product follows: private-by-default, explicit share to Console.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import type { Sharing } from "./customConnectorSharing";

export type ConnectorAuthType = "none" | "static_headers";

export interface ConnectorHeader {
  key: string;
  value: string;
}

export interface CustomConnector {
  id: string;
  name: string;
  url: string;
  authType: ConnectorAuthType;
  /** static_headers only */
  headers: ConnectorHeader[];
  ownerId: string;
  ownerName: string;
  sharing: Sharing;
  /** Agent ids currently attaching this custom connector — drives the Delete warning
   * ("N Agent đang dùng custom connector này và sẽ mất..."). */
  attachedByAgentIds: string[];
  createdAt: number;
  updatedAt: number;
}

const STORE_KEY = "custom_connector_store_v1";
const SEEDED_KEY = "custom_connector_store_seeded_v1";
const store = loadMap<string, CustomConnector>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

function seed() {
  if (sessionStorage.getItem(SEEDED_KEY)) return;
  sessionStorage.setItem(SEEDED_KEY, "1");
  const now = Date.now();
  const DAY = 86_400_000;
  const put = (c: CustomConnector) => store.set(c.id, c);

  // Owned by current user — private (default), already attached to an Agent so the delete
  // warning has something real to show.
  put({
    id: "cc-1", name: "internal-crm-mcp", url: "https://mcp.internal.fpt.com/crm",
    authType: "static_headers", headers: [{ key: "Authorization", value: "Bearer ••••••••" }],
    ownerId: CURRENT_USER.id, ownerName: CURRENT_USER.name,
    sharing: { mode: "private", people: [] },
    attachedByAgentIds: ["cskh"],
    createdAt: now - 14 * DAY, updatedAt: now - 2 * 3_600_000,
  });

  // Owned by current user — shared to all Console users
  put({
    id: "cc-2", name: "finance-reporting-mcp", url: "https://mcp.finance.fpt.com/reports",
    authType: "none", headers: [],
    ownerId: CURRENT_USER.id, ownerName: CURRENT_USER.name,
    sharing: { mode: "all", people: [] },
    attachedByAgentIds: [],
    createdAt: now - 8 * DAY, updatedAt: now - DAY,
  });

  // Owned by someone else, private, never shared to current user — proves the sharing model
  // actually hides something, mirroring knowledgeBaseStore.ts's kb-7.
  put({
    id: "cc-3", name: "legal-search-mcp", url: "https://mcp.legal.fpt.com/search",
    authType: "none", headers: [],
    ownerId: "m-fsoft-vn-1", ownerName: "Duy Nguyen",
    sharing: { mode: "private", people: [] },
    attachedByAgentIds: [],
    createdAt: now - 20 * DAY, updatedAt: now - 20 * DAY,
  });

  persist();
}

export const customConnectorStore = {
  list(): CustomConnector[] {
    seed();
    return [...store.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): CustomConnector | undefined {
    seed();
    return store.get(id);
  },
  isDuplicateName(name: string, excludeId?: string): boolean {
    const n = name.trim().toLowerCase();
    return this.list().some(c => c.id !== excludeId && c.name.trim().toLowerCase() === n);
  },
  create(data: { name: string; url: string; authType: ConnectorAuthType; headers: ConnectorHeader[]; sharing: Sharing }): CustomConnector {
    const id = `cc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const c: CustomConnector = {
      id, name: data.name.trim(), url: data.url.trim(), authType: data.authType,
      headers: data.authType === "static_headers" ? data.headers.filter(h => h.key.trim()) : [],
      ownerId: CURRENT_USER.id, ownerName: CURRENT_USER.name, sharing: data.sharing,
      attachedByAgentIds: [], createdAt: now, updatedAt: now,
    };
    store.set(id, c);
    persist();
    return c;
  },
  updateSharing(id: string, sharing: Sharing) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, sharing, updatedAt: Date.now() });
    persist();
  },
  /** Edits an existing Custom Connector's connection details (Name/URL/Authentication). Sharing
   * is intentionally left untouched here — that's still the separate "Chia sẻ" modal's job — so
   * editing connection details never accidentally changes who can see the connector. */
  update(id: string, data: { name: string; url: string; authType: ConnectorAuthType; headers: ConnectorHeader[] }) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, {
      ...cur,
      name: data.name.trim(),
      url: data.url.trim(),
      authType: data.authType,
      headers: data.authType === "static_headers" ? data.headers.filter(h => h.key.trim()) : [],
      updatedAt: Date.now(),
    });
    persist();
  },
  remove(id: string) {
    store.delete(id);
    persist();
  },
  addAttachingAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur || cur.attachedByAgentIds.includes(agentId)) return;
    store.set(id, { ...cur, attachedByAgentIds: [...cur.attachedByAgentIds, agentId] });
    persist();
  },
  removeAttachingAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, attachedByAgentIds: cur.attachedByAgentIds.filter(a => a !== agentId) });
    persist();
  },
};
