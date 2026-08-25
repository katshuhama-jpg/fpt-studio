import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Sparkles, Send, Paperclip, AtSign,
  Play, ExternalLink, X, Search, Edit, Copy, ShieldCheck,
  KeyRound, AlertTriangle, CheckCircle2, Plus
} from "lucide-react";
import { useState } from "react";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";

/* ─── Template data ─────────────────────────────────────────────────── */
const categories = ["All", "Customer support", "Sales", "HR & Internal", "Operations", "Finance"] as const;

const templates = [
  { id: 1, emoji: "💬", bg: "bg-blue-50",  name: "Customer care bot",    cat: "Customer support",
    desc: "Multilingual 24/7 support with escalation and live-agent handoff",
    systemPrompt: `# Customer Care Agent\n\nYou are a friendly, multilingual customer support specialist available 24/7.\n\n## Tone & Style\n- Warm, empathetic and professional\n- Respond in the customer's language automatically\n- Keep answers concise and actionable\n\n## Capabilities\n- Answer product and service questions\n- Handle complaints and escalate when needed\n- Guide users through common troubleshooting steps\n- Transfer to a human agent for complex issues\n\n## Limits\n- Never make promises about refunds or compensation without supervisor approval\n- Do not share internal processes or pricing structures not publicly available` },
  { id: 2, emoji: "📦", bg: "bg-green-50", name: "Product FAQ assistant", cat: "Customer support",
    desc: "Answers from manuals, docs, and warranty info",
    systemPrompt: `# Product FAQ Assistant\n\nYou help customers find answers from product manuals, troubleshooting guides, and warranty documentation.\n\n## Tone & Style\n- Clear, precise, and helpful\n- Use numbered steps for instructions\n- Always cite the relevant section of the manual when possible\n\n## Capabilities\n- Answer questions about product features and specifications\n- Guide users through setup and troubleshooting steps\n- Explain warranty coverage and claim procedures\n- Suggest related articles or videos\n\n## Limits\n- Only answer based on official documentation\n- Do not diagnose hardware faults that require professional service` },
  { id: 3, emoji: "🎯", bg: "bg-amber-50", name: "Sales lead qualifier",  cat: "Sales",
    desc: "BANT scoring, objection handling, and CRM handoff",
    systemPrompt: `# Sales Lead Qualifier Agent\n\nYou qualify inbound leads using the BANT framework (Budget, Authority, Need, Timeline) and hand off hot leads to the sales team.\n\n## Tone & Style\n- Consultative and curious — ask one question at a time\n- Friendly but efficient; respect the prospect's time\n\n## Qualification Flow\n1. Greet and understand the prospect's role and company\n2. Identify the core business need or pain point\n3. Explore budget range and decision-making authority\n4. Confirm purchase timeline\n5. Score the lead (Hot / Warm / Cold) and route accordingly\n\n## Limits\n- Do not quote specific pricing — route to sales rep\n- Do not make commitments on behalf of the sales team` },
  { id: 4, emoji: "🤝", bg: "bg-pink-50",  name: "HR onboarding bot",     cat: "HR & Internal",
    desc: "New-joiner flows, policy lookup, meeting scheduling",
    systemPrompt: `# HR Onboarding Assistant\n\nYou guide new employees through their first 30/60/90 days, answer HR policy questions, and help schedule onboarding meetings.\n\n## Tone & Style\n- Warm, encouraging, and clear\n- Use checklists and structured steps\n- Celebrate milestones (Day 1, first week, etc.)\n\n## Capabilities\n- Walk new joiners through onboarding checklists\n- Answer questions about leave policies, benefits, and payroll\n- Help schedule meetings with managers and teammates\n- Point employees to the right HR contacts or systems\n\n## Limits\n- Do not make decisions about policy exceptions\n- Salary and compensation queries → direct to HR Business Partner` },
  { id: 5, emoji: "🔧", bg: "bg-blue-50",  name: "IT helpdesk",           cat: "Operations",
    desc: "Password reset, VPN setup, and L1 ticket triage",
    systemPrompt: `# IT Helpdesk Agent\n\nYou are an L1 IT support agent that handles common technical issues, resets credentials, and triages tickets to the right team.\n\n## Tone & Style\n- Patient, methodical, and reassuring\n- Use numbered steps for technical instructions\n- Confirm resolution before closing a ticket\n\n## Capabilities\n- Guide users through password and MFA resets\n- Troubleshoot VPN, Wi-Fi, and email connectivity\n- Assist with software installation and access requests\n- Create and triage support tickets\n\n## Limits\n- Do not access or modify production systems\n- Escalate to L2/L3 for infrastructure, security incidents, or data loss` },
  { id: 6, emoji: "💰", bg: "bg-green-50", name: "Finance Q&A",           cat: "Finance",
    desc: "Invoice queries, payment status, and budget lookups",
    systemPrompt: `# Finance Q&A Agent\n\nYou help employees and vendors with invoice queries, payment status checks, and budget information lookups.\n\n## Tone & Style\n- Professional, accurate, and concise\n- Always confirm amounts and dates before sharing\n\n## Capabilities\n- Check invoice status and expected payment dates\n- Explain expense reimbursement processes\n- Provide budget utilisation summaries by department\n- Guide users through purchase order submission\n\n## Limits\n- Do not approve payments or modify financial records\n- Confidential financial data → only share with authorised requestors` },
  { id: 7, emoji: "📋", bg: "bg-amber-50", name: "Operations assistant",  cat: "Operations",
    desc: "Process guides, SOP lookup, and task routing",
    systemPrompt: `# Operations Assistant\n\nYou help operations teams find standard operating procedures, track task progress, and route work to the right department.\n\n## Tone & Style\n- Efficient, structured, and direct\n- Use bullet points and tables for process steps\n\n## Capabilities\n- Retrieve and summarise SOPs on demand\n- Log and route operational tasks and incidents\n- Provide status updates on ongoing processes\n- Identify bottlenecks and suggest escalation paths\n\n## Limits\n- Do not modify or approve SOPs without authorisation\n- Do not share restricted operational data outside approved teams` },
  { id: 8, emoji: "📣", bg: "bg-pink-50",  name: "Marketing assistant",   cat: "Sales",
    desc: "Campaign Q&A, content suggestions, and lead capture",
    systemPrompt: `# Marketing Assistant Agent\n\nYou support marketing campaigns by answering visitor questions, suggesting relevant content, and capturing qualified leads.\n\n## Tone & Style\n- Enthusiastic, creative, and on-brand\n- Personalise responses based on the visitor's interest\n\n## Capabilities\n- Answer questions about products, events, and promotions\n- Recommend blog posts, case studies, or demo videos\n- Capture lead information (name, email, company, interest)\n- Route hot leads to the sales team\n\n## Limits\n- Do not offer discounts or special pricing without approval\n- Do not collect sensitive personal data beyond standard lead fields` },
];

const recent = [
  { id: "hr",    name: "HR Agent",          emoji: "🤝", bg: "bg-blue-50",   status: "Active",  desc: "Answers employee questions about policies, benefits, and leave on Slack &…", editor: "Nguyen Minh", edited: "12 minutes ago" },
  { id: "ba",    name: "BA Agent",          emoji: "📋", bg: "bg-purple-50", status: "Active",  desc: "Helps Business Analysts draft user stories, BRDs, and analyze requirements from…", editor: "Pham Thu Ha", edited: "5 minutes ago" },
  { id: "onboarding", name: "Onboarding Agent", emoji: "🎓", bg: "bg-green-50", status: "Draft", desc: "Guides new employees through a 30/60/90-day roadmap with documents…", editor: "Tran Van Khoa", edited: "45 minutes ago" },
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
    params.set("tab", "develop");
    params.set("section", "general");
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

function CreateAgentModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  const handleBuild = () => {
    if (!prompt.trim()) return;
    const params = new URLSearchParams();
    params.set("tab", "develop");
    params.set("section", "general");
    params.set("agentPrompt", prompt.trim());
    navigate(`/agents/new?${params.toString()}`);
    onClose();
  };

  if (showTemplates) return <TemplateModal onClose={onClose} />;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[672px] mx-4 animate-fade-up">
        <div className="rounded-2xl border-2 border-primary/40 bg-white p-4 shadow-lg focus-within:border-primary transition-colors">
          <p className="text-sm font-medium text-foreground mb-3 px-1">Describe your agent</p>
          <textarea
            autoFocus
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed min-h-[80px]"
            placeholder="e.g. A 24/7 banking customer-care agent that can lock cards, look up loan rates and book consultations…"
            rows={3}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild(); }}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base" title="Attach file"><Paperclip size={16} /></button>
              <button className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base" title="Mention knowledge"><AtSign size={16} /></button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowTemplates(true)} className="text-sm text-muted-foreground hover:text-foreground transition-base">Use a template</button>
              <button onClick={handleBuild} disabled={!prompt.trim()} className="h-9 px-4 rounded-full bg-primary/80 hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium flex items-center gap-2 transition-base">
                <Sparkles size={14} /> Build agent <Send size={13} />
              </button>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-base shadow-sm">
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ─── Main ───────────────────────────────────────────────────────────── */

export default function Home() {
  const navigate = useNavigate();
  const { can } = useMyPermissions();
  const canCreateAgent = can("agents.create");
  const [showCreate, setShowCreate]       = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="animate-fade-up">
      {showCreate    && <CreateAgentModal onClose={() => setShowCreate(false)} />}
      {showTemplates && <TemplateModal onClose={() => setShowTemplates(false)} />}

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="mx-6 mt-6 mb-6 rounded-2xl overflow-hidden" style={{background:"linear-gradient(135deg,#0f1c3f 0%,#1a2d5a 60%,#1e3a6e 100%)"}}>
        <div className="flex items-center justify-between px-10 py-10 gap-8">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full mb-4">
              <Sparkles size={11} /> Agent Studio
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-2 tracking-tight">
              Welcome to Agent Studio
            </h1>
            <p className="text-sm text-white/60 mb-7 max-w-sm leading-relaxed">
              Build, connect, and operate your enterprise AI Agent workforce.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => canCreateAgent && setShowCreate(true)}
                disabled={!canCreateAgent}
                title={!canCreateAgent ? "You don't have permission to create agents." : undefined}
                className="h-10 px-5 rounded-lg bg-white text-[#1a2d5a] text-sm font-semibold flex items-center gap-2 hover:bg-white/90 transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                Create new Agent <ArrowRight size={15} />
              </button>
              <button
                onClick={() => canCreateAgent && setShowTemplates(true)}
                disabled={!canCreateAgent}
                title={!canCreateAgent ? "You don't have permission to create agents." : undefined}
                className="h-10 px-5 rounded-lg border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                Browse templates
              </button>
            </div>
          </div>

          {/* Workspace snapshot */}
          <div className="shrink-0 w-72 rounded-xl bg-white/8 border border-white/15 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Workspace snapshot</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Live
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[{label:"Agents",val:12},{label:"Connectors",val:48},{label:"Knowledge",val:9}].map(s => (
                <div key={s.label} className="rounded-lg bg-white/8 border border-white/10 p-3 text-center">
                  <div className="text-2xl font-bold text-white mb-0.5">{s.val}</div>
                  <div className="text-xs text-white/50">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 pb-8 space-y-8">

        {/* ── Get started ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Get started</h2>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-base">Hide</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {getStarted.map(g => (
              <div key={g.title} className="rounded-xl border border-border bg-surface overflow-hidden group cursor-pointer hover:border-primary/30 hover:shadow-soft transition-base">
                <div className={`h-28 flex items-center justify-center ${g.bg} relative`}>
                  {g.isAI
                    ? <span className="text-5xl font-bold text-white/30 select-none">AI</span>
                    : <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow"><Play size={16} className="text-red-500 ml-0.5" fill="currentColor" /></div>
                  }
                  {g.external && <ExternalLink size={12} className="absolute top-2 right-2 text-white/40" />}
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">{g.label}</p>
                  <p className="text-xs font-semibold leading-snug">{g.title}</p>
                </div>
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recent.map(a => (
              <Link key={a.id} to={`/agents/${a.id}`} className="group rounded-xl border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-soft transition-base flex flex-col">
                <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center text-xl mb-3`}>{a.emoji}</div>
                <div className="font-semibold text-sm mb-1">{a.name}</div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${a.status === "Active" ? "bg-emerald-500" : "bg-amber-400"}`} />
                  <span className="text-xs text-muted-foreground">{a.status}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1 mb-3">{a.desc}</p>
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <button onClick={e => { e.preventDefault(); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-base">
                    <Edit size={12} /> Edit
                  </button>
                  <button onClick={e => { e.preventDefault(); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-base">
                    <Copy size={12} /> Duplicate
                  </button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">{a.editor}</span> · Edited {a.edited}
                </div>
              </Link>
            ))}

            {/* Create new CTA card */}
            <button
              onClick={() => canCreateAgent && setShowCreate(true)}
              disabled={!canCreateAgent}
              title={!canCreateAgent ? "You don't have permission to create agents." : undefined}
              className="rounded-xl border border-border bg-surface p-4 flex flex-col items-center justify-center text-center hover:border-primary/30 hover:shadow-soft transition-base group min-h-[200px] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:shadow-none"
            >
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-base">
                <Plus size={22} className="text-white" />
              </div>
              <p className="font-semibold text-sm mb-1">Create new Agent</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[140px]">Start from a ready-made template or build from scratch.</p>
            </button>
          </div>
        </section>

        {/* ── Recommended AI agents ─────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Recommended AI agents</h2>
            <button className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-base">
              More <ArrowRight size={12} />
            </button>
          </div>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {recommendedAgents.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted/50 transition-base">
                <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center text-xl shrink-0`}>{a.emoji}</div>
                <p className="text-sm font-medium flex-1 min-w-0 truncate">{a.name}</p>
                <span className="text-xs text-muted-foreground shrink-0">{a.clones.toLocaleString()} clones</span>
                <button className="shrink-0 h-8 px-4 rounded-lg border border-border text-xs font-medium hover:bg-surface-muted transition-base">View</button>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

/* ─── Static data ────────────────────────────────────────────────────── */

const getStarted = [
  { label: "Introduction", title: "Why choose Agent Studio?",                      bg: "bg-amber-100",   isAI: false, external: false },
  { label: "Tutorial",     title: "Build an HR Agent that answers policy questions in 10 minutes", bg: "bg-blue-100", isAI: false, external: false },
  { label: "Case study",   title: "Automate your new employee onboarding process",  bg: "bg-indigo-100",  isAI: false, external: false },
  { label: "Updates",      title: "Changelog & latest updates",                     bg: "bg-indigo-200",  isAI: true,  external: true  },
];

const governance = [
  { label: "Pending approvals",  val: 7,    desc: "Agents awaiting deployment review", icon: ShieldCheck,    iconBg: "bg-blue-50",   iconColor: "text-blue-500" },
  { label: "Access requests",    val: 3,    desc: "Users requesting Agent access",      icon: KeyRound,       iconBg: "bg-amber-50",  iconColor: "text-amber-500" },
  { label: "Policy alerts",      val: 2,    desc: "Guardrail violations this week",     icon: AlertTriangle,  iconBg: "bg-red-50",    iconColor: "text-red-500" },
  { label: "Compliance",         val: "98%", desc: "Agents meeting governance policies", icon: CheckCircle2,  iconBg: "bg-green-50",  iconColor: "text-green-500" },
];

const recommendedAgents = [
  { id: "r1", emoji: "\uD83E\uDDD9", bg: "bg-purple-100", name: "Multi-Platform Workforce",  clones: 2005 },
  { id: "r2", emoji: "\uD83D\uDD0D", bg: "bg-amber-100",  name: "Sales Researcher",            clones: 1764 },
  { id: "r3", emoji: "\uD83D\uDCBC", bg: "bg-blue-100",   name: "LinkedIn Outreach & Follow up", clones: 1377 },
  { id: "r4", emoji: "\uD83D\uDCAC", bg: "bg-green-100",  name: "WhatsApp AI Agent",           clones: 1238 },
];
