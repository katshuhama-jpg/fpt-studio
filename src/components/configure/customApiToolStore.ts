// sessionStorage-backed CONSOLE-level Custom API Tool store — a "Custom Tool" built from a plain
// REST API definition (as opposed to a Custom Connector/MCP server — customConnectorStore.ts —
// which points an Agent at an existing MCP endpoint). Deliberately kept to the fields a Builder
// actually needs to call an API end-to-end. Sharing works like every other resource: a tool
// created in the Space library starts shared with the whole Space, one quick-added inside an
// Agent starts "Chỉ Agent này" (private); `attachedByAgentIds` tracks which Agents use it. No
// response-mapping/retry/rate-limit/cache/mTLS (explicitly deferred to a later phase).
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { isAccessibleTo, type Sharing } from "./customConnectorSharing";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ApiAuthType = "none" | "api_key" | "bearer" | "basic" | "oauth2";
export type ApiParamLocation = "query" | "path" | "body";
export type ApiParamType = "string" | "number" | "boolean" | "object" | "array";

export interface ApiHeader {
  key: string;
  value: string;
}

export interface ApiParam {
  name: string;
  type: ApiParamType;
  location: ApiParamLocation;
  required: boolean;
  description: string;
}

/** One shape per auth type so each only carries the fields it needs — a `type: "basic"` tool
 * can never end up with a stray `apiKey` field left over from switching auth types in the form. */
export type ApiAuthConfig =
  | { type: "none" }
  | { type: "api_key"; headerName: string; apiKey: string }
  | { type: "bearer"; token: string }
  | { type: "basic"; username: string; password: string }
  | { type: "oauth2"; clientId: string; clientSecret: string; tokenUrl: string };

export interface CustomApiTool {
  id: string;
  name: string;
  description: string;
  method: HttpMethod;
  url: string;
  auth: ApiAuthConfig;
  headers: ApiHeader[];
  params: ApiParam[];
  /** Seconds. Defaults to 30 at creation — see DEFAULT_TIMEOUT_SEC. */
  timeoutSec: number;
  ownerId: string;
  ownerName: string;
  sharing: Sharing;
  /** Agents currently using this tool (mirror of the Agent-side connector records). */
  attachedByAgentIds: string[];
  createdAt: number;
  updatedAt: number;
  /** Agent this resource was created in. Kept after it is shared to the Space, so the Space
   * "Ai được dùng" popup still shows the "Chia sẻ lên Space" switch: turning it off moves the
   * resource back into that Agent. Unset for resources created in the Space library. */
  originAgentId?: string;
  /** Set when the resource was deleted from the Space library ("Xóa" on Space). The record is
   * kept so Agents still linking it can show it as "Đã bị xóa" (and stay unpublishable until
   * they detach it). `keptForAgentId`: created in that Agent, which keeps using it; every other
   * Agent loses it. Unset `keptForAgentId`: gone for every Agent. Sharing it again (from the
   * Agent that kept it) puts it back on the Space. */
  deletedFromSpace?: { at: number; byId: string; byName: string; keptForAgentId?: string };
}

export const DEFAULT_TIMEOUT_SEC = 30;

export const AUTH_TYPE_LABEL: Record<ApiAuthType, string> = {
  none: "Không có",
  api_key: "API Key",
  bearer: "Bearer Token",
  basic: "Basic Auth",
  oauth2: "OAuth 2.0",
};

export function defaultAuthConfig(type: ApiAuthType): ApiAuthConfig {
  switch (type) {
    case "api_key": return { type, headerName: "X-API-Key", apiKey: "" };
    case "bearer": return { type, token: "" };
    case "basic": return { type, username: "", password: "" };
    case "oauth2": return { type, clientId: "", clientSecret: "", tokenUrl: "" };
    default: return { type: "none" };
  }
}

const STORE_KEY = "custom_api_tool_store_v1";
const SEEDED_KEY = "custom_api_tool_store_seeded_v1";
const store = loadMap<string, CustomApiTool>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);
/** Older session records predate sharing/attachments — read them as a Space-library tool. */
const normalize = (t: CustomApiTool): CustomApiTool => ({
  ...t,
  sharing: t.sharing ?? { mode: "all", people: [] },
  attachedByAgentIds: t.attachedByAgentIds ?? [],
});

function seed() {
  if (sessionStorage.getItem(SEEDED_KEY)) return;
  sessionStorage.setItem(SEEDED_KEY, "1");
  const now = Date.now();
  const DAY = 86_400_000;
  const put = (t: CustomApiTool) => store.set(t.id, t);

  put({
    id: "api-1",
    name: "Tra cứu đơn hàng",
    description: "Lấy trạng thái và chi tiết một đơn hàng theo mã đơn. Agent gọi khi khách hỏi \"đơn của tôi tới đâu rồi\".",
    method: "GET",
    url: "https://api.client.com/orders/{order_id}",
    auth: { type: "api_key", headerName: "X-API-Key", apiKey: "sk_live_••••••••••••cd42" },
    headers: [{ key: "Accept", value: "application/json" }],
    params: [
      { name: "order_id", type: "string", location: "path", required: true, description: "Mã đơn hàng, ví dụ ORD-20394." },
    ],
    timeoutSec: 30,
    ownerId: CURRENT_USER.id, ownerName: CURRENT_USER.name,
    sharing: { mode: "all", people: [] }, attachedByAgentIds: [],
    createdAt: now - 6 * DAY, updatedAt: now - DAY,
  });

  put({
    id: "api-2",
    name: "Tạo ticket hỗ trợ",
    description: "Tạo một ticket khiếu nại/hỗ trợ mới trong hệ thống CSKH. Agent gọi khi không tự xử lý được yêu cầu của khách và cần chuyển cho nhân viên.",
    method: "POST",
    url: "https://api.client.com/tickets",
    auth: { type: "bearer", token: "••••••••••••••••" },
    headers: [{ key: "Content-Type", value: "application/json" }],
    params: [
      { name: "subject", type: "string", location: "body", required: true, description: "Tiêu đề ngắn gọn của ticket." },
      { name: "priority", type: "string", location: "body", required: false, description: "low | normal | high." },
    ],
    timeoutSec: 30,
    ownerId: CURRENT_USER.id, ownerName: CURRENT_USER.name,
    sharing: { mode: "all", people: [] }, attachedByAgentIds: [],
    createdAt: now - 3 * DAY, updatedAt: now - 3 * DAY,
  });

  persist();
}

export const customApiToolStore = {
  /** Every tool in the Space (callers filter by access with listAccessible). */
  list(): CustomApiTool[] {
    seed();
    return [...store.values()].map(normalize).filter(t => !t.deletedFromSpace).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  /** Tools this user may see in the library / attach to an Agent: own + shared to them. */
  listAccessible(userId: string): CustomApiTool[] {
    return this.list().filter(t => isAccessibleTo(t.sharing, t.ownerId, userId));
  },
  get(id: string): CustomApiTool | undefined {
    seed();
    const t = store.get(id);
    return t ? normalize(t) : undefined;
  },
  isDuplicateName(name: string, excludeId?: string): boolean {
    const n = name.trim().toLowerCase();
    return this.list().some(t => t.id !== excludeId && t.name.trim().toLowerCase() === n);
  },
  create(data: {
    name: string; description: string; method: HttpMethod; url: string; auth: ApiAuthConfig;
    headers: ApiHeader[]; params: ApiParam[]; timeoutSec: number;
    /** Space library → "Tất cả người dùng trong Space"; quick-add inside an Agent → private. */
    sharing?: Sharing;
  }): CustomApiTool {
    const id = `api-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const t: CustomApiTool = {
      id, name: data.name.trim(), description: data.description.trim(),
      method: data.method, url: data.url.trim(), auth: data.auth,
      headers: data.headers.filter(h => h.key.trim()),
      params: data.params.filter(p => p.name.trim()),
      timeoutSec: data.timeoutSec > 0 ? data.timeoutSec : DEFAULT_TIMEOUT_SEC,
      ownerId: CURRENT_USER.id, ownerName: CURRENT_USER.name,
      sharing: data.sharing ?? { mode: "all", people: [] }, attachedByAgentIds: [],
      createdAt: now, updatedAt: now,
    };
    store.set(id, t);
    persist();
    return t;
  },
  update(id: string, data: {
    name: string; description: string; method: HttpMethod; url: string; auth: ApiAuthConfig;
    headers: ApiHeader[]; params: ApiParam[]; timeoutSec: number;
  }) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, {
      ...cur,
      name: data.name.trim(), description: data.description.trim(),
      method: data.method, url: data.url.trim(), auth: data.auth,
      headers: data.headers.filter(h => h.key.trim()),
      params: data.params.filter(p => p.name.trim()),
      timeoutSec: data.timeoutSec > 0 ? data.timeoutSec : DEFAULT_TIMEOUT_SEC,
      updatedAt: Date.now(),
    });
    persist();
  },
  updateSharing(id: string, sharing: Sharing) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...normalize(cur), sharing, deletedFromSpace: sharing.mode === "private" ? cur.deletedFromSpace : undefined, updatedAt: Date.now() });
    persist();
  },
  /** "Xóa" on the Space library - see deletedFromSpace. */
  removeFromSpace(id: string, by: { id: string; name: string }, keptForAgentId?: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, sharing: { mode: "private", people: [] }, deletedFromSpace: { at: Date.now(), byId: by.id, byName: by.name, keptForAgentId }, updatedAt: Date.now() });
    persist();
  },
  /** Records the Agent a resource was first created in (see originAgentId). */
  setOriginAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur || cur.originAgentId) return;
    store.set(id, { ...cur, originAgentId: agentId });
    persist();
  },
  addAttachingAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur) return;
    const t = normalize(cur);
    if (t.attachedByAgentIds.includes(agentId)) return;
    store.set(id, { ...t, attachedByAgentIds: [...t.attachedByAgentIds, agentId] });
    persist();
  },
  removeAttachingAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur) return;
    const t = normalize(cur);
    store.set(id, { ...t, attachedByAgentIds: t.attachedByAgentIds.filter(a => a !== agentId) });
    persist();
  },
  remove(id: string) {
    store.delete(id);
    persist();
  },
};
