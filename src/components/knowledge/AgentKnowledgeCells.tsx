// Small shared pieces used only by the 3 Console tab components (KnowledgeDocumentsTab/
// KnowledgeWebsiteTab/KnowledgeFaqTab) when they're rendered in "agent mode" (an `agentId` prop
// is passed instead of/alongside `kbId`) — the Agent Details "Tri thức của Agent" screen reuses
// those exact components, scoped to one Agent's attached content, with two extra columns Console
// itself never shows: "Sở hữu" (this view mixes items from many KBs with different owners) and
// "Kích hoạt" (per-Agent on/off, distinct from being attached at all).
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

/** "Sở hữu" column — plain caption text, never a colored pill. */
export function AgentOwnerCell({ updatedBy }: { updatedBy: string }) {
  return updatedBy === CURRENT_USER.name
    ? <span className="text-xs text-muted-foreground whitespace-nowrap">Của tôi</span>
    : <span className="text-xs text-primary font-medium whitespace-nowrap">Được chia sẻ · {updatedBy}</span>;
}

/** "Kích hoạt" column — turning it off stops only this Agent from drawing on the item to answer;
 * it stays attached, stays listed, and stays active for every other Agent. */
export function AgentEnabledToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return <Switch checked={enabled} onCheckedChange={onChange} aria-label="Kích hoạt" />;
}
