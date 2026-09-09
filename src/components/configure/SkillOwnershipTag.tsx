import type { Skill } from "./skillStore";

/** Owner/sharing chip pair for a skill card or detail drawer — same pattern as Knowledge's
 * OwnershipChips / Guardrails' GuardrailOwnershipTag. */
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
  const me = skill.sharing.people.find(p => p.userId === userId);
  return (
    <>
      <span className="chip chip-muted">Được chia sẻ · {skill.ownerName}</span>
      {me && <span className="chip chip-info">{me.access === "edit" ? "Có thể chỉnh sửa" : "Có thể xem"}</span>}
    </>
  );
}
