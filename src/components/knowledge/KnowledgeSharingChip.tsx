import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Sharing } from "./knowledgeBaseStore";

/** "Quyền" chip for a single knowledge item/document's access level — shared between the Agent
 * Knowledge table and the Console Documents tab so both read identically.
 * `shortLabel` swaps "Chỉ mình tôi" for "Riêng tư" — used only where row width is tight (the
 * Instructions tab's right-sidebar "Tri thức" widget); "Dùng chung"/"Chia sẻ · N" are already
 * short and stay as-is either way. */
export default function KnowledgeSharingChip({ sharing, shortLabel = false }: { sharing?: Sharing; shortLabel?: boolean }) {
  const mode = sharing?.mode ?? "private";
  if (mode === "specific") {
    const count = sharing?.people.length ?? 0;
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className="chip chip-muted text-xs whitespace-nowrap cursor-default">{`Chia sẻ · ${count}`}</span>
        </TooltipTrigger>
        <TooltipContent>{`Chia sẻ với ${count} người`}</TooltipContent>
      </Tooltip>
    );
  }
  const label = mode === "all" ? "Dùng chung" : shortLabel ? "Riêng tư" : "Chỉ mình tôi";
  return <span className="chip chip-muted text-xs whitespace-nowrap">{label}</span>;
}
