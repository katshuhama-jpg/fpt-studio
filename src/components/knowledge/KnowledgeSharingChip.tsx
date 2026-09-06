import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Sharing } from "./knowledgeBaseStore";

/** Compact "Quyền" chip for a single knowledge item/document's access level — shared between
 * the Agent Knowledge table and the Console Documents tab so both read identically. */
export default function KnowledgeSharingChip({ sharing }: { sharing?: Sharing }) {
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
  const label = mode === "all" ? "Dùng chung" : "Chỉ mình tôi";
  return <span className="chip chip-muted text-xs whitespace-nowrap">{label}</span>;
}
