import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon, Search01Icon, FilterIcon, MoreVerticalIcon, Chat01Icon, Activity01Icon,
  Attachment01Icon, AtSignIcon, SparklesIcon, SentIcon, Cancel01Icon, BoltIcon, TimeScheduleIcon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { getAgentKind } from "@/components/configure/agentKindStore";
import { agentPublishStore } from "@/components/configure/agentPublishStore";
import { runsStore } from "@/components/configure/runsStore";
import { triggerStore, triggerNeedsSetup, type TriggerType } from "@/components/configure/triggerStore";
import { AGENTS as agents } from "@/components/configure/agentStore";
import { getChannelName } from "@/components/configure/channelCatalog";

/* ─── Data ─────────────────────────────────────────────────────────────── */

const tabs = ["All agents", "Published", "Draft", "Shared with me"] as const;
const kindFilters = ["All", "Agents", "Automation Agents"] as const;

const TRIGGER_TYPE_LABEL: Record<TriggerType, string> = {
  scheduled: "Schedule",
  developer: "Webhook",
  external: "External app",
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function agentTabStatus(a: typeof agents[number]): "Published" | "Draft" {
  if (getAgentKind(a.id) === "automation") {
    return agentPublishStore.isPublished(a.id) ? "Published" : "Draft";
  }
  return a.status as "Published" | "Draft";
}

/* ─── Template data ─────────────────────────────────────────────────── */
const CONNECTOR_ICONS: Record<string, string> = {
  gmail: "G", slack: "S", drive: "D", sheets: "Sh", notion: "N", hubspot: "H",
  calendar: "📅", jira: "J", zoom: "Z", zendesk: "Zd",
};

const categories = ["All", "Customer support", "Sales", "HR & Internal", "Operations", "Finance"] as const;

const templates = [
  { id: 1, emoji: "💬", bg: "bg-blue-50",  name: "Customer care bot",    cat: "Customer support", popular: true,
    connectors: ["gmail","slack","zendesk"],
    desc: "Multilingual 24/7 support with escalation and live-agent handoff",
    systemPrompt: `# Customer Care Agent\n\nYou are a friendly, multilingual customer support specialist available 24/7.\n\n## Tone & Style\n- Warm, empathetic and professional\n- Respond in the customer's language automatically\n- Keep answers concise and actionable\n\n## Capabilities\n- Answer product and service questions\n- Handle complaints and escalate when needed\n- Guide users through common troubleshooting steps\n- Transfer to a human agent for complex issues\n\n## Limits\n- Never make promises about refunds or compensation without supervisor approval\n- Do not share internal processes or pricing structures not publicly available` },
  { id: 2, emoji: "📦", bg: "bg-green-50", name: "Product FAQ assistant", cat: "Customer support", popular: true,
    connectors: ["notion","drive","slack"],
    desc: "Answers from manuals, docs, and warranty info",
    systemPrompt: `# Product FAQ Assistant\n\nYou help customers find answers from product manuals, troubleshooting guides, and warranty documentation.\n\n## Tone & Style\n- Clear, precise, and helpful\n- Use numbered steps for instructions\n- Always cite the relevant section of the manual when possible\n\n## Capabilities\n- Answer questions about product features and specifications\n- Guide users through setup and troubleshooting steps\n- Explain warranty coverage and claim procedures\n- Suggest related articles or videos\n\n## Limits\n- Only answer based on official documentation\n- Do not diagnose hardware faults that require professional service` },
  { id: 3, emoji: "🎯", bg: "bg-amber-50", name: "Sales lead qualifier",  cat: "Sales", popular: true,
    connectors: ["hubspot","gmail","calendar"],
    desc: "BANT scoring, objection handling, and CRM handoff",
    systemPrompt: `# Sales Lead Qualifier Agent\n\nYou qualify inbound leads using the BANT framework (Budget, Authority, Need, Timeline) and hand off hot leads to the sales team.\n\n## Tone & Style\n- Consultative and curious — ask one question at a time\n- Friendly but efficient; respect the prospect's time\n\n## Qualification Flow\n1. Greet and understand the prospect's role and company\n2. Identify the core business need or pain point\n3. Explore budget range and decision-making authority\n4. Confirm purchase timeline\n5. Score the lead (Hot / Warm / Cold) and route accordingly\n\n## Limits\n- Do not quote specific pricing — route to sales rep\n- Do not make commitments on behalf of the sales team` },
  { id: 4, emoji: "🤝", bg: "bg-pink-50",  name: "HR onboarding bot",     cat: "HR & Internal", popular: true,
    connectors: ["calendar","slack","drive"],
    desc: "New-joiner flows, policy lookup, meeting scheduling",
    systemPrompt: `# HR Onboarding Assistant\n\nYou guide new employees through their first 30/60/90 days, answer HR policy questions, and help schedule onboarding meetings.\n\n## Tone & Style\n- Warm, encouraging, and clear\n- Use checklists and structured steps\n- Celebrate milestones (Day 1, first week, etc.)\n\n## Capabilities\n- Walk new joiners through onboarding checklists\n- Answer questions about leave policies, benefits, and payroll\n- Help schedule meetings with managers and teammates\n- Point employees to the right HR contacts or systems\n\n## Limits\n- Do not make decisions about policy exceptions\n- Salary and compensation queries → direct to HR Business Partner` },
  { id: 5, emoji: "🔧", bg: "bg-blue-50",  name: "IT helpdesk",           cat: "Operations", popular: true,
    connectors: ["jira","slack","zoom"],
    desc: "Password reset, VPN setup, and L1 ticket triage",
    systemPrompt: `# IT Helpdesk Agent\n\nYou are an L1 IT support agent that handles common technical issues, resets credentials, and triages tickets to the right team.\n\n## Tone & Style\n- Patient, methodical, and reassuring\n- Use numbered steps for technical instructions\n- Confirm resolution before closing a ticket\n\n## Capabilities\n- Guide users through password and MFA resets\n- Troubleshoot VPN, Wi-Fi, and email connectivity\n- Assist with software installation and access requests\n- Create and triage support tickets\n\n## Limits\n- Do not access or modify production systems\n- Escalate to L2/L3 for infrastructure, security incidents, or data loss` },
  { id: 6, emoji: "💰", bg: "bg-green-50", name: "Finance Q&A",           cat: "Finance", popular: false,
    connectors: ["sheets","gmail","notion"],
    desc: "Invoice queries, payment status, and budget lookups",
    systemPrompt: `# Finance Q&A Agent\n\nYou help employees and vendors with invoice queries, payment status checks, and budget information lookups.\n\n## Tone & Style\n- Professional, accurate, and concise\n- Always confirm amounts and dates before sharing\n\n## Capabilities\n- Check invoice status and expected payment dates\n- Explain expense reimbursement processes\n- Provide budget utilisation summaries by department\n- Guide users through purchase order submission\n\n## Limits\n- Do not approve payments or modify financial records\n- Confidential financial data → only share with authorised requestors` },
  { id: 7, emoji: "📋", bg: "bg-amber-50", name: "Operations assistant",  cat: "Operations", popular: false,
    connectors: ["notion","jira","slack"],
    desc: "Process guides, SOP lookup, and task routing",
    systemPrompt: `# Operations Assistant\n\nYou help operations teams find standard operating procedures, track task progress, and route work to the right department.\n\n## Tone & Style\n- Efficient, structured, and direct\n- Use bullet points and tables for process steps\n\n## Capabilities\n- Retrieve and summarise SOPs on demand\n- Log and route operational tasks and incidents\n- Provide status updates on ongoing processes\n- Identify bottlenecks and suggest escalation paths\n\n## Limits\n- Do not modify or approve SOPs without authorisation\n- Do not share restricted operational data outside approved teams` },
  { id: 8, emoji: "📣", bg: "bg-pink-50",  name: "Marketing assistant",   cat: "Sales", popular: false,
    connectors: ["hubspot","gmail","calendar"],
    desc: "Campaign Q&A, content suggestions, and lead capture",
    systemPrompt: `# Marketing Assistant Agent\n\nYou support marketing campaigns by answering visitor questions, suggesting relevant content, and capturing qualified leads.\n\n## Tone & Style\n- Enthusiastic, creative, and on-brand\n- Personalise responses based on the visitor's interest\n\n## Capabilities\n- Answer questions about products, events, and promotions\n- Recommend blog posts, case studies, or demo videos\n- Capture lead information (name, email, company, interest)\n- Route hot leads to the sales team\n\n## Limits\n- Do not offer discounts or special pricing without approval\n- Do not collect sensitive personal data beyond standard lead fields` },
];

/* ─── Template Modal ────────────────────────────────────────────────────── */

function TemplateModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [useCase, setUseCase] = useState("All");

  const filtered = templates.filter(t => {
    const q = search.toLowerCase();
    return (
      (!q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)) &&
      (useCase === "All" || t.cat === useCase)
    );
  });

  const popular = filtered.filter(t => t.popular);
  const all = filtered;

  const handleUse = (t: typeof templates[number]) => {
    const params = new URLSearchParams();
    params.set("tab", "build");
    params.set("section", "instructions");
    params.set("agentName", t.name);
    params.set("agentPrompt", t.systemPrompt);
    onClose();
    navigate(`/agents/new?${params.toString()}`);
  };

  const TemplateCard = ({ t }: { t: typeof templates[number] }) => (
    <div className="flex flex-col p-4 rounded-xl border border-border bg-white hover:border-primary/30 hover:shadow-soft transition-base group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center text-xl shrink-0`}>
          {t.emoji}
        </div>
        {t.popular && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Popular</span>
        )}
      </div>
      <p className="text-sm font-semibold mb-1">{t.name}</p>
      <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-3">{t.desc}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(t.connectors ?? []).slice(0, 4).map((c, i) => (
            <div key={i} className="w-5 h-5 rounded-md bg-surface-muted border border-border flex items-center justify-center text-[9px] font-bold text-muted-foreground">
              {CONNECTOR_ICONS[c] ?? c[0].toUpperCase()}
            </div>
          ))}
          {(t.connectors ?? []).length > 4 && (
            <span className="text-[10px] text-muted-foreground ml-0.5">+{(t.connectors ?? []).length - 4}</span>
          )}
        </div>
        <button
          onClick={() => handleUse(t)}
          className="h-7 px-3 rounded-lg border border-border bg-white hover:bg-primary hover:text-primary-foreground hover:border-primary text-xs font-medium transition-base opacity-0 group-hover:opacity-100"
        >
          Add
        </button>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-border flex flex-col max-h-[88vh] animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
          <div>
            <h2 className="font-display text-xl font-semibold">Template library</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Explore all templates optimized for each role and use case. Pick a template to start building an agent.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base mt-0.5 shrink-0">
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 pb-4 gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Filter pills */}
            <select
              value={useCase}
              onChange={e => setUseCase(e.target.value)}
              className="h-7 px-2.5 pr-6 rounded-lg border border-border bg-surface text-xs font-medium text-foreground appearance-none cursor-pointer focus:outline-none focus:border-primary"
            >
              <option value="All">Use case</option>
              {Array.from(new Set(templates.map(t => t.cat))).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              className="h-8 w-52 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-base"
              placeholder="Search templates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {popular.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Most popular</h3>
              <div className="grid grid-cols-3 gap-3">
                {popular.map(t => <TemplateCard key={t.id} t={t} />)}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold mb-3">All templates</h3>
            {all.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-10">No templates found.</p>
              : <div className="grid grid-cols-3 gap-3">
                  {all.map(t => <TemplateCard key={t.id} t={t} />)}
                </div>}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Agent cards (R2) ──────────────────────────────────────────────── */

function ConversationalCard({ a }: { a: typeof agents[number] }) {
  return (
    <Link
      to={`/agents/${a.id}`}
      className="group rounded-xl border border-border bg-surface hover:border-primary/30 hover:shadow-elev transition-base"
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${a.bg}`}>
            {a.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate mb-0.5">{a.name}</h3>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                a.status === "Published"
                  ? "bg-primary-soft text-primary"
                  : "bg-surface-muted text-muted-foreground"
              }`}>
                {a.status}
              </span>
              <span className="text-muted-foreground">· {a.model}</span>
            </div>
          </div>
          <button className="opacity-0 group-hover:opacity-100 transition-base text-muted-foreground hover:text-foreground p-1">
            <HugeiconsIcon icon={MoreVerticalIcon} size={14} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2 min-h-[32px]">{a.desc}</p>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Chat01Icon} size={12} className="text-muted-foreground" />
            <span className="text-xs">
              <b className="font-display">{a.convs.toLocaleString()}</b>
              <span className="text-muted-foreground ml-1">convs</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Activity01Icon} size={12} className="text-muted-foreground" />
            <span className="text-xs">
              <b className="font-display">{a.success}%</b>
              <span className="text-muted-foreground ml-1">resolved</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
          <span>Updated {a.updated}</span>
          {a.channels.length > 0 && (
            <>
              <span>·</span>
              {a.channels.map(c => (
                <span key={c} className="px-1.5 py-0.5 rounded bg-surface-muted">{c}</span>
              ))}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function AutomationCard({ a }: { a: typeof agents[number] }) {
  const published = agentPublishStore.isPublished(a.id);
  const channels = agentPublishStore.get(a.id).channels;
  const badgeLabel = published ? "PUBLISHED" : "DRAFT";
  const badgeClass = published ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted-foreground";
  const triggers = triggerStore.list(a.id);
  const lastRun = runsStore.list(a.id)[0]?.startedAt ?? null;
  const types = Array.from(new Set(triggers.map(t => t.type)));
  const needsSetupCount = triggers.filter(triggerNeedsSetup).length;

  return (
    <Link
      to={`/agents/${a.id}`}
      className="group rounded-xl border border-border bg-surface hover:border-indigo-300 hover:shadow-elev transition-base"
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${a.bg}`}>
            {a.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate mb-0.5">{a.name}</h3>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeClass}`}>
                {badgeLabel}
              </span>
              <span className="text-muted-foreground">· {a.model}</span>
            </div>
          </div>
          <button className="opacity-0 group-hover:opacity-100 transition-base text-muted-foreground hover:text-foreground p-1">
            <HugeiconsIcon icon={MoreVerticalIcon} size={14} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2 min-h-[32px]">{a.desc}</p>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon icon={BoltIcon} size={12} className="text-muted-foreground" />
            <span className="text-xs">
              <b className="font-display">{triggers.length}</b>
              <span className="text-muted-foreground ml-1">trigger{triggers.length === 1 ? "" : "s"}</span>
              {needsSetupCount > 0 && (
                <span className="text-warning ml-1">· {needsSetupCount} needs setup</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon icon={TimeScheduleIcon} size={12} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">
              {!published ? "Not run yet" : lastRun ? `Last run: ${relativeTime(lastRun)}` : "Last run: never"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground flex-wrap">
          <span>Updated {a.updated}</span>
          {types.length > 0 && (
            <>
              <span>·</span>
              {types.map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded border border-indigo-300 text-indigo-700 bg-white">{TRIGGER_TYPE_LABEL[t]}</span>
              ))}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Sends to:</span>
          {channels.length > 0
            ? channels.map(id => (
                <span key={id} className="px-1.5 py-0.5 rounded bg-surface-muted">{getChannelName(id)}</span>
              ))
            : <span>no channel yet</span>}
        </div>
      </div>
    </Link>
  );
}

function GroupEmptyState({ message, onShowAll }: { message: string; onShowAll?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-10 text-center">
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
      {onShowAll && (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-4 h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
        >
          Show all agents
        </button>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function AgentsList() {
  const navigate = useNavigate();
  const { can } = useMyPermissions();
  const canCreateAgent = can("agents.create");
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("All agents");
  const [kindFilter, setKindFilter] = useState<typeof kindFilters[number]>("All");
  const [search, setSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [prompt, setPrompt] = useState("");

  const tabCounts: Record<typeof tabs[number], number> = {
    "All agents": agents.length,
    "Published": agents.filter(a => agentTabStatus(a) === "Published").length,
    "Draft": agents.filter(a => agentTabStatus(a) === "Draft").length,
    "Shared with me": 0,
  };

  const tabFiltered =
    activeTab === "All agents"
      ? agents
      : activeTab === "Shared with me"
        ? []
        : agents.filter(a => agentTabStatus(a) === activeTab);

  const q = search.trim().toLowerCase();
  const searched = q
    ? tabFiltered.filter(a => a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q))
    : tabFiltered;

  const conversationalAgents = searched.filter(a => getAgentKind(a.id) === "conversational");
  const automationAgents = searched.filter(a => getAgentKind(a.id) === "automation");
  const allConversationalCount = agents.filter(a => getAgentKind(a.id) === "conversational").length;
  const allAutomationCount = agents.filter(a => getAgentKind(a.id) === "automation").length;

  const showConversational = kindFilter !== "Automation Agents";
  const showAutomation = kindFilter !== "Agents";
  const singleKindView = kindFilter !== "All";

  const clearFilters = () => {
    setKindFilter("All");
    setSearch("");
    setActiveTab("All agents");
  };

  const handleBuild = () => {
    if (!prompt.trim() || !canCreateAgent) return;
    const params = new URLSearchParams();
    params.set("tab", "build");
    params.set("section", "instructions");
    params.set("agentPrompt", prompt);
    navigate(`/agents/new?${params.toString()}`);
  };

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up">
      {showTemplates && (
        <TemplateModal onClose={() => setShowTemplates(false)} />
      )}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Manage every agent in this workspace — build, test, deploy and monitor.
        </p>
      </div>

      {/* ── Hero title + chat box ─────────────────────────────────────── */}
      <div className="flex flex-col items-center mb-8">
        <h2 className="font-display text-4xl font-semibold tracking-tight text-center mb-2">
          Start to build your agent today
        </h2>
        <p className="text-base text-muted-foreground text-center mb-6">
          Describe what you need and we'll build it for you
        </p>
        <div className="w-full max-w-[672px] rounded-2xl border-2 border-primary/40 bg-white p-4 shadow-sm focus-within:border-primary transition-colors">
        <textarea
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed min-h-[56px]"
          placeholder="e.g. A 24/7 banking customer-care agent that can lock cards, look up loan rates and book consultations…"
          rows={2}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild();
          }}
        />
        <div className="flex items-center justify-between mt-3">
          {/* Left tools */}
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
              title="Attach file"
            >
              <HugeiconsIcon icon={Attachment01Icon} size={16} />
            </button>
            <button
              className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
              title="Mention knowledge"
            >
              <HugeiconsIcon icon={AtSignIcon} size={16} />
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => canCreateAgent && setShowTemplates(true)}
              disabled={!canCreateAgent}
              title={!canCreateAgent ? "You don't have permission to create agents." : undefined}
              className="text-sm text-muted-foreground hover:text-foreground transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
            >
              Use a template
            </button>
            <button
              onClick={handleBuild}
              disabled={!prompt.trim() || !canCreateAgent}
              title={!canCreateAgent ? "You don't have permission to create agents." : undefined}
              className="btn-primary h-9 px-4 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <HugeiconsIcon icon={SparklesIcon} size={14} />
              Build agent
              <HugeiconsIcon icon={SentIcon} size={13} />
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* ── Tabs + search toolbar ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 border-b border-border pb-3">
        <div className="flex items-center gap-1">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 h-8 rounded-lg text-sm font-medium transition-base flex items-center gap-1.5 ${
                activeTab === t
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-surface-muted"
              }`}
            >
              {t}
              {tabCounts[t] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === t
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-sunken text-muted-foreground"
                }`}>
                  {tabCounts[t]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search agents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <button className="h-9 w-9 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center transition-base">
            <HugeiconsIcon icon={FilterIcon} size={14} />
          </button>
        </div>
      </div>

      {/* ── Kind filter ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6">
        {kindFilters.map(k => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            className={`px-3 h-7 rounded-full text-xs font-medium transition-base ${
              kindFilter === k
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:bg-surface-muted"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {/* ── Agents sections ───────────────────────────────────────────── */}
      {showConversational && (
        <div className="mb-8">
          {!singleKindView && (
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              Agents
              <span className="text-xs font-normal text-muted-foreground">{conversationalAgents.length}</span>
            </h2>
          )}
          {conversationalAgents.length === 0 ? (
            <GroupEmptyState
              message={allConversationalCount === 0
                ? "No agents yet — build one above and it will appear here."
                : "No agents match your search"}
              onShowAll={allConversationalCount > 0 ? clearFilters : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {conversationalAgents.map(a => <ConversationalCard key={a.id} a={a} />)}
            </div>
          )}
        </div>
      )}

      {showAutomation && (
        <div className="mb-8">
          {!singleKindView && (
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              Automation Agents
              <span className="text-xs font-normal text-muted-foreground">{automationAgents.length}</span>
            </h2>
          )}
          {automationAgents.length === 0 ? (
            <GroupEmptyState
              message={allAutomationCount === 0
                ? "No automation agents yet — add a trigger to an agent in Console and it will appear here."
                : "No agents match your search"}
              onShowAll={allAutomationCount > 0 ? clearFilters : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {automationAgents.map(a => <AutomationCard key={a.id} a={a} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
