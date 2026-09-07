import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Sparkles, Paperclip, AtSign,
  ExternalLink, X, Search, Edit, Copy,
  MoreVertical, Trash2, Play, BookOpen
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

/* ─── Template data ─────────────────────────────────────────────────── */
const categories = ["All", "Customer support", "Sales", "HR & Internal", "Operations", "Finance"] as const;

const CONNECTOR_LABELS: Record<string, string> = {
  gmail: "Gmail", slack: "Slack", zendesk: "Zendesk", notion: "Notion", drive: "Google Drive",
  hubspot: "HubSpot", calendar: "Calendar", jira: "Jira", zoom: "Zoom", sheets: "Sheets",
};

const templates = [
  { id: 1, emoji: "💬", bg: "bg-blue-50",  name: "Customer care bot",    cat: "Customer support",
    connectors: ["gmail","slack","zendesk"],
    desc: "Multilingual 24/7 support with escalation and live-agent handoff",
    systemPrompt: `# Customer Care Agent\n\nYou are a friendly, multilingual customer support specialist available 24/7.\n\n## Tone & Style\n- Warm, empathetic and professional\n- Respond in the customer's language automatically\n- Keep answers concise and actionable\n\n## Capabilities\n- Answer product and service questions\n- Handle complaints and escalate when needed\n- Guide users through common troubleshooting steps\n- Transfer to a human agent for complex issues\n\n## Limits\n- Never make promises about refunds or compensation without supervisor approval\n- Do not share internal processes or pricing structures not publicly available` },
  { id: 2, emoji: "📦", bg: "bg-green-50", name: "Product FAQ assistant", cat: "Customer support",
    connectors: ["notion","drive","slack"],
    desc: "Answers from manuals, docs, and warranty info",
    systemPrompt: `# Product FAQ Assistant\n\nYou help customers find answers from product manuals, troubleshooting guides, and warranty documentation.\n\n## Tone & Style\n- Clear, precise, and helpful\n- Use numbered steps for instructions\n- Always cite the relevant section of the manual when possible\n\n## Capabilities\n- Answer questions about product features and specifications\n- Guide users through setup and troubleshooting steps\n- Explain warranty coverage and claim procedures\n- Suggest related articles or videos\n\n## Limits\n- Only answer based on official documentation\n- Do not diagnose hardware faults that require professional service` },
  { id: 3, emoji: "🎯", bg: "bg-amber-50", name: "Sales lead qualifier",  cat: "Sales",
    connectors: ["hubspot","gmail","calendar"],
    desc: "BANT scoring, objection handling, and CRM handoff",
    systemPrompt: `# Sales Lead Qualifier Agent\n\nYou qualify inbound leads using the BANT framework (Budget, Authority, Need, Timeline) and hand off hot leads to the sales team.\n\n## Tone & Style\n- Consultative and curious — ask one question at a time\n- Friendly but efficient; respect the prospect's time\n\n## Qualification Flow\n1. Greet and understand the prospect's role and company\n2. Identify the core business need or pain point\n3. Explore budget range and decision-making authority\n4. Confirm purchase timeline\n5. Score the lead (Hot / Warm / Cold) and route accordingly\n\n## Limits\n- Do not quote specific pricing — route to sales rep\n- Do not make commitments on behalf of the sales team` },
  { id: 4, emoji: "🤝", bg: "bg-pink-50",  name: "HR onboarding bot",     cat: "HR & Internal",
    connectors: ["calendar","slack","drive"],
    desc: "New-joiner flows, policy lookup, meeting scheduling",
    systemPrompt: `# HR Onboarding Assistant\n\nYou guide new employees through their first 30/60/90 days, answer HR policy questions, and help schedule onboarding meetings.\n\n## Tone & Style\n- Warm, encouraging, and clear\n- Use checklists and structured steps\n- Celebrate milestones (Day 1, first week, etc.)\n\n## Capabilities\n- Walk new joiners through onboarding checklists\n- Answer questions about leave policies, benefits, and payroll\n- Help schedule meetings with managers and teammates\n- Point employees to the right HR contacts or systems\n\n## Limits\n- Do not make decisions about policy exceptions\n- Salary and compensation queries → direct to HR Business Partner` },
  { id: 5, emoji: "🔧", bg: "bg-blue-50",  name: "IT helpdesk",           cat: "Operations",
    connectors: ["jira","slack","zoom"],
    desc: "Password reset, VPN setup, and L1 ticket triage",
    systemPrompt: `# IT Helpdesk Agent\n\nYou are an L1 IT support agent that handles common technical issues, resets credentials, and triages tickets to the right team.\n\n## Tone & Style\n- Patient, methodical, and reassuring\n- Use numbered steps for technical instructions\n- Confirm resolution before closing a ticket\n\n## Capabilities\n- Guide users through password and MFA resets\n- Troubleshoot VPN, Wi-Fi, and email connectivity\n- Assist with software installation and access requests\n- Create and triage support tickets\n\n## Limits\n- Do not access or modify production systems\n- Escalate to L2/L3 for infrastructure, security incidents, or data loss` },
  { id: 6, emoji: "💰", bg: "bg-green-50", name: "Finance Q&A",           cat: "Finance",
    connectors: ["sheets","gmail","notion"],
    desc: "Invoice queries, payment status, and budget lookups",
    systemPrompt: `# Finance Q&A Agent\n\nYou help employees and vendors with invoice queries, payment status checks, and budget information lookups.\n\n## Tone & Style\n- Professional, accurate, and concise\n- Always confirm amounts and dates before sharing\n\n## Capabilities\n- Check invoice status and expected payment dates\n- Explain expense reimbursement processes\n- Provide budget utilisation summaries by department\n- Guide users through purchase order submission\n\n## Limits\n- Do not approve payments or modify financial records\n- Confidential financial data → only share with authorised requestors` },
  { id: 7, emoji: "📋", bg: "bg-amber-50", name: "Operations assistant",  cat: "Operations",
    connectors: ["notion","jira","slack"],
    desc: "Process guides, SOP lookup, and task routing",
    systemPrompt: `# Operations Assistant\n\nYou help operations teams find standard operating procedures, track task progress, and route work to the right department.\n\n## Tone & Style\n- Efficient, structured, and direct\n- Use bullet points and tables for process steps\n\n## Capabilities\n- Retrieve and summarise SOPs on demand\n- Log and route operational tasks and incidents\n- Provide status updates on ongoing processes\n- Identify bottlenecks and suggest escalation paths\n\n## Limits\n- Do not modify or approve SOPs without authorisation\n- Do not share restricted operational data outside approved teams` },
  { id: 8, emoji: "📣", bg: "bg-pink-50",  name: "Marketing assistant",   cat: "Sales",
    connectors: ["hubspot","gmail","calendar"],
    desc: "Campaign Q&A, content suggestions, and lead capture",
    systemPrompt: `# Marketing Assistant Agent\n\nYou support marketing campaigns by answering visitor questions, suggesting relevant content, and capturing qualified leads.\n\n## Tone & Style\n- Enthusiastic, creative, and on-brand\n- Personalise responses based on the visitor's interest\n\n## Capabilities\n- Answer questions about products, events, and promotions\n- Recommend blog posts, case studies, or demo videos\n- Capture lead information (name, email, company, interest)\n- Route hot leads to the sales team\n\n## Limits\n- Do not offer discounts or special pricing without approval\n- Do not collect sensitive personal data beyond standard lead fields` },
];

const recent = [
  { id: "hr",    name: "HR Agent",          emoji: "🤝", bg: "bg-blue-50",   status: "Active",  desc: "Answers employee questions about policies, benefits, and leave on Slack &…", editor: "Nguyen Minh", edited: "12 minutes ago" },
  { id: "ba",    name: "BA Agent",          emoji: "📋", bg: "bg-purple-50", status: "Active",  desc: "Helps Business Analysts draft user stories, BRDs, and analyze requirements from…", editor: "Pham Thu Ha", edited: "5 minutes ago" },
  { id: "onboarding", name: "Onboarding Agent", emoji: "🎓", bg: "bg-green-50", status: "Draft", desc: "Guides new employees through a 30/60/90-day roadmap with documents…", editor: "Tran Van Khoa", edited: "45 minutes ago" },
];

const getStarted = [
  { label: "Video guide", title: "Build your first Agent in 5 minutes",      kind: "video", bg: "bg-blue-500",   href: "https://www.youtube.com/results?search_query=fpt+ai+agent+studio+tutorial" },
  { label: "Video guide", title: "Connect a Connector and go live",         kind: "video", bg: "bg-indigo-500", href: "https://www.youtube.com/results?search_query=fpt+ai+agent+studio+connectors" },
  { label: "Web guide",   title: "Agent Studio documentation",              kind: "doc",   bg: "bg-amber-500",  href: "https://docs.fpt.ai" },
  { label: "Web guide",   title: "Best practices for writing instructions", kind: "doc",   bg: "bg-emerald-500", href: "https://docs.fpt.ai/guides/instructions" },
];

/* ─── Modals ─────────────────────────────────────────────────────────── */

function TemplateModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("All");
  const filtered = templates.filter(t => {
    const matchCat = cat === "All" || t.cat === cat;
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
  const handleUse = (t: typeof templates[number]) => {
    const params = new URLSearchParams();
    params.set("tab", "build");
    params.set("section", "instructions");
    params.set("agentName", t.name);
    params.set("agentPrompt", t.systemPrompt);
    onClose();
    navigate(`/agents/new?${params.toString()}`);
  };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl mx-4 bg-white rounded-2xl shadow-lg border border-border flex flex-col max-h-[80vh] animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-display text-lg font-semibold">Choose a template</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"><X size={16} /></button>
        </div>
        <div className="px-5 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input autoFocus className="w-full h-9 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border overflow-x-auto shrink-0">
          {categories.map(c => (
            <button key={c} onClick={() => setCat(c)} className={`px-3 h-7 rounded-full text-xs font-medium whitespace-nowrap transition-base ${cat === c ? "bg-primary-soft text-primary border border-primary/30" : "bg-surface-muted text-muted-foreground hover:bg-surface-sunken"}`}>{c}</button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No templates found.</p>}
          {filtered.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-soft/20 transition-base group">
              <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center text-xl shrink-0`}>{t.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">{t.desc}</p>
              </div>
              <button onClick={() => handleUse(t)} className="shrink-0 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium opacity-0 group-hover:opacity-100 transition-base">Use</button>
            </div>
          ))}
        </div>
      </div>
    </div>, document.body
  );
}

function RecentAgentCard({ a }: { a: typeof recent[number] }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  return (
    <Link to={`/agents/${a.id}`} className="group relative rounded-2xl border border-border bg-surface p-5 hover:border-primary/30 hover:shadow-soft transition-base flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-14 h-14 rounded-2xl ${a.bg} flex items-center justify-center text-3xl shrink-0`}>{a.emoji}</div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-semibold text-base leading-snug truncate mb-1.5">{a.name}</p>
          <span className={`chip ${a.status === "Active" ? "chip-success" : ""} w-fit`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" /> {a.status === "Active" ? "Live" : a.status}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1 mb-4">{a.desc}</p>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {a.edited}
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={e => { e.preventDefault(); setShowMenu(o => !o); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base"
          >
            <MoreVertical size={14} />
          </button>
          {showMenu && (
            <div
              className="absolute z-20 top-full right-0 mt-1 w-40 bg-white rounded-xl border border-border shadow-elev py-1 animate-fade-up"
              onMouseDown={e => e.stopPropagation()}
            >
              <button onClick={e => { e.preventDefault(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-surface-muted transition-base text-left">
                <Edit size={14} /> Edit
              </button>
              <button onClick={e => { e.preventDefault(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-surface-muted transition-base text-left">
                <Copy size={14} /> Duplicate
              </button>
              <button onClick={e => { e.preventDefault(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-destructive hover:bg-surface-muted transition-base text-left">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Turns a template's markdown-ish systemPrompt into plain title+text sections (## headers ->
 * subheading, "- " lines -> bullet list, everything else -> paragraph) instead of dumping the
 * raw markdown into a boxed/mono block. */
function renderPromptSections(text: string) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc pl-5 space-y-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground leading-relaxed">{item}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flushList(); return; }
    if (line.startsWith("## ")) {
      flushList();
      blocks.push(<p key={`h-${i}`} className="text-sm font-semibold mt-1">{line.slice(3)}</p>);
    } else if (line.startsWith("# ")) {
      flushList();
    } else if (line.startsWith("- ")) {
      listBuffer.push(line.slice(2));
    } else {
      flushList();
      blocks.push(<p key={`p-${i}`} className="text-sm text-muted-foreground leading-relaxed">{line}</p>);
    }
  });
  flushList();

  return blocks;
}

function TemplateDetailModal({ template, onClose, onUse }: {
  template: typeof templates[number];
  onClose: () => void;
  onUse: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-lg border border-border flex flex-col max-h-[85vh] animate-fade-up">
        <div className="flex items-start gap-3 px-6 pt-6 pb-4 shrink-0 border-b border-border">
          <div className={`w-11 h-11 rounded-xl ${template.bg} flex items-center justify-center text-2xl shrink-0`}>{template.emoji}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold leading-snug">{template.name}</h2>
            <span className="chip chip-primary mt-1.5 w-fit">{template.cat}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold mb-1">Description</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{template.desc}</p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-1.5">Instructions</p>
            <div className="flex flex-col gap-2">
              {renderPromptSections(template.systemPrompt)}
            </div>
          </div>

          {template.connectors && template.connectors.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-1.5">Connectors</p>
              <div className="flex flex-wrap gap-1.5">
                {template.connectors.map(c => (
                  <span key={c} className="chip">{CONNECTOR_LABELS[c] ?? c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Skills and Sub-agents show here too, if this template defines any — none of the
              current templates do, so those sections are simply omitted for now. */}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={onUse} className="btn-primary">Use this template</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CreateAgentModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { can } = useMyPermissions();
  const canCreateAgent = can("agents.create");
  const [prompt, setPrompt] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  const handleBuild = () => {
    if (!prompt.trim()) return;
    const params = new URLSearchParams();
    params.set("tab", "build");
    params.set("section", "instructions");
    params.set("agentPrompt", prompt.trim());
    navigate(`/agents/new?${params.toString()}`);
    onClose();
  };

  const handleBlank = () => {
    if (!canCreateAgent) return;
    onClose();
    navigate("/agents/new?tab=build&section=instructions");
  };

  if (showTemplates) return <TemplateModal onClose={onClose} />;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>Start to build your agent today</DialogTitle>
          <DialogDescription>Describe what you need and we'll build it for you</DialogDescription>
        </DialogHeader>

        <div className="rounded-[8px] border border-border bg-surface p-3 transition-base focus-within:border-ring">
          <textarea
            autoFocus
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed min-h-[80px] border-0 p-0"
            placeholder="e.g. A 24/7 banking customer-care agent that can lock cards, look up loan rates and book consultations…"
            rows={3}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild(); }}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1">
              <button type="button" className="w-8 h-8 rounded-[8px] hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base" title="Attach file"><Paperclip size={16} /></button>
              <button type="button" className="w-8 h-8 rounded-[8px] hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base" title="Mention knowledge"><AtSign size={16} /></button>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowTemplates(true)} className="text-sm text-muted-foreground hover:text-foreground transition-base">Use a template</button>
              <button type="button" onClick={handleBuild} disabled={!prompt.trim()} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                <Sparkles size={14} /> Build agent
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <button type="button" onClick={handleBlank} className="btn-secondary">
            Create from blank
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────── */

export default function Home() {
  const navigate = useNavigate();
  const { can } = useMyPermissions();
  const canCreateAgent = can("agents.create");
  const [showCreate, setShowCreate]       = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState<typeof templates[number] | null>(null);

  const useTemplate = (t: typeof templates[number]) => {
    if (!canCreateAgent) return;
    const params = new URLSearchParams();
    params.set("tab", "build");
    params.set("section", "instructions");
    params.set("agentName", t.name);
    params.set("agentPrompt", t.systemPrompt);
    navigate(`/agents/new?${params.toString()}`);
  };

  return (
    <div className="animate-fade-up">
      {showCreate    && <CreateAgentModal onClose={() => setShowCreate(false)} />}
      {showTemplates && <TemplateModal onClose={() => setShowTemplates(false)} />}

      {/* Page header */}
      <div className="px-6 pt-6 mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Home</h1>
        <p className="text-sm text-muted-foreground">
          Workspace overview — pick up a recent agent or create a new one.
        </p>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section
        className="mx-6 mb-8 rounded-2xl overflow-hidden border border-border"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary-soft)) 0%, #eef1ff 55%, #ffffff 100%)" }}
      >
        <div className="flex items-center justify-between px-10 py-10 gap-8">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-3xl font-bold text-foreground mb-2 tracking-tight">
              Welcome to Agent Studio
            </h2>
            <p className="text-sm text-muted-foreground mb-7 max-w-sm leading-relaxed">
              Build, connect, and operate your enterprise AI Agent workforce.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => canCreateAgent && setShowCreate(true)}
                disabled={!canCreateAgent}
                title={!canCreateAgent ? "You don't have permission to create agents." : undefined}
                className="btn-primary h-10 px-5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create new Agent <ArrowRight size={15} />
              </button>
              <button
                onClick={() => canCreateAgent && setShowTemplates(true)}
                disabled={!canCreateAgent}
                title={!canCreateAgent ? "You don't have permission to create agents." : undefined}
                className="btn-secondary h-10 px-5 rounded-lg bg-surface/70 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Browse templates
              </button>
            </div>
          </div>

          {/* Decorative illustration */}
          <div className="relative shrink-0 w-72 h-56 hidden md:block">
            <div className="absolute inset-4 rounded-2xl bg-white/70 border border-border shadow-sm" />
            <div className="absolute top-6 right-4 w-28 h-16 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center gap-1.5">
              <Sparkles size={16} className="text-primary" />
              <div className="space-y-1">
                <div className="h-1.5 w-12 rounded-full bg-primary-soft" />
                <div className="h-1.5 w-8 rounded-full bg-surface-muted" />
              </div>
            </div>
            <div className="absolute bottom-8 left-8 w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-md text-3xl">
              🤖
            </div>
            <div className="absolute bottom-10 right-10 w-10 h-10 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center">
              <ExternalLink size={14} className="text-muted-foreground" />
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 pb-8 space-y-8">

        {/* ── Get started ───────────────────────────────────────── */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-4">Get started</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {getStarted.map(g => (
              <a
                key={g.title}
                href={g.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border bg-surface overflow-hidden hover:border-primary/30 hover:shadow-soft transition-base"
              >
                <div className={`h-28 flex items-center justify-center relative ${g.bg}`}>
                  {g.kind === "video"
                    ? <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow"><Play size={16} className="text-red-500 ml-0.5" fill="currentColor" /></div>
                    : <BookOpen size={26} className="text-white/85" />
                  }
                  <ExternalLink size={12} className="absolute top-2.5 right-2.5 text-white/70" />
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">{g.label}</p>
                  <p className="text-xs font-semibold leading-snug">{g.title}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── Recent ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Recent</h2>
            <Link to="/agents" className="text-xs text-primary flex items-center gap-1 hover:text-primary-glow transition-base">
              All Agents <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recent.map(a => (
              <RecentAgentCard key={a.id} a={a} />
            ))}
          </div>
        </section>

        {/* ── Templates ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Templates</h2>
            <button
              onClick={() => canCreateAgent && setShowTemplates(true)}
              disabled={!canCreateAgent}
              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              More <ArrowRight size={12} />
            </button>
          </div>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {templates.slice(0, 4).map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted/50 transition-base">
                <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center text-xl shrink-0`}>{t.emoji}</div>
                <p className="text-sm font-medium flex-1 min-w-0 truncate">{t.name}</p>
                <span className="text-xs text-muted-foreground shrink-0">{t.cat}</span>
                <button
                  onClick={() => setDetailTemplate(t)}
                  className="shrink-0 h-8 px-4 rounded-lg border border-border text-xs font-medium hover:bg-surface-muted transition-base"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </section>

        {detailTemplate && (
          <TemplateDetailModal
            template={detailTemplate}
            onClose={() => setDetailTemplate(null)}
            onUse={() => { useTemplate(detailTemplate); setDetailTemplate(null); }}
          />
        )}

      </div>
    </div>
  );
}


