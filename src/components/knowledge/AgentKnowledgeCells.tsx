// Small shared pieces originally built for the 3 Console tab components (KnowledgeDocumentsTab/
// KnowledgeWebsiteTab/KnowledgeFaqTab) when they're rendered in "agent mode" (an `agentId` prop
// is passed instead of/alongside `kbId`) — the Agent Details "Tri thức của Agent" screen reuses
// those exact components, scoped to one Agent's attached content, with two extra columns Console
// itself never shows: "Sở hữu" (this view mixes items from many KBs with different owners) and
// "Kích hoạt" (per-Agent on/off, distinct from being attached at all). OwnershipTag is now also
// the plain ownership tag used on the top-level Console Knowledge Base list cards.
import { Switch } from "@/components/ui/switch";
import { CURRENT_USER, type Sharing } from "./knowledgeBaseStore";

/** True when the current user can manage this item (owner, or granted "edit" access under its
 * "Quyền quản lý tài liệu" sharing) — gates whether "Xóa" is offered in the agent-mode row menu. */
export function agentHasEditRights(updatedBy: string, sharing?: Sharing): boolean {
  if (updatedBy === CURRENT_USER.name) return true;
  if (!sharing) return false;
  if (sharing.mode === "all") return true;
  return sharing.mode === "specific" && sharing.people.some(p => p.userId === CURRENT_USER.id && p.access === "edit");
}

/** The one ownership tag used everywhere in this feature: plain caption text, never a colored
 * pill — "Của tôi" when the current user owns the item, otherwise "Được chia sẻ · <owner>". */
export function OwnershipTag({ isOwner, ownerName }: { isOwner: boolean; ownerName: string }) {
  return isOwner
    ? <span className="text-xs text-muted-foreground whitespace-nowrap">Của tôi</span>
    : <span className="text-xs text-primary font-medium whitespace-nowrap">Được chia sẻ · {ownerName}</span>;
}

/** "Sở hữu" column on the Agent-mode tab tables — same tag, keyed off a record's `updatedBy` name. */
export function AgentOwnerCell({ updatedBy }: { updatedBy: string }) {
  return <OwnershipTag isOwner={updatedBy === CURRENT_USER.name} ownerName={updatedBy} />;
}

/** "Kích hoạt" column — turning it off stops only this Agent from drawing on the item to answer;
 * it stays attached, stays listed, and stays active for every other Agent. */
export function AgentEnabledToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return <Switch checked={enabled} onCheckedChange={onChange} aria-label="Kích hoạt" />;
}
