import { useMemo } from "react";
import { toast } from "sonner";
import { getAgent } from "@/components/configure/agentStore";
import { skillStore } from "@/components/configure/skillStore";
import { agentSkillStore } from "@/components/configure/agentSkillStore";
import { guardrailConsoleStore } from "@/components/configure/guardrailConsoleStore";
import { agentGuardrailStore } from "@/components/configure/agentGuardrailStore";
import { customConnectorStore } from "@/components/configure/customConnectorStore";
import { customApiToolStore } from "@/components/configure/customApiToolStore";
import { knowledgeBaseStore, CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { notificationStore } from "@/components/notifications/notificationStore";
import { agentsBlockingUnshare, agentsUsing, ResourceInUseDialog } from "./resourceInUseGuard";
import { REVOKED_COPY, type RevocableType } from "./revokedResources";

/**
 * Space library actions on a resource (Skill / Guardrail / Connector / API Tool / Knowledge),
 * 07/10 - 08/10:
 *
 * - "Tắt chia sẻ": the resource stays in the Space; only its owner and Space Admins see it
 *   (chip "Chưa chia sẻ"). Other people's Agents linking it show "Không khả dụng".
 * - "Gỡ khỏi Space" (created in an Agent that still links it): the resource goes back into that
 *   Agent as its own - same as "Chỉ Agent này" inside the Agent. Not called "Xóa", since nothing
 *   is lost: it is still in that Agent.
 * - "Xóa" (created on the Space): removed for good. Agents linking it show "Không khả dụng".
 * - A Space Admin may do all of this to anyone's resource; the owner gets a bell notification.
 */

export interface SpaceActor { id: string; name: string; isAdmin: boolean }

/** The signed-in user, as the person acting on the Space library. */
export function useSpaceActor(): SpaceActor {
  const { role, userId } = useMyPermissions();
  const { tree } = useOrg();
  const name = useMemo(() => collectMembers(tree).find(m => m.id === userId)?.name ?? "Quản trị viên Space", [tree, userId]);
  return { id: userId, name, isAdmin: role?.id === "admin" };
}

/** Owner or Space Admin - who may turn sharing off / delete on the Space library. */
export function canManageSpaceResource(actor: SpaceActor, ownerId: string | undefined): boolean {
  return actor.isAdmin || (!!ownerId && ownerId === actor.id);
}

/** The Agent that keeps the resource when it leaves the Space: the Agent it was created in, as
 * long as that Agent still links it. */
export function keptAgentFor(originAgentId: string | undefined, attachedAgentIds: string[] | undefined): string | undefined {
  return originAgentId && (attachedAgentIds ?? []).includes(originAgentId) ? originAgentId : undefined;
}

/** Menu label: "Gỡ khỏi Space" when an Agent keeps the resource, else "Xóa". */
export function spaceDeleteLabel(res: { originAgentId?: string; attachedByAgentIds?: string[] }): string {
  return keptAgentFor(res.originAgentId, res.attachedByAgentIds) ? "Gỡ khỏi Space" : "Xóa";
}

const BY = () => ({ id: CURRENT_USER.id, name: CURRENT_USER.name });

/** "Chỉ Agent này" / "Gỡ khỏi Space": the Space resource goes back into the Agent it came from.
 * Skills and guardrails become that Agent's own again; a knowledge base becomes one of its own
 * knowledge bases; connectors and API Tools stay linked to it but leave the library. Other Agents
 * still linking it show "Không khả dụng - Đã được kéo về Agent …". */
export function takeBackToAgent(type: RevocableType, id: string, agentId: string, by: { id: string; name: string } = BY()) {
  switch (type) {
    case "skill": agentSkillStore.takeBackToAgent(agentId, id, by); return;
    case "guardrail": agentGuardrailStore.takeBackToAgent(agentId, id, by); return;
    case "knowledge": knowledgeBaseStore.removeFromSpace(id, by, agentId, agentId); return;
    case "connector": customConnectorStore.removeFromSpace(id, by, agentId, agentId); return;
    case "apiTool": customApiToolStore.removeFromSpace(id, by, agentId, agentId); return;
  }
}

const STORES = { skill: skillStore, guardrail: guardrailConsoleStore, knowledge: knowledgeBaseStore, connector: customConnectorStore, apiTool: customApiToolStore };

type SpaceRes = { id: string; name: string; ownerId?: string; originAgentId?: string; attachedByAgentIds?: string[] };

/** Runs the confirmed "Gỡ khỏi Space" / "Xóa", notifies the owner, shows the toast. */
export function performSpaceDelete(type: RevocableType, res: SpaceRes, actor: SpaceActor, noun: string, href: string) {
  const kept = keptAgentFor(res.originAgentId, res.attachedByAgentIds);
  const by = { id: actor.id, name: actor.name };
  if (kept) takeBackToAgent(type, res.id, kept, by);
  else if ((res.attachedByAgentIds ?? []).length) STORES[type].removeFromSpace(res.id, by);
  else STORES[type].remove(res.id);
  notifySpaceOwner(kept ? "resource_removed" : "resource_deleted", actor, res, noun, href);
  if (kept) toast.success(`Đã gỡ ${noun} khỏi Space. Bạn vẫn tìm thấy trong Agent "${getAgent(kept).name}".`);
  else toast.success(`Đã xóa ${noun} "${res.name}".`);
}

/** Bell notification to the owner when a Space Admin acts on their resource. */
export function notifySpaceOwner(kind: "resource_unshared" | "resource_deleted" | "resource_removed", actor: SpaceActor, res: { id: string; name: string; ownerId?: string }, noun: string, href: string) {
  if (!res.ownerId || res.ownerId === actor.id) return;
  const verb = kind === "resource_deleted" ? ` đã xóa ${noun} ` : kind === "resource_removed" ? ` đã gỡ ${noun} ` : ` đã tắt chia sẻ ${noun} `;
  const tail = kind === "resource_unshared" ? "" : " khỏi Space";
  notificationStore.push({
    kind, recipients: [res.ownerId], actorId: actor.id, actorName: actor.name,
    title: `${actor.name}${verb}${res.name}${tail}`,
    segments: [[actor.name, true], [verb], [res.name, true], ...(tail ? [[tail] as [string]] : [])],
    href, resourceId: res.id,
  });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Confirmation for "Gỡ khỏi Space" / "Xóa" on the Space library. `noun` is lower case. */
export function SpaceDeleteDialog({ open, onClose, noun, name, originAgentId, attachedAgentIds, onConfirm }: {
  open: boolean;
  onClose: () => void;
  noun: string;
  name: string;
  originAgentId?: string;
  attachedAgentIds?: string[];
  onConfirm: () => void;
}) {
  const kept = keptAgentFor(originAgentId, attachedAgentIds);
  const others = agentsUsing((attachedAgentIds ?? []).filter(id => id !== kept));
  const othersNote = others.length
    ? ` Các Agent dưới đây sẽ báo "Không khả dụng" và chưa publish được cho tới khi gỡ ${noun} ra.`
    : "";
  const title = kept ? `Gỡ ${noun} "${name}" khỏi Space?` : `Xóa ${noun} "${name}"?`;
  const description = kept
    ? `${cap(noun)} vẫn nằm trong Agent "${getAgent(kept).name}", bạn tìm lại được ở đó. Người khác sẽ không thấy ${noun} này trong thư viện nữa.${othersNote}`
    : `${cap(noun)} sẽ bị xóa khỏi Space và khỏi mọi Agent đang dùng. Hành động này không thể hoàn tác.${othersNote}`;
  return (
    <ResourceInUseDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      agents={others}
      onConfirm={() => { onConfirm(); onClose(); }}
      confirmLabel={kept ? "Gỡ khỏi Space" : "Xóa"}
    />
  );
}

/** "Tắt chia sẻ" straight from the menu "…": one confirmation, listing the Agents of other people
 * that lose the resource (they show "Không khả dụng"). */
export function SpaceUnshareDialog({ open, onClose, noun, name, ownerName, ownerId, attachedAgentIds, actor, onConfirm }: {
  open: boolean;
  onClose: () => void;
  noun: string;
  name: string;
  ownerName?: string;
  ownerId?: string;
  attachedAgentIds?: string[];
  actor: SpaceActor;
  onConfirm: () => void;
}) {
  const it = `${noun} này`;
  const losing = agentsBlockingUnshare(attachedAgentIds, ownerId, { mode: "private", people: [] });
  const who = ownerId && ownerId !== actor.id ? (ownerName ?? "chủ sở hữu") : "bạn";
  return (
    <ResourceInUseDialog
      open={open}
      onClose={onClose}
      title={losing.length ? REVOKED_COPY.confirmTitle(it) : `Tắt chia sẻ ${noun} "${name}"?`}
      description={`${cap(noun)} vẫn ở Space nhưng chỉ ${who} liên kết được vào Agent. Người khác sẽ không liên kết được vào Agent của họ nữa.${losing.length ? ` Các Agent dưới đây sẽ báo "Không khả dụng" và chưa publish được cho tới khi gỡ ${noun} ra.` : ""}`}
      agents={losing}
      onConfirm={() => { onConfirm(); onClose(); toast.success("Đã tắt chia sẻ."); }}
      confirmLabel="Tắt chia sẻ"
    />
  );
}

type Shareable = { id: string; originAgentId?: string; sharing?: { mode: string; people?: unknown[] } };

/** Inside an Agent: the "Chỉ Agent này" option exists only for a resource that Agent created. */
export function agentOnlyForIn(res: { originAgentId?: string }, agentId: string): string | undefined {
  return res.originAgentId === agentId ? agentId : undefined;
}

/** Saves "Ai được dùng" from inside an Agent. In the Agent a Space resource came from, turning
 * sharing off takes it back into that Agent; anywhere else it only changes who may use it. */
export function saveSharingInAgent<S extends { mode: string }>(type: RevocableType, res: Shareable, agentId: string, sharing: S, update: (s: S) => void) {
  const wasShared = !!res.sharing && res.sharing.mode !== "private";
  if (sharing.mode === "private" && wasShared && res.originAgentId === agentId) takeBackToAgent(type, res.id, agentId);
  else update(sharing);
}
