import { isAccessibleTo } from "./skillSharing";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import type { Skill } from "./skillStore";

/** Owner/sharing chip pair for a skill detail page or Agent sidebar — same pattern as
 * Knowledge's/Guardrails' equivalents. Used only where there's no ownership filter tab already
 * establishing that context (the Skills list has its own local, tab-aware chip instead — see
 * ShareStatusChip in Skills.tsx). */
export default function SkillOwnershipTag({ skill, userId }: { skill: Skill; userId: string }) {
  // Roles that see every skill in the Console (View = All in Console) aren't limited to
  // Agent-context viewing, so only flag "Chỉ xem trong Agent" for Own & Shared viewers.
  const canSeeAll = useGroupAccess("skills").canSeeAll;
  if (skill.ownerId === userId) {
    return (
      <>
        <span className="chip chip-muted">Của tôi</span>
        {skill.sharing.mode === "all" && <span className="chip chip-info">Dùng chung</span>}
        {skill.sharing.mode === "specific" && skill.sharing.people.length > 0 && (
          <span className="chip chip-info">Chia sẻ với {skill.sharing.people.length} người</span>
        )}
      </>
    );
  }
  // Attached to an Agent the viewer works on but not shared with them: visible read-only in
  // that Agent only (see agentContextAccess.tsx), so don't claim it was shared.
  if (!canSeeAll && !isAccessibleTo(skill.sharing, skill.ownerId, userId)) {
    return <span className="chip chip-muted">Chỉ xem trong Agent · {skill.ownerName}</span>;
  }
  return <span className="chip chip-muted">Được chia sẻ · {skill.ownerName}</span>;
}
