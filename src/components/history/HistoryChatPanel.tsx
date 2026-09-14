import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { X, Copy, Check, Waypoints, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { historyStore, type ConversationMessage } from "./historyStore";
import { buildMessageAudit } from "./traceStore";
import CollapsibleHistoryPanel from "./CollapsibleHistoryPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Right-side conversation viewer for the History section — same aside chrome and
 * chat-bubble styling as PreviewPanel's "Test run" chat view in Instructions, so
 * reviewing a past conversation looks like the same chat surface used to test the
 * agent live, just read-only.
 */
export default function HistoryChatPanel({ agentId }: { agentId: string }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const conversationId = params.get("conversationId");
  const record = conversationId ? historyStore.get(agentId, conversationId) : undefined;
  const [copied, setCopied] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [auditMessage, setAuditMessage] = useState<ConversationMessage | null>(null);

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

  const copyMessage = (m: ConversationMessage) => {
    navigator.clipboard?.writeText(m.content).catch(() => {});
    setCopiedMessageId(m.id);
    setTimeout(() => setCopiedMessageId(id => (id === m.id ? null : id)), 1500);
  };

  const audit = record && auditMessage ? buildMessageAudit(record, auditMessage) : null;

  const hidden = params.get("panel") === "hidden";

  return (
    <CollapsibleHistoryPanel hidden={hidden} width={476} emptyHint="Click a conversation in the list to view the full chat.">
      {record && (
        <>
            {/* Conversation header — minimal, matches the real agents.fpt.ai chat-history panel:
                title + ID/copy + actions only. Channel and end time already live in the History
                table row, so they aren't repeated here. */}
            <div className="px-4 py-3.5 border-b border-border shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight text-foreground truncate">Conversation details</div>
                  <div className="flex items-center gap-1 mt-1.5 min-w-0">
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
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/agents/${agentId}/trace/${record.id}`)}
                    className="h-7 px-2 flex items-center gap-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-surface-muted hover:text-primary transition-base"
                  >
                    <Waypoints size={13} /> View trace
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    aria-label="Close conversation"
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages — same bubble styling as PreviewPanel's chat view. Agent messages get an
                Audit + Copy action row underneath, matching the real agents.fpt.ai chat-history
                panel (that product also has thumbs up/down here — intentionally left out of this
                prototype). Customer messages have nothing to audit, same as the real product. */}
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
                    {m.role === "agent" && (
                      <div className="flex items-center gap-0.5 mt-0.5 -ml-1.5">
                        <button
                          type="button"
                          onClick={() => setAuditMessage(m)}
                          title="Audit"
                          aria-label="Agent audit"
                          className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
                        >
                          <ClipboardList size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => copyMessage(m)}
                          title="Copy"
                          aria-label="Copy message"
                          className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
                        >
                          {copiedMessageId === m.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                        </button>
                      </div>
                    )}
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

      {/* "Agent audit" modal — mirrors the real agents.fpt.ai chat-history screen's per-message
          audit dialog: Status/Latency/Tokens strip, Message/Conversation IDs, Start/End time,
          and the Flow steps that produced this message. */}
      <Dialog open={!!auditMessage} onOpenChange={open => { if (!open) setAuditMessage(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agent audit</DialogTitle>
          </DialogHeader>
          {audit && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 rounded-lg bg-success/10 border border-success/20 px-4 py-3">
                <div>
                  <div className="text-[11px] text-muted-foreground">Status</div>
                  <div className="text-sm font-semibold text-success mt-0.5">{audit.status}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Latency</div>
                  <div className="text-sm font-semibold mt-0.5">{audit.latencyMs} ms</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Tokens</div>
                  <div className="text-sm font-semibold mt-0.5">{audit.tokens} tokens</div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Message ID:</span>
                  <span className="font-mono truncate">{audit.messageId}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Conversation ID:</span>
                  <span className="font-mono truncate">{audit.conversationId}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Start time:</span>
                  <span>{format(new Date(audit.startedAt), "dd-MM-yyyy HH:mm:ss")}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">End time:</span>
                  <span>{format(new Date(audit.endedAt), "dd-MM-yyyy HH:mm:ss")}</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold mb-2">Flow</div>
                <div className="space-y-2">
                  {audit.flow.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-5 w-5 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px]">
                        {i + 1}
                      </span>
                      <span className="text-xs">{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CollapsibleHistoryPanel>
  );
}
