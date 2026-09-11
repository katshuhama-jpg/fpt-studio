import { MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Sharing } from "./knowledgeBaseStore";

/** "Phạm vi trả lời của Agent" chip for a single document/item — the chat-time counterpart to
 * KnowledgeSharingChip's Console-management chip. Always carries the MessageSquare icon and its
 * own wording ("Chỉ tôi"/"Mọi người"/"Giới hạn · N") so it's never mistaken for the sharing chip
 * at a glance, even though both use the same private/all/specific shape. */
export default function QueryScopeChip({ querySharing }: { querySharing?: Sharing }) {
  const mode = querySharing?.mode ?? "private";
  if (mode === "specific") {
    const count = querySharing?.people.length ?? 0;
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className="chip chip-muted text-xs whitespace-nowrap cursor-default inline-flex items-center gap-1">
            <MessageSquare size={10} />{`Giới hạn · ${count}`}
          </span>
        </TooltipTrigger>
        <TooltipContent>{`Agent chỉ dùng tài liệu này để trả lời ${count} người dùng cụ thể`}</TooltipContent>
      </Tooltip>
    );
  }
  const label = mode === "all" ? "Mọi người" : "Chỉ tôi";
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="chip chip-muted text-xs whitespace-nowrap inline-flex items-center gap-1 cursor-default">
          <MessageSquare size={10} />{label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {mode === "all" ? "Agent dùng tài liệu này để trả lời mọi người dùng." : "Agent chỉ dùng tài liệu này để trả lời chính bạn."}
      </TooltipContent>
    </Tooltip>
  );
}
