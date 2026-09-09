import type { Skill } from "./skillStore";

/** Owner/sharing chip pair for a skill card or detail drawer — same pattern as Knowledge's
 * OwnershipChips / Guardrails' GuardrailOwnershipTag. The active ownership tab (when given)
 * already tells the viewer which category they're looking at, so the tag is trimmed to match:
 * dropped entirely on "mine", shortened to "· <tên>" on "shared", full text otherwise/on "all".
 * The share-status tag ("Dùng chung" / "Chia sẻ với N người") is unaffected in every case. */
export default function SkillOwnershipTag({ skill, userId, tab = "all" }: { skill: Skill; userId: string; tab?: "all" | "mine" | "shared" }) {
  if (skill.ownerId === userId) {
    return (
      <>
        {tab !== "mine" && <span className="chip chip-muted">Của tôi</span>}
        {skill.sharing.mode === "all" && <span className="chip chip-info">Dùng chung</span>}
        {skill.sharing.mode === "specific" && skill.sharing.people.length > 0 && (
          <span className="chip chip-info">Chia sẻ với {skill.sharing.people.length} người</span>
        )}
      </>
    );
  }
  return <span className="chip chip-muted">{tab === "shared" ? `· ${skill.ownerName}` : `Được chia sẻ · ${skill.ownerName}`}</span>;
}
