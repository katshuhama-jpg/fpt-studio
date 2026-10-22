import type React from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon, Search01Icon, FilterIcon, Chat01Icon,
  SparklesIcon, Cancel01Icon, BoltIcon, TimeScheduleIcon, UserMultipleIcon, FlowCircleIcon,
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
// Nhân sự số Quy trình records (kind "process") live in agentStore so Workforce can use them as
// steps, but they open in /process/:id - listed with the Quy trình cards below, not here.
const agents = ALL_AGENTS.filter(a => a.kind !== "process");
import { useOrg } from "@/pages/organization/orgStore";
import { recheckAgentGroupPublish } from "@/components/configure/collabGroupStore";
import { getChannelName } from "@/components/configure/channelCatalog";
import { AgentVersionLines, agentGovState } from "@/components/governance/governanceUi";
import { agentModelStore } from "@/components/configure/agentModelStore";

/* ─── Data ─────────────────────────────────────────────────────────────── */

const tabs = ["Tất cả Nhân sự số", "Published", "Draft", "Removed", "Chờ duyệt", "Bị từ chối", "Shared with me"] as const;
/** Display labels — "Published/Draft" read as "Đang live/Bản nháp" to match the card lines. */
const TAB_LABEL: Partial<Record<typeof tabs[number], string>> = { Published: "Đang live", Draft: "Bản nháp", Removed: "Đã gỡ", "Shared with me": "Được thêm vào" };
const kindFilters = ["All", "Nhân sự số", "Quy trình", "Nhân sự số tự động"] as const;

const SUGGESTIONS = [
  { label: "Customer support", prompt: "A customer-support agent that answers FAQs, guides users through documentation, and escalates tickets when needed." },
  { label: "Internal lookup", prompt: "An internal lookup assistant that answers employee questions using company policies and the internal knowledge base." },
  { label: "Sales assistant", prompt: "A sales assistant that qualifies inbound leads, answers product questions, and books demo calls." },
] as const;

/** Gợi ý mô tả khi tạo Nhân sự số Quy trình (AI dựng sẵn các bước). */
const PROCESS_SUGGESTIONS = [
  { label: "Duyệt đề nghị mua sắm", prompt: "Nhân sự số gửi đề nghị mua sắm kèm chứng từ. Trích xuất chứng từ, nếu vượt 50 triệu thì giám đốc duyệt, không thì tự duyệt. Duyệt xong tạo PO trên SAP ERP, từ chối thì soạn thư báo lại người đề nghị." },
  { label: "Đối chiếu hoá đơn với PO", prompt: "Khi hệ thống kế toán gửi hoá đơn VAT qua HTTP, trích xuất số tiền, lấy PO tương ứng từ ERP để so khớp. Khớp thì ghi nhận công nợ, lệch thì chuyển kế toán xem lại." },
  { label: "Tiếp nhận hồ sơ vay", prompt: "Nhận hồ sơ vay gồm CCCD và sao kê lương. Phân loại sản phẩm vay, tra chính sách tín dụng, chấm điều kiện cơ bản rồi chuyển chuyên viên thẩm định. Đạt thì tạo hồ sơ trên LOS, không đạt thì soạn thư từ chối." },
] as const;

/** Nhân sự số Quy trình demo (prototype - chưa có store riêng). */
const PROCESS_AGENTS = [
  { id: "mbl-rules", name: "Rule thẩm định MB Life", desc: "Tra Policy, lịch sử bồi thường, bảng tham chiếu song song rồi chạy rule D/E/A tất định. Được Workforce bồi thường MB Life gọi.", meta: "10 bước · Nhân sự số gọi", updated: "Cập nhật vừa xong" },
  { id: "procure", name: "Đề nghị mua sắm FHO-FPD", desc: "Dựng từ wiki Agentic BPM: duyệt nhiều cấp, tạo PO trên Odoo, nhận hàng, đối chiếu 3 chiều, thanh toán.", meta: "30 bước · Nhân sự số gọi", updated: "Cập nhật vừa xong" },
  { id: "invoice", name: "Đối chiếu hoá đơn với PO", desc: "Nhận hoá đơn qua HTTP, so khớp với PO trên ERP, lệch thì chuyển kế toán xem lại.", meta: "10 bước · HTTP", updated: "Cập nhật 1 giờ trước" },
];

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
function ProcessCard({ p }: { p: typeof PROCESS_AGENTS[number] }) {
  return (
    <Link
      to={`/process/${p.id}`}
      className="group rounded-xl border border-border bg-surface hover:border-primary/30 hover:shadow-elev transition-base"
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary-soft text-primary">
            <HugeiconsIcon icon={FlowCircleIcon} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate mb-0.5">{p.name}</h3>
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-muted-foreground/60" aria-hidden />
                <span className="text-muted-foreground">Bản nháp · chưa publish</span>
              </span>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary-soft text-primary shrink-0">Quy trình</span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2 min-h-[32px]">{p.desc}</p>

        <div className="flex items-center gap-1.5 pt-3 border-t border-border">
          <HugeiconsIcon icon={FlowCircleIcon} size={12} className="text-muted-foreground" />
          <span className="text-xs">
            <b className="font-display">{p.meta.split(" · ")[0].split(" ")[0]}</b>
            <span className="text-muted-foreground ml-1">bước</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
          <span>{p.updated}</span>
          <span>·</span>
          <span className="truncate">{p.meta.split(" · ")[1] ?? ""}</span>
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

export default function AgentsList() {
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
    () => access.canSeeAll ? agents : agents.filter(a => isOwnedOrShared(a, access.userId)),
    [access.canSeeAll, access.userId, shareVersion],
  );
  const sharedWithMe = useMemo(
    () => agents.filter(a => a.ownerId !== access.userId && isOwnedOrShared(a, access.userId)),
    [access.userId, shareVersion],
  );

  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Tất cả Nhân sự số");
  const [kindFilter, setKindFilter] = useState<typeof kindFilters[number]>("All");
  const [search, setSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [createKind, setCreateKind] = useState<"productivity" | "process">("productivity");
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

  const conversationalAgents = searched.filter(a => getAgentKind(a.id) === "conversational");
  const automationAgents = searched.filter(a => getAgentKind(a.id) === "automation");
  const allConversationalCount = visibleAgents.filter(a => getAgentKind(a.id) === "conversational").length;
  const allAutomationCount = visibleAgents.filter(a => getAgentKind(a.id) === "automation").length;

  const showConversational = kindFilter !== "Nhân sự số tự động" && kindFilter !== "Quy trình";
  const showAutomation = kindFilter !== "Nhân sự số" && kindFilter !== "Quy trình";
  const showProcess = kindFilter === "All" || kindFilter === "Quy trình";
  const processAgents = PROCESS_AGENTS.filter(p => !q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
  const singleKindView = kindFilter !== "All";

  const clearFilters = () => {
    setKindFilter("All");
    setSearch("");
    setActiveTab("Tất cả Nhân sự số");
  };

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

      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold tracking-tight mb-1">Nhân sự số</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý mọi Nhân sự số trong Space - Tạo, kiểm thử, triển khai và theo dõi.
        </p>
      </div>

      {/* ── Hero title + chat box ─────────────────────────────────────── */}
      <div className="flex flex-col items-center mb-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-center mb-2">
          Where do you want to start?
        </h2>
        <p className="text-base text-muted-foreground text-center mb-6">
          Pick a starting point, then refine it in the builder.
        </p>
        <div className="w-full max-w-[672px] rounded-2xl border border-border bg-surface p-4 shadow-sm focus-within:border-ring transition-colors">
        <div role="radiogroup" aria-label="Loại Nhân sự số" className="flex gap-1 p-1 mb-3 rounded-lg bg-surface-muted w-fit">
          {([
            { id: "productivity", label: "Năng suất", hint: "Dựng bằng prompt, hỗ trợ việc hằng ngày" },
            { id: "process", label: "Quy trình", hint: "Làm đúng theo quy trình, từng bước cố định" },
          ] as const).map(k => (
            <button
              key={k.id}
              role="radio"
              aria-checked={createKind === k.id}
              title={k.hint}
              onClick={() => { setCreateKind(k.id); setPrompt(""); }}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-base ${createKind === k.id ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {isProcessKind ? "Làm đúng theo quy trình, từng bước cố định. Mô tả các bước, AI dựng sẵn để bạn sửa." : "Dựng bằng prompt, hỗ trợ việc hằng ngày."}
        </p>
        <textarea
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed min-h-[56px]"
          placeholder={isProcessKind ? "VD: Nhận hoá đơn, đọc số tiền, so với PO trên ERP, lệch thì chuyển kế toán xem lại." : 'e.g. "A bank customer-support assistant that answers credit-card questions in a formal tone."'}
          rows={2}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild();
          }}
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">
            {isProcessKind ? "Nêu các bước, ai duyệt, dùng hệ thống nào - Tối thiểu 20 ký tự." : "The more specific, the closer the draft - At least 20 characters."}
          </p>

          {/* Right actions */}
          <div className="flex items-center gap-3 shrink-0">
            {!isProcessKind && <button
              onClick={() => canCreateAgent && setShowTemplates(true)}
              disabled={!canCreateAgent}
              title={!canCreateAgent ? "Bạn không có quyền tạo Nhân sự số." : undefined}
              className="text-sm text-muted-foreground hover:text-foreground transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
            >
              Use a template
            </button>}
            <button
              onClick={handleBuild}
              disabled={prompt.trim().length < 20 || !canCreateAgent}
              title={!canCreateAgent ? "Bạn không có quyền tạo Nhân sự số." : undefined}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <HugeiconsIcon icon={SparklesIcon} size={14} />
              {isProcessKind ? "Dựng Quy trình" : "Tạo Nhân sự số"}
            </button>
          </div>
        </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs text-muted-foreground">Suggestions</span>
          {(isProcessKind ? PROCESS_SUGGESTIONS : SUGGESTIONS).map(s => (
            <button
              key={s.label}
              onClick={() => canCreateAgent && setPrompt(s.prompt)}
              disabled={!canCreateAgent}
              className="h-7 px-3 rounded-full border border-border text-xs font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => canCreateAgent && navigate(isProcessKind ? "/process/new" : "/agents/new?tab=build&section=instructions")}
          disabled={!canCreateAgent}
          title={!canCreateAgent ? "Bạn không có quyền tạo Nhân sự số." : undefined}
          className="btn-secondary mt-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface"
        >
          Create from blank
        </button>
      </div>

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
              {TAB_LABEL[t] ?? t}
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
              placeholder="Tìm Nhân sự số…"
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
              Nhân sự số
              <span className="text-xs font-normal text-muted-foreground">{conversationalAgents.length}</span>
            </h2>
          )}
          {conversationalAgents.length === 0 ? (
            <GroupEmptyState
              message={allConversationalCount === 0
                ? "Chưa có Nhân sự số nào - Tạo ở trên và Nhân sự số sẽ hiện ở đây."
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

      {showProcess && (activeTab === "Tất cả Nhân sự số" || activeTab === "Draft") && (
        <div className="mb-8">
          {!singleKindView && (
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              Quy trình
              <span className="text-xs font-normal text-muted-foreground">{processAgents.length}</span>
            </h2>
          )}
          {processAgents.length === 0 ? (
            <GroupEmptyState message="Không có Quy trình nào khớp với từ khóa" onShowAll={clearFilters} />
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
    </div>
  );
}
