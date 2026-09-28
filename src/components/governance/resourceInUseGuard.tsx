import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAgent, type AgentRecord } from "@/components/configure/agentStore";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";

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
  const { userId: meId } = useMyPermissions();
  const ownerName = (id?: string) =>
    id && id === meId ? "Bạn" : members.find(m => m.id === id)?.name ?? "Không rõ chủ sở hữu";
  const groups = useMemo(() => {
    const byOwner = new Map<string | undefined, AgentRecord[]>();
    for (const a of agents) byOwner.set(a.ownerId, [...(byOwner.get(a.ownerId) ?? []), a]);
    return [...byOwner.entries()]
      .map(([ownerId, list]) => ({ ownerId, agents: list }))
      // The viewer's own Agents first (the one group they can fix themselves), then largest first.
      .sort((x, y) => Number(y.ownerId === meId) - Number(x.ownerId === meId) || y.agents.length - x.agents.length);
  }, [agents, meId]);
  // Collapsible per owner. Each time the dialog opens: a single owner is shown expanded; with
  // several owners every group starts collapsed to "name · N Agent", so the full list of people
  // who must act fits at a glance (expanding even one big group pushed the others out of view).
  const groupKey = (ownerId?: string) => ownerId ?? "unknown";
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (open) setExpanded(new Set(groups.length === 1 ? [groupKey(groups[0].ownerId)] : []));
  }, [open, groups]);
  const toggle = (ownerId?: string) => setExpanded(prev => {
    const next = new Set(prev);
    const k = groupKey(ownerId);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  return (
    <AlertDialog open={open} onOpenChange={v => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {agents.length > 0 && (
          // min-w-0: AlertDialogContent is a CSS grid, and a grid item defaults to min-width:auto —
          // without it one long Agent name widens the list past the dialog edge instead of truncating.
          <div className="space-y-2 min-w-0">
            {/* One line summary first, so the size of the problem is clear before the list. */}
            <p className="text-xs text-muted-foreground">
              {agents.length} Agent · của {groups.length} người
            </p>
            {/* Grouped by owner (who has to act), biggest group first. The list scrolls inside a
             * fixed-height box, so 3 Agents or 300 never push the dialog off-screen; group headers
             * stay pinned while scrolling so every row still reads "whose Agent is this". */}
            <div className="rounded-lg border border-border max-h-64 overflow-y-auto">
              {groups.map(g => (
                <div key={groupKey(g.ownerId)} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => toggle(g.ownerId)}
                    aria-expanded={expanded.has(groupKey(g.ownerId))}
                    className="sticky top-0 z-10 w-full flex items-center gap-2 bg-surface-muted hover:bg-surface-sunken px-3 py-2 min-h-10 text-left cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-muted-foreground transition-transform duration-150 ${expanded.has(groupKey(g.ownerId)) ? "" : "-rotate-90"}`}
                    />
                    <span className="text-xs font-semibold truncate min-w-0 flex-1">{ownerName(g.ownerId)}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{g.agents.length} Agent</span>
                  </button>
                  {expanded.has(groupKey(g.ownerId)) && (
                    <div className="py-1">
                      {g.agents.map(a => (
                        // pl-[34px] = px-3 (12) + chevron (14) + gap-2 (8): Agent rows line up under
                        // the owner's name, so the chevron column reads as the group's spine.
                        <div key={a.id} className="flex items-center gap-2 pl-[34px] pr-3 py-1.5">
                          <span className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center text-xs shrink-0">{a.emoji}</span>
                          <span className="text-sm truncate min-w-0" title={a.name}>{a.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Đã hiểu</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
