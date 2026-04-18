import { useState } from "react";
import { Send, Paperclip, Mic, Sparkles, AtSign, Plus, MessageSquare, Bot } from "lucide-react";

const agents = [
  { id: "default", name: "FPT Assistant", emoji: "✨", desc: "Default workspace agent", color: "bg-primary-soft text-primary" },
  { id: "cskh", name: "Banking ABC", emoji: "🏦", desc: "Customer care", color: "bg-accent-soft text-accent" },
  { id: "hr", name: "HR Onboarding", emoji: "🤝", desc: "Internal HR helper", color: "bg-primary-soft text-primary" },
  { id: "sales", name: "Sales Qualifier", emoji: "🎯", desc: "Lead scoring", color: "bg-surface-muted text-foreground" },
];

const skills = ["🔍 Web search", "📄 Read docs", "🧮 Code interpreter", "🖼️ Vision", "📊 Charts"];

const conversations = [
  { id: 1, title: "Q1 sales report summary", time: "Today" },
  { id: 2, title: "Translate onboarding doc", time: "Today" },
  { id: 3, title: "Card lock procedure", time: "Yesterday" },
  { id: 4, title: "Compare gemini vs claude", time: "Yesterday" },
  { id: 5, title: "API rate-limit policy", time: "Apr 14" },
];

export default function MyAgents() {
  const [active, setActive] = useState("default");
  const [input, setInput] = useState("");

  return (
    <div className="flex h-full bg-background">
      {/* Conversations sidebar */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <button className="w-full h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center justify-center gap-1.5 transition-base shadow-soft">
            <Plus size={14} /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
            Conversations
          </div>
          {conversations.map(c => (
            <button
              key={c.id}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-surface-muted transition-base group flex flex-col"
            >
              <span className="text-xs font-medium truncate">{c.title}</span>
              <span className="text-[10px] text-muted-foreground">{c.time}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header w/ agent picker */}
        <div className="h-14 border-b border-border bg-surface flex items-center px-5 gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center text-base">
              {agents.find(a => a.id === active)?.emoji}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{agents.find(a => a.id === active)?.name}</div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" /> Online · GPT-4o mini
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {agents.map(a => (
              <button
                key={a.id}
                onClick={() => setActive(a.id)}
                className={`px-2.5 h-8 rounded-lg text-xs font-medium transition-base flex items-center gap-1.5 ${
                  active === a.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-muted"
                }`}
              >
                <span>{a.emoji}</span>
                <span className="hidden sm:inline">{a.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gradient-soft">
          <div className="max-w-3xl mx-auto px-6 py-10 space-y-6 animate-fade-up">
            {/* Welcome */}
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-coral flex items-center justify-center mb-4 shadow-elev">
                <Sparkles size={28} className="text-accent-foreground" />
              </div>
              <h2 className="font-display text-2xl font-semibold mb-2">How can I help today?</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Chat with the default assistant or type{" "}
                <kbd className="font-mono text-xs bg-surface border border-border rounded px-1.5 py-0.5">@</kbd> to call
                any agent in your workspace.
              </p>

              {/* Skill chips */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {skills.map(s => (
                  <span key={s} className="chip !bg-surface !border-border">{s}</span>
                ))}
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto text-left">
                {[
                  { icon: MessageSquare, label: "Summarize this customer call transcript" },
                  { icon: Bot, label: "@HR Onboarding — what's the leave policy?" },
                  { icon: Sparkles, label: "Draft a release note from these commits" },
                  { icon: AtSign, label: "@Banking ABC — how do I lock my card?" },
                ].map((s, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface border border-border hover:border-primary/30 hover:shadow-soft transition-base text-sm"
                  >
                    <s.icon size={14} className="text-primary shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-surface p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface focus-within:border-primary focus-within:ring-glow transition-base p-2 shadow-soft">
              <button className="h-9 w-9 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
                <Paperclip size={16} />
              </button>
              <button className="h-9 w-9 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
                <AtSign size={16} />
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                rows={1}
                placeholder="Ask anything, or @mention an agent…"
                className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground outline-none py-2 px-1 max-h-32"
              />
              <button className="h-9 w-9 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
                <Mic size={16} />
              </button>
              <button className="h-9 w-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow flex items-center justify-center transition-base shadow-soft">
                <Send size={15} />
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground text-center mt-2">
              Responses may be inaccurate. Verify critical information.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
