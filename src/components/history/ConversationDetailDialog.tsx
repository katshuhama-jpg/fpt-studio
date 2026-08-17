import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { format } from "date-fns";
import { historyStore, CHANNEL_META } from "./historyStore";

export default function ConversationDetailDialog({
  open, onOpenChange, agentId, conversationId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId: string;
  conversationId: string | null;
}) {
  const record = conversationId ? historyStore.get(agentId, conversationId) : undefined;
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Conversation with {record.username}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {CHANNEL_META[record.channel].label} · {format(new Date(record.endedAt), "dd/MM/yyyy - HH:mm")} · {record.messages.length} messages
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-1 pr-1 -mr-1">
          {record.messages.map(m => (
            <div key={m.id} className={`flex flex-col ${m.role === "customer" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] text-sm leading-relaxed px-3 py-2 rounded-2xl ${
                  m.role === "customer"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-surface-muted border border-border rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <span>{format(new Date(m.at), "HH:mm")}</span>
                {m.feedback === "up" && <ThumbsUp size={11} className="text-success" />}
                {m.feedback === "down" && <ThumbsDown size={11} className="text-destructive" />}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
