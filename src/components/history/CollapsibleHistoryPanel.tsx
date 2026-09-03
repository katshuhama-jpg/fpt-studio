import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";

/**
 * Shared aside chrome for a History screen's conversation-transcript panel — the collapse
 * animation and "No conversation selected" empty state used to be duplicated between the
 * conversational Agent (HistoryChatPanel) and External Agent (ExternalAgentHistoryTab)
 * History screens, which is how they drifted apart (only one of them ever collapsed to let
 * its table use the full content width). Both now share this instead.
 */
export default function CollapsibleHistoryPanel({
  hidden, width = 476, emptyHint, children,
}: {
  hidden: boolean;
  width?: number;
  emptyHint: string;
  children?: ReactNode;
}) {
  return (
    <aside
      className={`border-l border-border bg-background flex flex-col shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-in-out ${
        hidden ? "w-0 opacity-0" : "opacity-100"
      }`}
      style={{ width: hidden ? 0 : width }}
    >
      {/* Fixed-width inner frame so content doesn't reflow/wrap while the aside's width animates */}
      <div style={{ width }} className="h-full flex flex-col">
        {children ?? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center mb-3">
              <MessageCircle size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No conversation selected</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">{emptyHint}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
