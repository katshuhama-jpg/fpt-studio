import { isAccessibleTo } from "./skillSharing";
import type { Skill } from "./skillStore";

/** Owner/sharing chip pair for a skill detail page or Agent sidebar — same pattern as
 * Knowledge's/Guardrails' equivalents. Used only where there's no ownership filter tab already
 * establishing that context (the Skills list has its own local, tab-aware chip instead — see
 * ShareStatusChip in Skills.tsx). */
export default function SkillOwnershipTag({ skill, userId }: { skill: Skill; userId: string }) {
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
  if (!isAccessibleTo(skill.sharing, skill.ownerId, userId)) {
    return <span className="chip chip-muted">Chỉ xem trong Agent · {skill.ownerName}</span>;
  }
  return <span className="chip chip-muted">Được chia sẻ · {skill.ownerName}</span>;
}
