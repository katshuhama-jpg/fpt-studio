import { BookOpen, Link2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { KnowledgeBaseType } from "./knowledgeBaseStore";

/** 32x32 tinted icon tile identifying a Knowledge Base's type at a glance — placed before the
 * KB name on both the list cards and the detail header, so the type no longer needs a text chip
 * competing with ownership/access chips for attention. */
export default function KnowledgeTypeIcon({ type, className }: { type: KnowledgeBaseType; className?: string }) {
  const isInternal = type === "internal";
  const label = isInternal ? "Kho tri thức nội bộ" : "Kho tri thức kết nối ngoài";
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          role="img"
          aria-label={label}
          title={label}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isInternal ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
          } ${className ?? ""}`}
        >
          {isInternal ? <BookOpen size={16} /> : <Link2 size={16} />}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
