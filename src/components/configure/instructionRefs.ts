// Resource references inside an Agent's Instructions ("chips") and the catalogue behind the "/"
// menu. A reference is stored in the Instructions text as a token —
//   {{ref:KIND:PAYLOAD|name hint}}
// — and resolved live against the stores every time it is drawn, so a renamed Skill/Connector/
// file shows its new name, and a detached or deleted one turns into an error chip instead of
// silently keeping stale text. The "|name hint" is only a fallback label for the case where the
// resource can no longer be found (there is nothing left to read the name from).
import { agentSkillStore } from "./agentSkillStore";
import { skillStore, type Skill } from "./skillStore";
import { isAccessibleTo as isSkillAccessibleTo } from "./skillSharing";
import { agentConnectorStore } from "./agentConnectorStore";
import { customConnectorStore } from "./customConnectorStore";
import { isAccessibleTo as isConnectorAccessibleTo } from "./customConnectorSharing";
import { actionsForConnector } from "./connectorActionStore";
import { agentCapabilityStore, AGENT_CAPABILITIES } from "./agentCapabilityStore";
import { knowledgeStore, OWN_KB_ID } from "@/components/knowledge/knowledgeStore";
import { knowledgeBaseStore, CURRENT_USER, isAccessibleTo as isKbAccessibleTo } from "@/components/knowledge/knowledgeBaseStore";
import { knowledgeDocumentStore, type KnowledgeDocument } from "@/components/knowledge/knowledgeDocumentStore";

/* ───────────────────────── tokens ───────────────────────── */

export type RefKind = "skill" | "builtin" | "connector" | "tool" | "kb" | "folder" | "file" | "own";

export interface ParsedRef {
  kind: RefKind;
  /** skill/builtin/connector/kb/own: one id · tool: `connectorId::action` · folder/file: `kbId::docId` */
  payload: string;
  hint?: string;
  token: string;
}

const KINDS: RefKind[] = ["skill", "builtin", "connector", "tool", "kb", "folder", "file", "own"];
const REF_SOURCE = String.raw`\{\{ref:([a-z]+):([^|}]+)(?:\|([^}]*))?\}\}`;
export const newRefRegExp = () => new RegExp(REF_SOURCE, "g");

export function makeToken(kind: RefKind, payload: string, hint?: string): string {
  const h = (hint ?? "").replace(/[|{}]/g, "").trim();
  return `{{ref:${kind}:${payload}${h ? `|${h}` : ""}}}`;
}

export function parseToken(token: string): ParsedRef | null {
  const m = new RegExp(`^${REF_SOURCE}$`).exec(token);
  if (!m || !KINDS.includes(m[1] as RefKind)) return null;
  return { kind: m[1] as RefKind, payload: m[2], hint: m[3] || undefined, token };
}

export type Segment = { type: "text"; text: string } | { type: "ref"; ref: ParsedRef };

export function splitByRefs(text: string): Segment[] {
  const out: Segment[] = [];
  const re = newRefRegExp();
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (!KINDS.includes(m[1] as RefKind)) continue;
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    out.push({ type: "ref", ref: { kind: m[1] as RefKind, payload: m[2], hint: m[3] || undefined, token: m[0] } });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

/* ───────────────────────── names & lookups ───────────────────────── */

// Same display names as AgentBuilder's SUB_AGENT_CONNECTORS (not exported from that page).
const CONNECTOR_NAME: Record<string, string> = {
  drive: "Google Drive", sheets: "Sheets", gmail: "Gmail", slack: "Slack",
  notion: "Notion", hubspot: "HubSpot", github: "GitHub", exa: "Exa",
};
const CUSTOM_PREFIX = "custom:";

/** Capabilities that behave as tools the Agent can call (the rest are behaviours, e.g. memory). */
const BUILTIN_TOOL_IDS = ["web-search", "sandbox", "file-write", "ask-user", "sub-agent-delegation"];

function connectorName(connectorId: string): string {
  if (connectorId.startsWith(CUSTOM_PREFIX)) return customConnectorStore.get(connectorId.slice(CUSTOM_PREFIX.length))?.name ?? connectorId;
  return CONNECTOR_NAME[connectorId] ?? connectorId;
}

interface ConnectorEntry { id: string; name: string; unconnected: boolean; restricted: boolean }

function connectorEntry(agentId: string, connectorId: string): ConnectorEntry | undefined {
  const attachedConn = agentConnectorStore.list(agentId).find(c => c.connectorId === connectorId);
  if (!attachedConn) return undefined;
  const isCustom = connectorId.startsWith(CUSTOM_PREFIX);
  if (isCustom) {
    const cc = customConnectorStore.get(connectorId.slice(CUSTOM_PREFIX.length));
    if (!cc) return undefined;
    return { id: connectorId, name: cc.name, unconnected: false, restricted: !isConnectorAccessibleTo(cc.sharing, cc.ownerId, CURRENT_USER.id) };
  }
  // A Shared connector with no workspace account picked yet can't run — "Chưa kết nối".
  return { id: connectorId, name: connectorName(connectorId), unconnected: attachedConn.scope === "shared" && !attachedConn.accountId, restricted: false };
}

function skillEntries(agentId: string): { skill: Skill; off: boolean }[] {
  const own = agentSkillStore.list(agentId);
  const linked = agentSkillStore.listAttachedConsoleSkillIds(agentId)
    .map(id => skillStore.get(id))
    .filter((s): s is Skill => !!s && isSkillAccessibleTo(s.sharing, s.ownerId, CURRENT_USER.id));
  const seen = new Set<string>();
  return [...own, ...linked]
    .filter(s => (seen.has(s.id) ? false : (seen.add(s.id), true)))
    .map(skill => ({ skill, off: !agentSkillStore.isActive(agentId, skill.id) }));
}

function docState(d: { status?: string }): string | undefined {
  if (d.status === "processing" || d.status === "pending") return "Đang xử lý";
  if (d.status === "failed" || d.status === "invalid" || d.status === "cancelled") return "Xử lý lỗi";
  return undefined;
}

function docPath(kbId: string, doc: KnowledgeDocument, all: KnowledgeDocument[]): string[] {
  const chain: string[] = [];
  let cur = doc.folderId ? all.find(d => d.id === doc.folderId) : undefined;
  while (cur) { chain.unshift(cur.name); cur = cur.folderId ? all.find(d => d.id === cur!.folderId) : undefined; }
  return chain;
}

/* ───────────────────────── resolving a reference ───────────────────────── */

export type RefGlyph = "skill" | "tool" | "folder" | "file";
export interface ResolvedRef {
  token: string;
  kind: RefKind;
  status: "ok" | "missing" | "restricted";
  /** Chip text. "Tài nguyên bị hạn chế" when the viewer may not see the resource. */
  label: string;
  typeLabel: string;
  detail?: string;
  state?: string;
  glyph: RefGlyph;
}

const TYPE_LABEL: Record<RefKind, string> = {
  skill: "Skill", builtin: "Tool", connector: "Connector", tool: "Tool",
  kb: "Knowledge", folder: "Folder", file: "File", own: "Knowledge",
};
const GLYPH: Record<RefKind, RefGlyph> = {
  skill: "skill", builtin: "tool", connector: "tool", tool: "tool",
  kb: "folder", folder: "folder", file: "file", own: "file",
};

export function resolveRef(agentId: string, ref: ParsedRef): ResolvedRef {
  const base = { token: ref.token, kind: ref.kind, typeLabel: TYPE_LABEL[ref.kind], glyph: GLYPH[ref.kind] };
  const fallbackLabel = ref.hint || ref.payload.split("::").pop() || ref.payload;
  const missing = (): ResolvedRef => ({ ...base, status: "missing", label: fallbackLabel });
  const restricted = (): ResolvedRef => ({ ...base, status: "restricted", label: "Tài nguyên bị hạn chế" });
  const ok = (label: string, extra: Partial<ResolvedRef> = {}): ResolvedRef => ({ ...base, status: "ok", label, ...extra });

  switch (ref.kind) {
    case "skill": {
      const e = skillEntries(agentId).find(x => x.skill.id === ref.payload);
      if (e) return ok(e.skill.name, { detail: e.skill.description, state: e.off ? "Đang tắt" : undefined });
      const raw = skillStore.get(ref.payload);
      const attachedIds = agentSkillStore.listAttachedConsoleSkillIds(agentId);
      if (raw && attachedIds.includes(raw.id) && !isSkillAccessibleTo(raw.sharing, raw.ownerId, CURRENT_USER.id)) return restricted();
      return missing();
    }
    case "builtin": {
      const cap = AGENT_CAPABILITIES.find(c => c.id === ref.payload && BUILTIN_TOOL_IDS.includes(c.id));
      if (!cap) return missing();
      return ok(cap.name, { detail: cap.description, state: agentCapabilityStore.isOn(agentId, cap.id) ? undefined : "Đang tắt" });
    }
    case "connector": {
      const c = connectorEntry(agentId, ref.payload);
      if (!c) return missing();
      if (c.restricted) return restricted();
      return ok(c.name, { detail: `${actionsForConnector(c.id).length} tool`, state: c.unconnected ? "Chưa kết nối" : undefined });
    }
    case "tool": {
      const [connectorId, action] = ref.payload.split("::");
      const c = connectorEntry(agentId, connectorId);
      if (!c || !action || !actionsForConnector(connectorId).includes(action)) return missing();
      if (c.restricted) return restricted();
      return ok(`${c.name} › ${action}`, { detail: `Tool của ${c.name}`, state: c.unconnected ? "Chưa kết nối" : undefined });
    }
    case "kb": {
      if (ref.payload === OWN_KB_ID) return ok("Cá nhân", { detail: "Tri thức riêng của Agent này" });
      const kb = knowledgeBaseStore.get(ref.payload);
      if (kb && !isKbAccessibleTo(kb, CURRENT_USER.id)) return restricted();
      if (!kb || !knowledgeStore.listAttachedConsoleKbIds(agentId).includes(kb.id)) return missing();
      return ok(kb.name, { detail: kb.description, state: knowledgeStore.isKbActive(agentId, kb.id) ? undefined : "Đang tắt" });
    }
    case "folder":
    case "file": {
      const [kbId, docId] = ref.payload.split("::");
      const kb = knowledgeBaseStore.get(kbId);
      if (kb && !isKbAccessibleTo(kb, CURRENT_USER.id)) return restricted();
      if (!kb || !knowledgeStore.listAttachedConsoleKbIds(agentId).includes(kbId)) return missing();
      const all = knowledgeDocumentStore.list(kbId);
      const doc = all.find(d => d.id === docId && d.isFolder === (ref.kind === "folder"));
      if (!doc) return missing();
      const path = ["Knowledge", kb.name, ...docPath(kbId, doc, all)].join(" › ");
      return ok(doc.name, { detail: path, state: doc.isFolder ? undefined : docState(doc) });
    }
    case "own": {
      const item = knowledgeStore.get(agentId, ref.payload);
      if (!item) return missing();
      return ok(item.kind === "url" ? (item.title || item.name) : item.name, { detail: "Knowledge › Cá nhân", state: docState(item) });
    }
  }
}

export interface BrokenRef { ref: ResolvedRef; reason: string }

/** Every reference in `text` that no longer resolves (removed, deleted or not allowed). */
export function findBrokenRefs(agentId: string, text: string): BrokenRef[] {
  const out: BrokenRef[] = [];
  for (const seg of splitByRefs(text)) {
    if (seg.type !== "ref") continue;
    const r = resolveRef(agentId, seg.ref);
    if (r.status === "missing") out.push({ ref: r, reason: "Không còn gắn với Agent" });
    else if (r.status === "restricted") out.push({ ref: r, reason: "Không có quyền truy cập" });
  }
  return out;
}

/* ───────────────────────── "/" menu catalogue ───────────────────────── */

export type Category = "skills" | "knowledge" | "tools";
export const CATEGORY_LABEL: Record<Category, string> = { skills: "Skills", knowledge: "Knowledge", tools: "Tools" };
export const CATEGORY_SINGULAR: Record<Category, string> = { skills: "Skill", knowledge: "Knowledge", tools: "Tool" };
export const CATEGORY_ORDER: Category[] = ["skills", "knowledge", "tools"];

/** Where the menu is inside a category. No ids = the category's top level. */
export interface NavPath {
  cat: Category;
  kbId?: string;
  folderId?: string;
  connectorId?: string;
}

export interface MenuItem {
  key: string;
  token: string;
  label: string;
  sub?: string;
  state?: string;
  dim?: boolean;
  glyph: RefGlyph;
  emoji?: string;
  emojiBg?: string;
  /** Present when the row can be opened ("›"). */
  child?: NavPath;
}

export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

/** Lower is better; null = no match. Name prefix > word prefix > inside name > in the sub line. */
export function matchRank(item: MenuItem, q: string): number | null {
  const nq = normalize(q.trim());
  if (!nq) return 0;
  const name = normalize(item.label);
  if (name.startsWith(nq)) return 0;
  if (name.split(/[\s\-_./›]+/).some(w => w.startsWith(nq))) return 1;
  if (name.includes(nq)) return 2;
  if (item.sub && normalize(item.sub).includes(nq)) return 3;
  return null;
}

/** [start, end) ranges of `label` that match `q`, diacritic/case-insensitively. */
export function matchRange(label: string, q: string): [number, number] | null {
  const nq = normalize(q.trim());
  if (!nq) return null;
  let norm = "";
  const map: number[] = [];
  Array.from(label).forEach((ch, i) => { const n = normalize(ch); for (let k = 0; k < n.length; k++) { norm += n[k]; map.push(i); } });
  const at = norm.indexOf(nq);
  if (at < 0) return null;
  const chars = Array.from(label);
  const startChar = map[at];
  const endChar = map[at + nq.length - 1] + 1;
  const toIndex = (ci: number) => chars.slice(0, ci).join("").length;
  return [toIndex(startChar), toIndex(endChar)];
}

function skillItems(agentId: string): MenuItem[] {
  return skillEntries(agentId).map(({ skill, off }) => ({
    key: `skill:${skill.id}`, token: makeToken("skill", skill.id, skill.name),
    label: skill.name, sub: skill.description, state: off ? "Đang tắt" : undefined, dim: off,
    glyph: "skill" as const, emoji: skill.icon, emojiBg: skill.iconBg,
  }));
}

function builtinToolItems(agentId: string): MenuItem[] {
  return AGENT_CAPABILITIES.filter(c => BUILTIN_TOOL_IDS.includes(c.id)).map(c => {
    const off = !agentCapabilityStore.isOn(agentId, c.id);
    return { key: `builtin:${c.id}`, token: makeToken("builtin", c.id, c.name), label: c.name, sub: "Built-in", state: off ? "Đang tắt" : undefined, dim: off, glyph: "tool" as const };
  });
}

function connectorItems(agentId: string): MenuItem[] {
  return agentConnectorStore.list(agentId)
    .map(c => connectorEntry(agentId, c.connectorId))
    .filter((c): c is ConnectorEntry => !!c && !c.restricted)
    .map(c => ({
      key: `connector:${c.id}`, token: makeToken("connector", c.id, c.name), label: c.name,
      sub: `${actionsForConnector(c.id).length} tool`, state: c.unconnected ? "Chưa kết nối" : undefined, dim: c.unconnected,
      glyph: "tool" as const, child: { cat: "tools" as const, connectorId: c.id },
    }));
}

function actionItems(agentId: string, connectorId: string, withLocation: boolean): MenuItem[] {
  const c = connectorEntry(agentId, connectorId);
  if (!c) return [];
  return actionsForConnector(connectorId).map(action => ({
    key: `tool:${connectorId}::${action}`, token: makeToken("tool", `${connectorId}::${action}`, `${c.name} › ${action}`),
    label: action, sub: withLocation ? c.name : `Tool của ${c.name}`,
    state: c.unconnected ? "Chưa kết nối" : undefined, dim: c.unconnected, glyph: "tool" as const,
  }));
}

function attachedKbs(agentId: string) {
  return knowledgeStore.listAttachedConsoleKbIds(agentId)
    .map(id => knowledgeBaseStore.get(id))
    .filter((kb): kb is NonNullable<typeof kb> => !!kb && isKbAccessibleTo(kb, CURRENT_USER.id));
}

function ownItems(agentId: string, withLocation: boolean): MenuItem[] {
  return knowledgeStore.list(agentId).map(item => {
    const label = item.kind === "url" ? (item.title || item.name) : item.name;
    const state = docState(item);
    return {
      key: `own:${item.id}`, token: makeToken("own", item.id, label), label,
      sub: withLocation ? "Knowledge › Cá nhân" : (item.kind === "faq" ? "FAQ" : item.kind === "url" ? "Website" : "Tài liệu"),
      state, dim: !!state, glyph: "file" as const,
    };
  });
}

function knowledgeRootItems(agentId: string): MenuItem[] {
  const items: MenuItem[] = [];
  if (knowledgeStore.list(agentId).length > 0) {
    items.push({ key: "kb:own", token: makeToken("kb", OWN_KB_ID, "Cá nhân"), label: "Cá nhân", sub: "Tri thức riêng của Agent", glyph: "folder", child: { cat: "knowledge", kbId: OWN_KB_ID } });
  }
  for (const kb of attachedKbs(agentId)) {
    const off = !knowledgeStore.isKbActive(agentId, kb.id);
    items.push({ key: `kb:${kb.id}`, token: makeToken("kb", kb.id, kb.name), label: kb.name, sub: "Kho tri thức", state: off ? "Đang tắt" : undefined, dim: off, glyph: "folder", child: { cat: "knowledge", kbId: kb.id } });
  }
  return items;
}

function docItem(kbId: string, kbName: string, d: KnowledgeDocument, all: KnowledgeDocument[], withLocation: boolean): MenuItem {
  const state = d.isFolder ? undefined : docState(d);
  const where = ["Knowledge", kbName, ...docPath(kbId, d, all)].join(" › ");
  return {
    key: `${d.isFolder ? "folder" : "file"}:${kbId}::${d.id}`,
    token: makeToken(d.isFolder ? "folder" : "file", `${kbId}::${d.id}`, d.name),
    label: d.name, sub: withLocation ? where : (d.isFolder ? "Thư mục" : undefined),
    state, dim: !!state, glyph: d.isFolder ? "folder" : "file",
    child: d.isFolder ? { cat: "knowledge", kbId, folderId: d.id } : undefined,
  };
}

/** One level of a category's tree (what the menu shows when you open it without a search). */
export function listLevel(agentId: string, nav: NavPath): MenuItem[] {
  if (nav.cat === "skills") return skillItems(agentId);
  if (nav.cat === "tools") {
    if (nav.connectorId) return actionItems(agentId, nav.connectorId, false);
    return [...builtinToolItems(agentId), ...connectorItems(agentId)];
  }
  if (!nav.kbId) return knowledgeRootItems(agentId);
  if (nav.kbId === OWN_KB_ID) return ownItems(agentId, false);
  const kb = knowledgeBaseStore.get(nav.kbId);
  if (!kb) return [];
  const all = knowledgeDocumentStore.list(nav.kbId);
  return all
    .filter(d => (d.folderId ?? null) === (nav.folderId ?? null))
    .sort((a, b) => (a.isFolder === b.isFolder ? a.name.localeCompare(b.name, "vi") : a.isFolder ? -1 : 1))
    .map(d => docItem(nav.kbId!, kb.name, d, all, false));
}

/** Every item anywhere under a category, flattened, each carrying its location in `sub`. */
function flatCategory(agentId: string, cat: Category): MenuItem[] {
  if (cat === "skills") return skillItems(agentId);
  if (cat === "tools") {
    const conns = connectorItems(agentId).map(c => ({ ...c, child: undefined }));
    const actions = agentConnectorStore.list(agentId).flatMap(c => actionItems(agentId, c.connectorId, true));
    return [...builtinToolItems(agentId), ...conns, ...actions];
  }
  const out: MenuItem[] = knowledgeRootItems(agentId).map(i => ({ ...i, child: undefined }));
  out.push(...ownItems(agentId, true));
  for (const kb of attachedKbs(agentId)) {
    const all = knowledgeDocumentStore.list(kb.id);
    out.push(...all.map(d => ({ ...docItem(kb.id, kb.name, d, all, true), child: undefined })));
  }
  return out;
}

export function searchCategory(agentId: string, cat: Category, q: string): MenuItem[] {
  return flatCategory(agentId, cat)
    .map(item => ({ item, rank: matchRank(item, q) }))
    .filter((x): x is { item: MenuItem; rank: number } => x.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.item.label.localeCompare(b.item.label, "vi"))
    .map(x => x.item);
}

export function categoryCount(agentId: string, cat: Category): number {
  return listLevel(agentId, { cat }).length;
}

export function breadcrumb(agentId: string, nav: NavPath): string[] {
  const trail = [CATEGORY_LABEL[nav.cat]];
  if (nav.cat === "tools" && nav.connectorId) trail.push(connectorName(nav.connectorId));
  if (nav.cat === "knowledge" && nav.kbId) {
    trail.push(nav.kbId === OWN_KB_ID ? "Cá nhân" : knowledgeBaseStore.get(nav.kbId)?.name ?? "…");
    if (nav.folderId && nav.kbId !== OWN_KB_ID) {
      const all = knowledgeDocumentStore.list(nav.kbId);
      const folder = all.find(d => d.id === nav.folderId);
      if (folder) trail.push(...docPath(nav.kbId, folder, all), folder.name);
    }
  }
  return trail;
}

/** One level up from `nav`, or null when `nav` is already a category's top level. */
export function parentNav(nav: NavPath): NavPath | null {
  if (nav.cat === "tools" && nav.connectorId) return { cat: "tools" };
  if (nav.cat === "knowledge" && nav.kbId) {
    if (nav.folderId && nav.kbId !== OWN_KB_ID) {
      const parent = knowledgeDocumentStore.list(nav.kbId).find(d => d.id === nav.folderId)?.folderId;
      return parent ? { cat: "knowledge", kbId: nav.kbId, folderId: parent } : { cat: "knowledge", kbId: nav.kbId };
    }
    return { cat: "knowledge" };
  }
  return null;
}
