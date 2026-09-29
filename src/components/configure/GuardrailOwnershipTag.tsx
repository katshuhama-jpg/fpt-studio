import type { Guardrail } from "./guardrailConsoleStore";
import { ownershipTags, OwnershipTagList, isCreatorRedundant } from "@/components/governance/resourceOwnership";

/** Ownership for a guardrail in an Agent (sidebar, Guardrails tab) — the same Của tôi /
 * Được chia sẻ / Hệ thống pills as the Console Guardrails list, plus the creator's name when the
 * guardrail is someone else's. */
export default function GuardrailOwnershipTag({ g, userId }: { g: Guardrail; userId: string }) {
  const tags = ownershipTags({ system: g.mandatory, ownerId: g.ownerId, sharing: g.sharing, userId });
  if (tags.length === 0) return null;
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <OwnershipTagList tags={tags} className="shrink-0 flex-nowrap" />
      {!isCreatorRedundant(tags) && g.ownerName && <span className="text-xs text-muted-foreground truncate">{g.ownerName}</span>}
    </span>
  );
}
