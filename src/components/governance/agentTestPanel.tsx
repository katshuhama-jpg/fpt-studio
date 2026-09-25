// Inline test-chat panel for the "Test" action on an Agent governance request — replaces a
// navigation to /agents/:id?tab=test, which (a) throws the admin out of the approval flow
// entirely (loses their place, has to navigate back to resume Duyệt/Từ chối) and (b) right now
// lands on an unbuilt placeholder tab anyway, so it didn't even work. Implemented as a shadcn
// Sheet (Radix Dialog under the hood) rather than a hand-rolled overlay specifically so focus
// trapping, ESC-to-close, and click-outside-to-close come for free and match the rest of the
// product's dialog behavior (see governance/requestDetail.tsx's own confirm dialogs).
//
// Visually mirrors the chat view of AgentBuilder.tsx's PreviewPanel (same header layout, message
// bubbles, input bar) per the reference screenshot, but reads the real Agent's name/emoji via
// getAgent() instead of PreviewPanel's hardcoded demo agent — this panel is mounted from contexts
// (like this one) where the agent being tested isn't always the one PreviewPanel was built for.
import { useState } from "react";
import { RotateCcw, Send } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { getAgent } from "../configure/agentStore";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
}

export function AgentTestPanel({ agentId, open, onOpenChange }: {
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const agent = getAgent(agentId);
  const greeting: ChatMessage = { role: "agent", text: `Xin chào! Tôi là ${agent.name}. Tôi có thể giúp gì cho bạn?` };
  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [input, setInput] = useState("");

  const reset = () => { setMessages([greeting]); setInput(""); };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(m => [...m, { role: "user", text }]);
    setInput("");
    // Mock reply, same fidelity as AgentBuilder's own PreviewPanel test chat — this prototype
    // doesn't wire either test surface to a real model call yet.
    setTimeout(() => {
      setMessages(m => [...m, { role: "agent", text: `Đây là phản hồi demo cho "${text}" — bản test này chưa kết nối model thật.` }]);
    }, 700);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetTitle className="sr-only">Test {agent.name}</SheetTitle>
        <SheetDescription className="sr-only">Cửa sổ chat thử để kiểm tra Agent này trước khi duyệt, không rời khỏi trang yêu cầu.</SheetDescription>

        {/* Agent header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2.5 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center text-lg shrink-0">{agent.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{agent.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground">Chế độ test</span>
            </div>
          </div>
          <button
            onClick={reset}
            className="ml-auto mr-6 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-base"
          >
            <RotateCcw size={12} /> Đặt lại
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "agent" && (
                <span className="w-6 h-6 rounded-full bg-primary-soft flex items-center justify-center text-sm mr-2 shrink-0 mt-0.5">{agent.emoji}</span>
              )}
              <div
                className={`max-w-[82%] text-xs leading-relaxed rounded-2xl px-3 py-2 ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-surface-muted border border-border rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2 bg-surface-muted rounded-xl border border-border px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-base">
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Nhập tin nhắn để test…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
            />
            <button
              onClick={send}
              aria-label="Gửi"
              className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-glow transition-base shrink-0"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
