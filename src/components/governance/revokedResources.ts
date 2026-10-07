// "Đã bị thu hồi" - a Space resource an Agent still links to, after its owner took the Agent's
// access away (narrowed "Ai được dùng" or turned sharing off).
//
// Product rule (06/10): the owner may narrow or turn off sharing even while other Agents use the
// resource. Nothing is detached automatically. Instead every Agent that lost access shows the
// resource in red (Agent details, the right-hand Configuration panel, Instructions chips, the
// left nav and the "Sẵn sàng publish" checklist), and cannot be published until the Builder
// detaches it - or the owner shares it again.
//
// "Lost access" is judged against the Agent's owner: the Agent keeps the resource while its owner
// may still use it (owner of the resource, "Cả Space", or in the "Người cụ thể" list). A knowledge
// base turned back into one Agent's own knowledge ("Chỉ Agent này") is lost to every other Agent.
//
// "Đã bị xóa" (07/10): the owner or a Space Admin deleted the resource from the Space library.
// Every Agent still linking it shows it in red the same way - except the Agent it was created in
// (deletedFromSpace.keptForAgentId), which keeps using it.
import { getAgent } from "@/components/configure/agentStore";
import { skillStore } from "@/components/configure/skillStore";
import { agentSkillStore } from "@/components/configure/agentSkillStore";
import { guardrailConsoleStore } from "@/components/configure/guardrailConsoleStore";
import { agentGuardrailStore } from "@/components/configure/agentGuardrailStore";
import { customConnectorStore } from "@/components/configure/customConnectorStore";
import { agentConnectorStore } from "@/components/configure/agentConnectorStore";
import { customApiToolStore } from "@/components/configure/customApiToolStore";

/** Same prefixes AgentBuilder uses for Space connectors / API Tools in agentConnectorStore. */
const CUSTOM_CONNECTOR_PREFIX = "custom:";
const API_TOOL_PREFIX = "apitool:";
import { knowledgeBaseStore, CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { knowledgeStore } from "@/components/knowledge/knowledgeStore";

export type RevocableType = "skill" | "knowledge" | "guardrail" | "connector" | "apiTool";

export interface RevokedResource {
  type: RevocableType;
  id: string;
  name: string;
  ownerName: string;
  /** Set when the resource was deleted from the Space (not just unshared): who deleted it. */
  deletedBy?: string;
}

interface UsageSharing { mode: "private" | "all" | "specific"; people: { userId: string }[] }
interface Revocable {
  ownerId?: string; ownerName?: string; sharing?: UsageSharing; agentOnlyFor?: string;
  deletedFromSpace?: { byName: string; keptForAgentId?: string };
}

export function canUseShared(sharing: UsageSharing, resourceOwnerId: string, userId: string): boolean {
  if (userId === resourceOwnerId) return true;
  if (sharing.mode === "all") return true;
  if (sharing.mode === "specific") return sharing.people.some(p => p.userId === userId);
  return false;
}

function agentOwnerId(agentId: string): string {
  return getAgent(agentId).ownerId ?? CURRENT_USER.id;
}

/** True when `agentId` links to this resource but its owner may no longer use it. */
export function isRevokedFor(agentId: string, res: Revocable | undefined): boolean {
  if (!res) return false;
  if (res.deletedFromSpace) return res.deletedFromSpace.keptForAgentId !== agentId;
  if (!res.sharing || !res.ownerId) return false;
  if (res.agentOnlyFor) return res.agentOnlyFor !== agentId;
  return !canUseShared(res.sharing, res.ownerId, agentOwnerId(agentId));
}

function get(type: RevocableType, id: string): (Revocable & { name: string; mandatory?: boolean }) | undefined {
  switch (type) {
    case "skill": return skillStore.get(id);
    case "knowledge": return knowledgeBaseStore.get(id);
    case "guardrail": return guardrailConsoleStore.get(id);
    case "connector": return customConnectorStore.get(id);
    case "apiTool": return customApiToolStore.get(id);
  }
}

/** Is this linked resource revoked for the Agent? (Unknown ids and mandatory guardrails: no.) */
export function isResourceRevoked(agentId: string, type: RevocableType, id: string): boolean {
  const res = get(type, id);
  if (!res || res.mandatory) return false;
  return isRevokedFor(agentId, res);
}

/** Every linked resource of the Agent that has been revoked, in sidebar order. */
export function listRevokedResources(agentId: string): RevokedResource[] {
  const out: RevokedResource[] = [];
  const push = (type: RevocableType, id: string) => {
    const res = get(type, id);
    if (!res || res.mandatory || !isRevokedFor(agentId, res)) return;
    out.push({ type, id, name: res.name, ownerName: res.ownerName ?? "Chủ sở hữu", deletedBy: res.deletedFromSpace?.byName });
  };
  for (const id of agentSkillStore.listAttachedConsoleSkillIds(agentId)) push("skill", id);
  for (const id of knowledgeStore.listAttachedConsoleKbIds(agentId)) push("knowledge", id);
  for (const id of agentGuardrailStore.listAttachedConsoleGuardrailIds(agentId)) push("guardrail", id);
  for (const c of agentConnectorStore.list(agentId)) {
    if (c.connectorId.startsWith(CUSTOM_CONNECTOR_PREFIX)) push("connector", c.connectorId.slice(CUSTOM_CONNECTOR_PREFIX.length));
    else if (c.connectorId.startsWith(API_TOOL_PREFIX)) push("apiTool", c.connectorId.slice(API_TOOL_PREFIX.length));
  }
  return out;
}

const NOUN: Record<RevocableType, string> = { skill: "skill", knowledge: "kho tri thức", guardrail: "guardrail", connector: "kết nối", apiTool: "API Tool" };

/** Who deleted this linked resource from the Space, when that's why it's red (else undefined). */
export function deletedFromSpaceBy(type: RevocableType, id: string): string | undefined {
  return get(type, id)?.deletedFromSpace?.byName;
}

export const REVOKED_COPY = {
  chip: "Đã bị thu hồi",
  chipDeleted: "Đã bị xóa",
  tooltipDeleted: (byName: string, type: RevocableType) =>
    `${byName} đã xóa ${NOUN[type]} này khỏi Space. Gỡ khỏi Agent để publish được.`,
  tooltip: (ownerName: string, type: RevocableType) =>
    `${ownerName} đã thu hồi quyền dùng ${NOUN[type]} này. Gỡ khỏi Agent hoặc nhờ chủ sở hữu chia sẻ lại.`,
  banner: (n: number) => `${n} thành phần đã bị thu hồi hoặc xóa khỏi Space. Gỡ khỏi Agent để publish được.`,
  checklist: (n: number) => `Gỡ ${n} thành phần đã bị thu hồi hoặc xóa`,
  publishBlocked: (items: { name: string }[]) =>
    `Không thể publish - Agent đang dùng ${items.length} thành phần đã bị thu hồi hoặc xóa khỏi Space: ${items.map(i => i.name).join(", ")}. Gỡ thành phần này khỏi Agent trước khi publish.`,
  /** Owner side: confirming a narrowing that takes the resource away from Agents using it. */
  confirmTitle: (it: string) => `Thu hồi quyền dùng ${it}?`,
  confirmBody: (n: number, it: string, noun: string) =>
    `${n} Agent đang dùng ${it} sẽ mất quyền dùng. Các Agent này không publish được cho tới khi gỡ ${noun}, người xây Agent sẽ thấy cảnh báo trong Agent.`,
  confirmAction: "Vẫn thu hồi",
};
