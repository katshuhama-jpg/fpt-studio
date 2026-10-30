import type React from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon, Search01Icon, FilterIcon, Chat01Icon,
  SparklesIcon, Cancel01Icon, BoltIcon, TimeScheduleIcon, UserMultipleIcon, FlowCircleIcon,
  Shield01Icon, Image01Icon, Camera01Icon, BulbIcon, Book02Icon, Rocket01Icon, FlashIcon,
  FileEditIcon,
} from "@hugeicons/core-free-icons";
import { useCanShareAgent } from "@/components/configure/ShareAgentModal";
import { useAgentShareVersion, agentShareStore } from "@/components/configure/agentShareStore";
import { useState, useMemo, useEffect } from "react";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { useGroupAccess, isOwnedOrShared } from "@/pages/organization/scopeAccess";
import { getAgentKind } from "@/components/configure/agentKindStore";
import { agentPublishStore } from "@/components/configure/agentPublishStore";
import { runsStore } from "@/components/configure/runsStore";
import { triggerStore, triggerNeedsSetup, type TriggerType } from "@/components/configure/triggerStore";
import { AGENTS as ALL_AGENTS } from "@/components/configure/agentStore";
import { processStore } from "@/components/process/processStore";
// Nhân sự số Quy trình are AgentRecords too (kind "process") - same tabs, counts and statuses,
// listed in their own "Quy trình" group below.
const agents = ALL_AGENTS;
import { useOrg } from "@/pages/organization/orgStore";
import { recheckAgentGroupPublish } from "@/components/configure/collabGroupStore";
import { getChannelName } from "@/components/configure/channelCatalog";
import { AgentVersionLines, agentGovState } from "@/components/governance/governanceUi";
import { agentModelStore } from "@/components/configure/agentModelStore";
import { getCurrentTenantId, subscribeTenantChange } from "@/lib/spaceStore";

/* ─── Data ─────────────────────────────────────────────────────────────── */

const tabs = ["Tất cả Nhân sự số", "Published", "Draft", "Removed", "Chờ duyệt", "Bị từ chối", "Shared with me"] as const;
/** Display labels — "Published/Draft" read as "Đang live/Bản nháp" to match the card lines. */
const TAB_LABEL: Partial<Record<typeof tabs[number], string>> = { Published: "Đang live", Draft: "Bản nháp", Removed: "Đã gỡ", "Shared with me": "Được thêm vào" };
const kindFilters = ["All", "Nhân sự số", "Nhân sự số tự động"] as const;

/** Gợi ý mô tả khi tạo Nhân sự số Quy trình (AI dựng sẵn các bước). */
const PROCESS_SUGGESTIONS = [
  { label: "Đề nghị mua sắm", prompt: "Người đề nghị gõ /Đề nghị mua sắm trong chat. Kiểm ngân sách, thiếu thì người đề nghị sửa lại. Nhân sự số lấy và so sánh báo giá 3 nhà cung cấp. Trưởng phòng duyệt, trên 50 triệu thì Kế toán trưởng và Giám đốc khối cùng duyệt. Tạo PO, Ban Mua sắm xác nhận rồi gửi nhà cung cấp, chờ phiếu nhập kho và chứng từ, đối chiếu rồi báo kế toán thanh toán." },
  { label: "Đối chiếu hoá đơn với PO", prompt: "Kế toán gõ /Đối chiếu hoá đơn và đính kèm hoá đơn VAT. Đọc số tiền, lấy PO tương ứng từ ERP để so khớp. Khớp thì ghi nhận công nợ, lệch thì chuyển kế toán xem lại." },
  { label: "Rule thẩm định MB Life", prompt: "Thẩm định viên gõ /Thẩm định bồi thường với hồ sơ đã đọc OCR và số hợp đồng MB Life. Lấy Policy, lịch sử bồi thường và bảng tham chiếu cùng lúc, chạy rule chứng từ, hiệu lực và thẩm định không dùng LLM. Có WARN thì thẩm định viên xem lại." },
] as const;


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

/** Live state comes from agentPublishStore for every Agent — the same source the card's version
 * lines and the Agent page use, so the "Published" tab never disagrees with what a card shows. */
function agentTabStatus(a: typeof agents[number]): "Published" | "Draft" | "Removed" {
  const s = agentPublishStore.lifecycle(a.id);
  return s === "live" ? "Published" : s === "removed" ? "Removed" : "Draft";
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
    systemPrompt: `# Sales Lead Qualifier Agent\n\nYou qualify inbound leads using the BANT framework (Budget, Authority, Need, Timeline) and hand off hot leads to the sales team.\n\n## Tone & Style\n- Consultative and curious - Ask one question at a time\n- Friendly but efficient; respect the prospect's time\n\n## Qualification Flow\n1. Greet and understand the prospect's role and company\n2. Identify the core business need or pain point\n3. Explore budget range and decision-making authority\n4. Confirm purchase timeline\n5. Score the lead (Hot / Warm / Cold) and route accordingly\n\n## Limits\n- Do not quote specific pricing - Route to sales rep\n- Do not make commitments on behalf of the sales team` },
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
            <p className="text-sm text-muted-foreground mt-0.5">Xem mọi mẫu theo vai trò và tình huống. Chọn một mẫu để bắt đầu tạo Nhân sự số.</p>
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

/** Owner/Admin-only hint that the Agent is shared in the Console, e.g. "Cả Space" or "2 người". */
function AgentShareChip({ agentId }: { agentId: string }) {
  const canShare = useCanShareAgent(agentId);
  const s = agentShareStore.get(agentId);
  const named = s.people.filter(p => p.mode !== "none").length;
  if (!canShare || (s.general === "none" && named === 0)) return null;
  return (
    <span title="Số người được cấp quyền trên Nhân sự số này" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary-soft text-primary text-[11px] font-medium whitespace-nowrap shrink-0">
      <HugeiconsIcon icon={UserMultipleIcon} size={11} /> {s.general === "space" ? "Cả Space" : `${named} người`}
    </span>
  );
}


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
            <AgentVersionLines agentId={a.id} />
          </div>
          <AgentShareChip agentId={a.id} />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2 min-h-[32px]">{a.desc}</p>

        <div className="flex items-center gap-1.5 pt-3 border-t border-border">
          <HugeiconsIcon icon={Chat01Icon} size={12} className="text-muted-foreground" />
          <span className="text-xs">
            <b className="font-display">{a.convs.toLocaleString()}</b>
            <span className="text-muted-foreground ml-1">convs</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
          <span>Updated {a.updated}</span>
          <span>·</span>
          <span className="truncate">{agentModelStore.label(a.id)}</span>
        </div>
      </div>
    </Link>
  );
}

/** Same card anatomy as ConversationalCard (tile, name, version line, description, stat row,
 * updated line) so a Nhân sự số Quy trình reads as the same kind of thing in the list. */
function ProcessCard({ p }: { p: typeof agents[number] }) {
  const g = processStore.getGraph(p.id);
  const steps = g ? g.nodes.filter((n: any) => n.type !== "note").length : ({ pr: 29, invoice: 11, "mbl-rules": 12 } as Record<string, number>)[p.processId ?? ""] ?? 1;
  return (
    <Link
      to={`/agents/${p.id}`}
      className="group rounded-xl border border-border bg-surface hover:border-primary/30 hover:shadow-elev transition-base"
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${p.bg}`}>
            {p.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate mb-0.5">{p.name}</h3>
            <AgentVersionLines agentId={p.id} />
          </div>
          <AgentShareChip agentId={p.id} />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2 min-h-[32px]">{p.desc}</p>

        <div className="flex items-center gap-1.5 pt-3 border-t border-border">
          <HugeiconsIcon icon={FileEditIcon} size={12} className="text-muted-foreground" />
          <span className="text-xs">
            <b className="font-display">{p.convs.toLocaleString()}</b>
            <span className="text-muted-foreground ml-1">hồ sơ</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
          <span>Updated {p.updated}</span>
          <span>·</span>
          <span className="truncate">{steps} bước</span>
        </div>
      </div>
    </Link>
  );
}

function AutomationCard({ a }: { a: typeof agents[number] }) {
  const published = agentPublishStore.isPublished(a.id);
  const channels = agentPublishStore.get(a.id).channels;
  const badgeLabel = published ? "PUBLISHED" : agentPublishStore.lifecycle(a.id) === "removed" ? "ĐÃ GỠ" : "DRAFT";
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
            <AgentVersionLines agentId={a.id} />
          </div>
          <AgentShareChip agentId={a.id} />
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
              {!published ? "Not run yet" : lastRun ? `Last run: ${relativeTime(lastRun)}` : "Last run: Never"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground flex-wrap">
          <span>Updated {a.updated}</span>
          <span>·</span>
          <span className="truncate">{agentModelStore.label(a.id)}</span>
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
          Xem tất cả Nhân sự số
        </button>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

/** Gợi ý của production cho Nhân sự số Năng suất. */
const SUGGESTIONS = [
  { label: "Hỗ trợ khách hàng", prompt: "Trợ lý hỗ trợ khách hàng ngân hàng, trả lời thắc mắc về thẻ tín dụng, giọng trang trọng, tiếng Việt." },
  { label: "Tra cứu nội bộ", prompt: "Trợ lý tra cứu quy định nhân sự và hướng dẫn IT cho nhân viên, trả lời ngắn gọn, dẫn nguồn tài liệu." },
  { label: "Tư vấn bán hàng", prompt: "Trợ lý tư vấn gói dịch vụ, hỏi nhu cầu khách hàng và chấm điểm khách tiềm năng trước khi chuyển cho sales." },
] as const;

const BLANK_TIPS = {
  productivity: [
    { icon: BulbIcon, title: "Bắt đầu với mục tiêu rõ ràng", desc: "Mô tả điều bạn muốn nhân sự số làm bằng ngôn ngữ tự nhiên - trả lời câu hỏi nhân sự, review code hay tổng hợp báo cáo." },
    { icon: Book02Icon, title: "Cung cấp kiến thức", desc: "Kết nối tài liệu, website hoặc công cụ để nhân sự số có đủ ngữ cảnh trả lời chính xác." },
    { icon: Rocket01Icon, title: "Kiểm thử và triển khai", desc: "Chạy thử nhân sự số trong môi trường an toàn, tinh chỉnh câu trả lời rồi đưa vào phục vụ cả nhóm." },
  ],
  process: [
    { icon: BulbIcon, title: "Mô tả các bước", desc: "Nêu thứ tự việc, ai duyệt, bước nào giao cho Nhân sự số Năng suất - AI dựng sẵn các bước trên canvas." },
    { icon: Book02Icon, title: "Kết nối hệ thống", desc: "Gọi hệ thống nội bộ bằng node Connector: Connector, API Tool hoặc MCP đã kết nối trong Space." },
    { icon: Rocket01Icon, title: "Chạy thử và publish", desc: "Chạy thử với dữ liệu mẫu, xem đường đi qua từng bước rồi publish để người dùng gõ / mở hồ sơ trong Workspace." },
  ],
} as const;

type CreateKind = "productivity" | "process";

/** Ô tạo Nhân sự số của production ("Bắt đầu từ đâu?"), thêm nút chọn Năng suất | Quy trình.
 * Dùng chung cho màn Space trống và modal Tạo nhân sự số. */
function CreateBox({ kind, setKind, prompt, setPrompt, onBuild, onTemplates, canCreate, lockKind }: {
  lockKind?: boolean; kind: CreateKind; setKind: (k: CreateKind) => void; prompt: string; setPrompt: (v: string) => void;
  onBuild: () => void; onTemplates: () => void; canCreate: boolean;
}) {
  const isProc = kind === "process";
  const [plusOpen, setPlusOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const noPerm = !canCreate ? "Bạn không có quyền tạo Nhân sự số." : undefined;
  useEffect(() => {
    if (!plusOpen && !modeOpen) return;
    const close = () => { setPlusOpen(false); setModeOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-cb-pop]")) close(); };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener("mousedown", onDown); };
  }, [plusOpen, modeOpen]);
  return (
    <div className="relative w-full rounded-xl border border-border bg-surface p-3 shadow-sm focus-within:border-ring transition-colors">
      <div role="radiogroup" aria-label="Loại Nhân sự số" className={`${lockKind ? "hidden" : "flex"} gap-1 p-1 rounded-lg bg-surface-muted w-fit`}>
        {([{ id: "productivity", label: "Năng suất" }, { id: "process", label: "Quy trình" }] as const).map(k => (
          <button key={k.id} type="button" role="radio" aria-checked={kind === k.id}
            onClick={() => { setKind(k.id); setPrompt(""); }}
            className={`h-7 px-3 rounded-md text-xs font-medium transition-base ${kind === k.id ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {k.label}
          </button>
        ))}
      </div>
      <p className={`${lockKind ? "hidden" : ""} text-xs text-muted-foreground mt-2 px-0.5`}>
        {isProc ? "Dựng quy trình theo node: giao bước cho Nhân sự số, người duyệt, hệ thống, rẽ nhánh theo luật." : "Dựng bằng prompt, hỗ trợ việc hằng ngày."}
      </p>
      <textarea
        aria-label="Mô tả nhân sự số"
        className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed min-h-[64px] mt-1 px-0.5"
        placeholder={isProc ? "VD: Người đề nghị gõ /Đề nghị mua sắm. Trưởng phòng duyệt, trên 50 triệu thì Giám đốc khối cùng duyệt, rồi tạo PO." : "Trợ lý hỗ trợ khách hàng ngân hàng, trả lời thắc mắc về thẻ tín dụng, giọng trang trọng, tiếng Việt."}
        rows={3}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onBuild(); }}
      />
      <div className="flex items-center gap-1 mt-1">
        <div className="relative" data-cb-pop>
          <button type="button" aria-label="Thêm tệp hoặc ảnh" aria-expanded={plusOpen} onClick={() => { setPlusOpen(v => !v); setModeOpen(false); }}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base">
            <HugeiconsIcon icon={Add01Icon} size={16} />
          </button>
          {plusOpen && (
            <div role="menu" className="absolute left-0 bottom-10 z-20 w-52 rounded-lg border border-border bg-surface shadow-elev p-1">
              <button type="button" role="menuitem" onClick={() => setPlusOpen(false)} className="w-full h-8 px-2 rounded-md flex items-center gap-2 text-sm hover:bg-surface-muted"><HugeiconsIcon icon={Image01Icon} size={14} />Thêm tệp hoặc ảnh</button>
              <button type="button" role="menuitem" onClick={() => setPlusOpen(false)} className="w-full h-8 px-2 rounded-md flex items-center gap-2 text-sm hover:bg-surface-muted"><HugeiconsIcon icon={Camera01Icon} size={14} />Chụp ảnh màn hình</button>
            </div>
          )}
        </div>
        <div className="relative" data-cb-pop>
          <button type="button" aria-expanded={modeOpen} onClick={() => { setModeOpen(v => !v); setPlusOpen(false); }}
            className="h-8 px-2 rounded-lg flex items-center gap-1.5 text-xs text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base">
            <HugeiconsIcon icon={mode === "manual" ? Shield01Icon : FlashIcon} size={13} />
            {mode === "manual" ? "Thủ công" : "Tự động"}
          </button>
          {modeOpen && (
            <div role="menu" aria-label="Chế độ duyệt" className="absolute left-0 bottom-10 z-20 w-64 rounded-lg border border-border bg-surface shadow-elev p-2">
              <div className="text-[10.5px] font-medium tracking-wide text-muted-foreground px-1.5 pb-1">CHẾ ĐỘ DUYỆT</div>
              {([
                { id: "manual", name: "Thủ công", desc: "Luôn cần xác nhận trước khi thay đổi cấu hình", icon: Shield01Icon, def: false },
                { id: "auto", name: "Tự động", desc: "Tự duyệt thay đổi cấu hình. Công cụ kết nối ngoài vẫn hỏi.", icon: FlashIcon, def: true },
              ] as const).map(m => (
                <button key={m.id} type="button" role="menuitemradio" aria-checked={mode === m.id} onClick={() => { setMode(m.id); setModeOpen(false); }}
                  className={`w-full text-left px-1.5 py-1.5 rounded-md flex gap-2 hover:bg-surface-muted ${mode === m.id ? "bg-primary-soft/50" : ""}`}>
                  <HugeiconsIcon icon={m.icon} size={14} className="mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-medium">{m.name}{m.def && <span className="text-[10px] font-medium text-muted-foreground bg-surface-muted rounded px-1">MẶC ĐỊNH</span>}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{m.desc}</span>
                  </span>
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1.5 px-1.5 text-[11px] text-muted-foreground">Lựa chọn được lưu cho các phiên sau.</div>
            </div>
          )}
        </div>
        <div className="flex-1" />
        {!isProc && (
          <button type="button" onClick={() => canCreate && onTemplates()} disabled={!canCreate} title={noPerm}
            className="h-8 px-2.5 text-sm text-muted-foreground hover:text-foreground transition-base disabled:opacity-40 disabled:cursor-not-allowed">
            Dùng mẫu có sẵn
          </button>
        )}
        <button type="button" onClick={onBuild} disabled={prompt.trim().length < 20 || !canCreate} title={noPerm ?? (prompt.trim().length < 20 ? "Mô tả tối thiểu 20 ký tự" : undefined)}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <HugeiconsIcon icon={SparklesIcon} size={14} />
          {isProc ? "Tạo bản nháp Quy trình" : "Tạo bản nháp"}
        </button>
      </div>
    </div>
  );
}

function CreateExtras({ kind, setPrompt, onBlank, canCreate }: { kind: CreateKind; setPrompt: (v: string) => void; onBlank: () => void; canCreate: boolean }) {
  return (
    <>
      <div className="flex items-center justify-center flex-wrap gap-2 mt-4">
        <span className="text-xs text-muted-foreground">Gợi ý</span>
        {(kind === "process" ? PROCESS_SUGGESTIONS : SUGGESTIONS).map(s => (
          <button key={s.label} type="button" onClick={() => canCreate && setPrompt(s.prompt)} disabled={!canCreate}
            className="h-7 px-3 rounded-full border border-border text-xs font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base disabled:opacity-40 disabled:cursor-not-allowed">
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex justify-center">
        <button type="button" onClick={() => canCreate && onBlank()} disabled={!canCreate} title={!canCreate ? "Bạn không có quyền tạo Nhân sự số." : undefined}
          className="mt-3 h-9 px-4 rounded-lg bg-surface-muted text-sm font-medium hover:bg-surface-sunken transition-base disabled:opacity-40 disabled:cursor-not-allowed">
          Tự dựng từ đầu
        </button>
      </div>
    </>
  );
}

export default function AgentsList({ mode = "agents" }: { mode?: "agents" | "process" }) {
  const isProcPage = mode === "process";
  const navigate = useNavigate();
  const { can } = useMyPermissions();
  const access = useGroupAccess("agents");
  const shareVersion = useAgentShareVersion();
  const canCreateAgent = can("agents.create");
  const { tree: orgTree } = useOrg();

  // Anti-bypass: re-check every Nhóm cộng tác-scoped Agent's live roster overlap on a normal
  // page visit (see collabGroupStore.recheckAgentGroupPublish's doc comment) — this is the
  // "there is never a safe window" enforcement for Vấn đề 2, not just a one-time gate at publish.
  useEffect(() => {
    for (const a of agents) recheckAgentGroupPublish(a.id, orgTree);
  }, [orgTree]);

  // A role whose Agents View Scope is "Own & Shared" (or that has no View permission at all —
  // View is only ever needed to see other people's agents) only ever sees agents it created or
  // that were shared with it, in every tab and count below — not just a "Shared with me" filter.
  const visibleAgents = useMemo(
    () => (access.canSeeAll ? agents : agents.filter(a => isOwnedOrShared(a, access.userId))).filter(a => isProcPage ? a.kind === "process" : a.kind !== "process"),
    [access.canSeeAll, access.userId, shareVersion, isProcPage],
  );
  const sharedWithMe = useMemo(
    () => agents.filter(a => a.ownerId !== access.userId && isOwnedOrShared(a, access.userId) && (isProcPage ? a.kind === "process" : a.kind !== "process")),
    [access.userId, shareVersion, isProcPage],
  );

  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Tất cả Nhân sự số");
  const [kindFilter, setKindFilter] = useState<typeof kindFilters[number]>("All");
  const [search, setSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [createKind, setCreateKind] = useState<CreateKind>(isProcPage ? "process" : "productivity");
  const [createOpen, setCreateOpen] = useState(false);
  const [tenantId, setTenantId] = useState(getCurrentTenantId());
  useEffect(() => subscribeTenantChange(() => setTenantId(getCurrentTenantId())), []);
  useEffect(() => {
    if (!createOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCreateOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createOpen]);
  const isProcessKind = createKind === "process";

  const tabCounts: Record<typeof tabs[number], number> = {
    "Tất cả Nhân sự số": visibleAgents.length,
    "Published": visibleAgents.filter(a => agentTabStatus(a) === "Published").length,
    "Draft": visibleAgents.filter(a => agentTabStatus(a) === "Draft").length,
    "Removed": visibleAgents.filter(a => agentTabStatus(a) === "Removed").length,
    "Chờ duyệt": visibleAgents.filter(a => agentGovState(a.id)?.state === "pending").length,
    "Bị từ chối": visibleAgents.filter(a => agentGovState(a.id)?.state === "rejected").length,
    "Shared with me": sharedWithMe.length,
  };

  const tabFiltered =
    activeTab === "Tất cả Nhân sự số"
      ? visibleAgents
      : activeTab === "Shared with me"
        ? sharedWithMe
        : activeTab === "Chờ duyệt"
          ? visibleAgents.filter(a => agentGovState(a.id)?.state === "pending")
          : activeTab === "Bị từ chối"
            ? visibleAgents.filter(a => agentGovState(a.id)?.state === "rejected")
            : visibleAgents.filter(a => agentTabStatus(a) === activeTab);

  const q = search.trim().toLowerCase();
  const searched = q
    ? tabFiltered.filter(a => a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q))
    : tabFiltered;

  const notProcess = (a: typeof agents[number]) => a.kind !== "process";
  const conversationalAgents = searched.filter(a => notProcess(a) && getAgentKind(a.id) === "conversational");
  const automationAgents = searched.filter(a => notProcess(a) && getAgentKind(a.id) === "automation");
  const allConversationalCount = visibleAgents.filter(a => notProcess(a) && getAgentKind(a.id) === "conversational").length;
  const allAutomationCount = visibleAgents.filter(a => notProcess(a) && getAgentKind(a.id) === "automation").length;

  const showConversational = !isProcPage && kindFilter !== "Nhân sự số tự động";
  const showAutomation = !isProcPage && kindFilter !== "Nhân sự số";
  const showProcess = isProcPage;
  const processAgents = searched.filter(a => a.kind === "process");
  const allProcessCount = visibleAgents.filter(a => a.kind === "process").length;
  const singleKindView = isProcPage || kindFilter !== "All";

  const clearFilters = () => {
    setKindFilter("All");
    setSearch("");
    setActiveTab("Tất cả Nhân sự số");
  };

  const isBlankSpace = tenantId === "bo-tai-chinh" || visibleAgents.length === 0;
  const kpi = useMemo(() => {
    const total = visibleAgents.length;
    const active = visibleAgents.filter(a => agentTabStatus(a) === "Published").length;
    const convs = visibleAgents.reduce((n, a) => n + (Number((a as any).convs) || 0), 0);
    return { total, active, convs, users: Math.round(convs / 6) };
  }, [visibleAgents]);
  const handleBlank = () => navigate(isProcessKind ? "/process/new" : "/agents/new?tab=build&section=instructions");

  const handleBuild = () => {
    if (!prompt.trim() || !canCreateAgent) return;
    if (isProcessKind) {
      const sug = PROCESS_SUGGESTIONS.find(x => x.prompt === prompt);
      const params = new URLSearchParams({ prompt });
      if (sug) params.set("name", sug.label);
      navigate(`/process/new?${params.toString()}`);
      return;
    }
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

      {/* Page header - như production: tiêu đề bên trái, nút Tạo nhân sự số bên phải */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight mb-1">{isProcPage ? "Nhân sự số Quy trình" : "Nhân sự số Năng suất"}</h1>
          <p className="text-sm text-muted-foreground">
            {isProcPage ? "Dựng quy trình theo node: giao bước cho Nhân sự số, người duyệt và hệ thống, rẽ nhánh theo luật. Mỗi lần chạy là một hồ sơ." : "Quản lý mọi nhân sự số trong workspace - dựng, kiểm thử, triển khai và giám sát."}
          </p>
        </div>
        {!isBlankSpace && (
          <button type="button" onClick={() => canCreateAgent && setCreateOpen(true)} disabled={!canCreateAgent}
            title={!canCreateAgent ? "Bạn không có quyền tạo Nhân sự số." : undefined}
            className="btn-primary shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
            <HugeiconsIcon icon={Add01Icon} size={14} />
            {isProcPage ? "Tạo Quy trình" : "Tạo nhân sự số"}
          </button>
        )}
      </div>

      {isBlankSpace ? (
        /* ── Space chưa có Nhân sự số: màn chào của production ───────────── */
        <div className="flex flex-col items-center pt-10 pb-16">
          <h2 className="font-display text-[32px] leading-tight font-semibold tracking-tight text-center max-w-[440px]">
            {isProcPage ? "Dựng Quy trình đầu tiên của bạn" : "Sẵn sàng xây dựng nhân sự số đầu tiên của bạn?"}
          </h2>
          <p className="text-[15px] text-muted-foreground text-center mt-3 mb-7">{isProcPage ? "Mô tả quy trình, AI dựng sẵn các bước để bạn chỉnh tiếp." : "Mô tả nhân sự số bạn cần, mọi thứ đều chỉnh được sau."}</p>
          <div className="w-full max-w-[640px]">
            <CreateBox kind={createKind} setKind={setCreateKind} prompt={prompt} setPrompt={setPrompt} onBuild={handleBuild} onTemplates={() => setShowTemplates(true)} canCreate={canCreateAgent} lockKind />
            <CreateExtras kind={createKind} setPrompt={setPrompt} onBlank={handleBlank} canCreate={canCreateAgent} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-7 mt-14">
              {BLANK_TIPS[createKind].map(t => (
                <div key={t.title}>
                  <HugeiconsIcon icon={t.icon} size={18} className="text-primary" />
                  <div className="text-sm font-semibold mt-2.5">{t.title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Số liệu như production ─────────────────────────────────────── */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground">{isProcPage ? "Quy trình đang live" : "Nhân sự số đang hoạt động"}</div>
            <div className="mt-2 text-xl font-semibold font-display">{kpi.active} <span className="text-sm font-normal text-muted-foreground">/ {kpi.total}</span></div>
            <div className="mt-1.5 text-[11.5px] text-muted-foreground">{kpi.total - kpi.active} {isProcPage ? "Quy trình" : "nhân sự số"} chưa xuất bản</div>
          </div>
          <div className="rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground">{isProcPage ? "Hồ sơ 7 ngày" : "Hội thoại 7 ngày"}</div>
            <div className="mt-2 text-xl font-semibold font-display">{kpi.convs.toLocaleString("vi-VN")}</div>
            <div className="mt-1.5 text-[11.5px] text-muted-foreground">{isProcPage ? "Tổng các Quy trình trong Space" : "Tổng các Nhân sự số trong Space"}</div>
          </div>
          <div className="rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground">{isProcPage ? "Người khởi chạy 7 ngày" : "Người dùng 7 ngày"}</div>
            <div className="mt-2 text-xl font-semibold font-display">{kpi.users.toLocaleString("vi-VN")}</div>
            <div className="mt-1.5 text-[11.5px] text-muted-foreground">{isProcPage ? "Người đã gõ /tên Quy trình trong Workspace" : "Người đã trò chuyện với Nhân sự số"}</div>
          </div>
          <div className="rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground">{isProcPage ? "Hồ sơ lỗi" : "Đánh giá tích cực"}</div>
            <div className="mt-2 text-base font-medium text-muted-foreground">Chưa có</div>
            <div className="mt-1.5 text-[11.5px] text-muted-foreground">{isProcPage ? "Chưa có hồ sơ nào dừng ở bước lỗi" : "Chưa có lượt đánh giá nào"}</div>
          </div>
        </div>
      )}

      {createOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setCreateOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="create-title" className="relative w-full max-w-[540px] rounded-xl bg-surface p-5 shadow-elev">
            <button type="button" aria-label="Đóng" onClick={() => setCreateOpen(false)} className="absolute right-3 top-3 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-muted">
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </button>
            <h2 id="create-title" className="text-lg font-semibold">{isProcPage ? "Tạo Quy trình" : "Bắt đầu từ đâu?"}</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{isProcPage ? "Mô tả quy trình, AI dựng sẵn các bước để bạn chỉnh tiếp." : "Mô tả nhân sự số bạn cần, mọi thứ đều chỉnh được sau."}</p>
            <CreateBox kind={createKind} setKind={setCreateKind} prompt={prompt} setPrompt={setPrompt} onBuild={handleBuild} onTemplates={() => { setCreateOpen(false); setShowTemplates(true); }} canCreate={canCreateAgent} lockKind />
            <CreateExtras kind={createKind} setPrompt={setPrompt} onBlank={handleBlank} canCreate={canCreateAgent} />
          </div>
        </div>,
        document.body,
      )}

      {!isBlankSpace && (<>
      {/* ── Tabs + search toolbar ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 border-b border-border pb-3">
        <div className="flex items-center gap-1 flex-wrap">
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
              {isProcPage && t === "Tất cả Nhân sự số" ? "Tất cả" : (TAB_LABEL[t] ?? t)}
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
              placeholder={isProcPage ? "Tìm Quy trình…" : "Tìm Nhân sự số…"}
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
      <div className={`${isProcPage ? "hidden" : "flex"} items-center gap-1 mb-6`}>
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
              Nhân sự số
              <span className="text-xs font-normal text-muted-foreground">{conversationalAgents.length}</span>
            </h2>
          )}
          {conversationalAgents.length === 0 ? (
            <GroupEmptyState
              message={allConversationalCount === 0
                ? (canCreateAgent ? "Chưa có Nhân sự số nào - Bấm Tạo nhân sự số để tạo." : "Chưa có Nhân sự số nào được chia sẻ với bạn.")
                : "Không có Nhân sự số nào khớp với từ khóa"}
              onShowAll={allConversationalCount > 0 ? clearFilters : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {conversationalAgents.map(a => <ConversationalCard key={a.id} a={a} />)}
            </div>
          )}
        </div>
      )}

      {showProcess && (
        <div className="mb-8">
          {!singleKindView && (
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              Quy trình
              <span className="text-xs font-normal text-muted-foreground">{processAgents.length}</span>
            </h2>
          )}
          {processAgents.length === 0 ? (
            <GroupEmptyState
              message={allProcessCount === 0
                ? (canCreateAgent ? "Chưa có Quy trình nào - Bấm Tạo Quy trình để dựng Quy trình đầu tiên." : "Chưa có Quy trình nào được chia sẻ với bạn.")
                : "Không có Quy trình nào khớp với bộ lọc"}
              onShowAll={allProcessCount > 0 ? clearFilters : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processAgents.map(p => <ProcessCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      )}
      {showAutomation && (
        <div className="mb-8">
          {!singleKindView && (
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              Nhân sự số tự động
              <span className="text-xs font-normal text-muted-foreground">{automationAgents.length}</span>
            </h2>
          )}
          {automationAgents.length === 0 ? (
            <GroupEmptyState
              message={allAutomationCount === 0
                ? "Chưa có Nhân sự số tự động nào - Thêm trigger cho một Nhân sự số và nó sẽ hiện ở đây."
                : "Không có Nhân sự số nào khớp với từ khóa"}
              onShowAll={allAutomationCount > 0 ? clearFilters : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {automationAgents.map(a => <AutomationCard key={a.id} a={a} />)}
            </div>
          )}
        </div>
      )}
      </>)}
    </div>
  );
}
