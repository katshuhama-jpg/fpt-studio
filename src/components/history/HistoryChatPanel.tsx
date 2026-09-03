import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { historyStore, CHANNEL_META } from "./historyStore";
import ChannelLogo from "./ChannelLogo";
import CollapsibleHistoryPanel from "./CollapsibleHistoryPanel";

/**
 * Right-side conversation viewer for the History section — same aside chrome and
 * chat-bubble styling as PreviewPanel's "Test run" chat view in Instructions, so
 * reviewing a past conversation looks like the same chat surface used to test the
 * agent live, just read-only.
 */
export default function HistoryChatPanel({ agentId }: { agentId: string }) {
  const [params, setParams] = useSearchParams();
  const conversationId = params.get("conversationId");
  const record = conversationId ? historyStore.get(agentId, conversationId) : undefined;
  const [copied, setCopied] = useState(false);

  const closePanel = () => {
    const next = new URLSearchParams(params);
    next.set("panel", "hidden");
    setParams(next, { replace: true });
  };

  const copyId = () => {
    if (!record) return;
    navigator.clipboard?.writeText(record.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hidden = params.get("panel") === "hidden";

  return (
    <CollapsibleHistoryPanel hidden={hidden} width={476} emptyHint="Click a conversation in the list to view the full chat.">
      {record && (
        <>
            {/* Conversation header — no avatar, higher-contrast identity + close */}
            <div className="px-4 py-3.5 border-b border-border shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight text-foreground truncate">{record.username}</div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                    <ChannelLogo channel={record.channel} size={16} />
                    <span className="font-medium text-foreground/80">{CHANNEL_META[record.channel].label}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{format(new Date(record.endedAt), "dd/MM/yyyy - HH:mm")}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Close conversation"
                  className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-1 mt-2 min-w-0">
                <span className="text-[10px] font-mono text-muted-foreground truncate">{record.id}</span>
                <button
                  type="button"
                  onClick={copyId}
                  aria-label="Copy conversation ID"
                  title="Copy conversation ID"
                  className="h-5 w-5 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
                >
                  {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                </button>
              </div>
            </div>

            {/* Messages — same bubble styling as PreviewPanel's chat view */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {record.messages.map(m => (
                <div key={m.id} className={`flex ${m.role === "customer" ? "justify-end" : "justify-start"}`}>
                  {m.role === "agent" && (
                    <div className="w-6 h-6 rounded-full bg-primary-soft flex items-center justify-center text-sm mr-2 shrink-0 mt-0.5">🏦</div>
                  )}
                  <div className="max-w-[82%]">
                    <div
                      className={`text-xs leading-relaxed rounded-2xl px-3 py-2 ${
                        m.role === "customer"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-surface-muted border border-border rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                    <div className={`mt-1 text-[10px] text-muted-foreground ${m.role === "customer" ? "text-right" : "text-left"}`}>
                      {format(new Date(m.at), "HH:mm")}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Read-only footer — same slot as PreviewPanel's input, disabled since this conversation already ended */}
            <div className="p-3 border-t border-border shrink-0">
              <div className="flex items-center gap-2 bg-surface-muted/60 rounded-xl border border-border px-3 py-2 opacity-60">
                <span className="flex-1 text-sm text-muted-foreground">This conversation has ended</span>
              </div>
            </div>
          </>
      )}
    </CollapsibleHistoryPanel>
  );
}
