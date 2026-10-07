import { useMemo } from "react";
import { getAgent } from "@/components/configure/agentStore";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { notificationStore } from "@/components/notifications/notificationStore";
import { agentsUsing, ResourceInUseDialog } from "./resourceInUseGuard";

/**
 * "Xóa" and Admin rights on the Space library (07/10), shared by Skill / Guardrail / Connector /
 * API Tool / Knowledge.
 *
 * - Turning "Chia sẻ lên Space" off keeps the resource in the Space; only its owner and Space
 *   Admins see it (chip "Chưa chia sẻ").
 * - Deleting a resource that was created in an Agent (originAgentId, and that Agent still links
 *   it) removes it from the Space only - that Agent keeps using it. Every other Agent linking it
 *   shows "Đã bị xóa" and can't be published until it is detached.
 * - Deleting a resource created on the Space removes it everywhere: every Agent linking it,
 *   the owner's included, shows "Đã bị xóa".
 * - A Space Admin may turn sharing off and delete anyone's resource; the owner gets a
 *   notification (bell).
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

/** The Agent that keeps the resource when it is deleted from the Space: the Agent it was created
 * in, as long as that Agent still links it. */
export function keptAgentFor(originAgentId: string | undefined, attachedAgentIds: string[] | undefined): string | undefined {
  return originAgentId && (attachedAgentIds ?? []).includes(originAgentId) ? originAgentId : undefined;
}

interface SpaceDeletable {
  remove(id: string): void;
  removeFromSpace(id: string, by: { id: string; name: string }, keptForAgentId?: string): void;
}

/** Deletes from the Space library. Nothing links it and no Agent keeps it: removed for good.
 * Otherwise the record stays so linking Agents can show "Đã bị xóa". */
export function deleteFromSpace(store: SpaceDeletable, res: { id: string; originAgentId?: string; attachedByAgentIds?: string[] }, actor: SpaceActor) {
  const kept = keptAgentFor(res.originAgentId, res.attachedByAgentIds);
  if (!kept && !(res.attachedByAgentIds ?? []).length) store.remove(res.id);
  else store.removeFromSpace(res.id, { id: actor.id, name: actor.name }, kept);
}

/** Bell notification to the owner when a Space Admin acts on their resource. */
export function notifySpaceOwner(kind: "resource_unshared" | "resource_deleted", actor: SpaceActor, res: { id: string; name: string; ownerId?: string }, noun: string, href: string) {
  if (!res.ownerId || res.ownerId === actor.id) return;
  const verb = kind === "resource_deleted" ? ` đã xóa ${noun} ` : ` đã tắt chia sẻ ${noun} `;
  const tail = kind === "resource_deleted" ? " khỏi Space" : "";
  notificationStore.push({
    kind, recipients: [res.ownerId], actorId: actor.id, actorName: actor.name,
    title: `${actor.name}${verb}${res.name}${tail}`,
    segments: [[actor.name, true], [verb], [res.name, true], ...(tail ? [[tail] as [string]] : [])],
    href, resourceId: res.id,
  });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Confirmation for "Xóa" on the Space library. `noun` is lower case: "skill", "kho tri thức"… */
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
    ? ` Các Agent dưới đây sẽ báo "Đã bị xóa" và chưa publish được cho tới khi gỡ ${noun} ra.`
    : "";
  const title = kept ? `Xóa ${noun} "${name}" khỏi Space?` : `Xóa vĩnh viễn ${noun} "${name}"?`;
  const description = kept
    ? `${cap(noun)} chỉ bị xóa khỏi Space. Agent "${getAgent(kept).name}" tạo ra ${noun} này vẫn giữ và dùng tiếp.${othersNote}`
    : `${cap(noun)} sẽ bị xóa khỏi Space và khỏi mọi Agent đang dùng. Hành động này không thể hoàn tác.${othersNote}`;
  return (
    <ResourceInUseDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      agents={others}
      onConfirm={() => { onConfirm(); onClose(); }}
      confirmLabel={kept ? "Xóa khỏi Space" : "Xóa vĩnh viễn"}
    />
  );
}
