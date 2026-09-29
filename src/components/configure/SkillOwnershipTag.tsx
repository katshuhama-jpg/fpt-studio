import { isAccessibleTo } from "./skillSharing";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { ownershipTags, OwnershipTagList, isCreatorRedundant } from "@/components/governance/resourceOwnership";
import type { Skill } from "./skillStore";

/** Ownership for a skill outside the Skills library (skill detail page, Agent sidebar/tabs) —
 * the same Của tôi / Được chia sẻ pills as the library cards, plus the creator's name when the
 * skill is someone else's. One exception keeps its own wording: a skill the viewer only sees
 * because an Agent they work on uses it (not shared with them) — see agentContextAccess.tsx. */
export default function SkillOwnershipTag({ skill, userId }: { skill: Skill; userId: string }) {
  const skillsAccess = useGroupAccess("skills");
  const isOwner = skill.ownerId === userId;
  if (!isOwner && !skillsAccess.canSeeAll && !isAccessibleTo(skill.sharing, skill.ownerId, userId)) {
    return <span className="chip chip-muted">{skillsAccess.hasPermission("manage") ? "Sửa được qua Agent này" : "Chỉ xem trong Agent"} · {skill.ownerName}</span>;
  }
  const tags = ownershipTags({ ownerId: skill.ownerId, sharing: skill.sharing, userId });
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <OwnershipTagList tags={tags} className="shrink-0 flex-nowrap" />
      {!isCreatorRedundant(tags) && <span className="text-xs text-muted-foreground truncate">{skill.ownerName}</span>}
    </span>
  );
}
