import { useMemo } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAgent, type AgentRecord } from "@/components/configure/agentStore";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";

/**
 * "Resource đang được Agent dùng" guard, shared by Skill / Guardrail / Connector / Knowledge.
 *
 * Product rule: a shared resource is a live reference, not a copy — an Agent that attached it
 * keeps calling the owner's original. So the owner may NOT
 *   - narrow sharing so that someone whose Agent uses the resource loses access, or
 *   - delete the resource while any Agent still uses it,
 * until those Agents are detached. Widening sharing is never blocked, and Agents belonging to
 * the resource owner (or to people who keep access) never block a sharing change.
 * Admins can still manage every Agent, which is the escape hatch — no force-detach here.
 */

/** Shape every module's sharing object already has (skill/guardrail/connector/knowledge). */
export interface UsageSharing {
  mode: "private" | "all" | "specific";
  people: { userId: string }[];
}

function canUse(sharing: UsageSharing, resourceOwnerId: string, userId: string): boolean {
  if (userId === resourceOwnerId) return true;
  if (sharing.mode === "all") return true;
  if (sharing.mode === "specific") return sharing.people.some(p => p.userId === userId);
  return false;
}

/** Agents (attached to the resource) whose owner would lose access under `next` sharing. */
export function agentsBlockingUnshare(
  attachedAgentIds: string[] | undefined,
  resourceOwnerId: string | undefined,
  next: UsageSharing,
): AgentRecord[] {
  if (!attachedAgentIds?.length || !resourceOwnerId) return [];
  return attachedAgentIds
    .map(id => getAgent(id))
    .filter(a => !!a.ownerId && a.ownerId !== resourceOwnerId && !canUse(next, resourceOwnerId, a.ownerId));
}

/** Every Agent currently using the resource — deleting is blocked while this is non-empty. */
export function agentsUsing(attachedAgentIds: string[] | undefined): AgentRecord[] {
  return (attachedAgentIds ?? []).map(id => getAgent(id));
}

/** Blocking notice: lists the Agents (and who owns each) that must detach the resource first.
 * One button only — there is nothing to confirm, the action simply isn't allowed yet. */
export function ResourceInUseDialog({
  open, onClose, title, description, agents,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  agents: AgentRecord[];
}) {
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const ownerName = (id?: string) => members.find(m => m.id === id)?.name ?? "—";

  return (
    <AlertDialog open={open} onOpenChange={v => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {agents.length > 0 && (
        <div className="rounded-lg border border-border divide-y divide-border max-h-56 overflow-y-auto">
          {agents.map(a => (
            <div key={a.id} className="flex items-center gap-2.5 px-3 py-2.5">
              <span className="w-7 h-7 rounded-lg bg-surface-muted flex items-center justify-center text-sm shrink-0">{a.emoji}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{a.name}</div>
                <div className="text-xs text-muted-foreground truncate">Chủ sở hữu: {ownerName(a.ownerId)}</div>
              </div>
            </div>
          ))}
        </div>
        )}
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Đã hiểu</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
