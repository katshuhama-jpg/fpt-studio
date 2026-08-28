import { useRef, useState } from "react";
import { Send, Loader2, CheckCircle2, XCircle, CircleHelp } from "lucide-react";
import type { ExternalAgent } from "./externalAgentStore";

type Outcome = "success" | "error" | "interrupt";

interface TestMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  outcome?: Outcome;
  durationMs?: number;
  runId?: string;
}

function pseudoId(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `run-${h.toString(36)}`;
}

/** Deterministic mock reply — a real implementation would POST to `${agent.baseUrl}/runs` and
 * stream the response. Typing "error"/"fail" simulates a failed run; "interrupt"/"approve"
 * simulates the agent pausing to ask the user something; anything else succeeds. */
function mockReply(agent: ExternalAgent, userText: string): { content: string; outcome: Outcome; durationMs: number } {
  const t = userText.toLowerCase();
  const durationMs = 400 + (Math.abs(hashString(userText)) % 1600);
  if (t.includes("error") || t.includes("fail")) {
    return { content: `${agent.name} couldn't complete that request — the upstream system returned an error.`, outcome: "error", durationMs };
  }
  if (t.includes("interrupt") || t.includes("approve")) {
    return { content: `Before I continue, can you confirm you'd like to proceed with this action?`, outcome: "interrupt", durationMs };
  }
  return { content: `Got it — here's a test response from ${agent.name} for: "${userText}"`, outcome: "success", durationMs };
}

function hashString(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function OutcomeBadge({ outcome, durationMs, runId }: { outcome: Outcome; durationMs: number; runId: string }) {
  const meta = outcome === "success"
    ? { icon: CheckCircle2, cls: "text-success", label: "Success" }
    : outcome === "error"
    ? { icon: XCircle, cls: "text-destructive", label: "Error" }
    : { icon: CircleHelp, cls: "text-warning", label: "Interrupt" };
  const Icon = meta.icon;
  return (
    <div className={`flex items-center gap-1.5 mt-1.5 text-[11px] ${meta.cls}`}>
      <Icon size={11} />
      <span className="font-mono">{runId}</span>
      <span>·</span>
      <span>{(durationMs / 1000).toFixed(1)}s</span>
      <span>·</span>
      <span className="font-medium">{meta.label}</span>
    </div>
  );
}

export default function ExternalAgentTestTab({ agent }: { agent: ExternalAgent }) {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const send = () => {
    const text = input.trim();
    if (!text || running) return;
    const userMsg: TestMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setRunning(true);
    const reply = mockReply(agent, text);
    setTimeout(() => {
      setMessages(m => [...m, {
        id: `a-${Date.now()}`, role: "agent", content: reply.content,
        outcome: reply.outcome, durationMs: reply.durationMs, runId: pseudoId(`${agent.id}-${Date.now()}`),
      }]);
      setRunning(false);
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
    }, Math.min(reply.durationMs, 1400));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 pt-8 pb-4 shrink-0 border-b border-border">
        <h2 className="font-display text-xl font-semibold">Test</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Send a real turn to <span className="font-mono">{agent.baseUrl}/runs</span> and see how it responds before publishing.
        </p>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-4 max-w-[760px] w-full mx-auto">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-10 text-center">
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Send a message below to try this agent — each turn is one call to /runs, just like a real conversation.
            </p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <div
                  className={`text-sm leading-relaxed rounded-2xl px-3.5 py-2.5 ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-surface-muted border border-border rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "agent" && m.outcome && m.durationMs != null && m.runId && (
                  <OutcomeBadge outcome={m.outcome} durationMs={m.durationMs} runId={m.runId} />
                )}
              </div>
            </div>
          ))
        )}
        {running && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface-muted border border-border rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <Loader2 size={12} className="animate-spin" /> Waiting for a response...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border shrink-0">
        <div className="max-w-[760px] w-full mx-auto flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message to test this agent..."
            className="flex-1 h-10 px-3.5 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || running}
            className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-base shrink-0"
            aria-label="Send"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
