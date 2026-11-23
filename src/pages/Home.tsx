import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles, Paperclip, AtSign,
  X, Search, Edit, Copy, Trash2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayCircleIcon, BookOpen01Icon, SparklesIcon, LinkSquare02Icon, ArrowRight01Icon, HeadsetIcon, BubbleChatIcon, UserIcon, ChartLineData01Icon, UserMultiple02Icon, AiBrain01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
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
    systemPrompt: `# Sales Lead Qualifier Agent\n\nYou qualify inbound leads using the BANT framework (Budget, Authority, Need, Timeline) and hand off hot leads to the sales team.\n\n## Tone & Style\n- Consultative and curious - Ask one question at a time\n- Friendly but efficient; respect the prospect's time\n\n## Qualification Flow\n1. Greet and understand the prospect's role and company\n2. Identify the core business need or pain point\n3. Explore budget range and decision-making authority\n4. Confirm purchase timeline\n5. Score the lead (Hot / Warm / Cold) and route accordingly\n\n## Limits\n- Do not quote specific pricing - Route to sales rep\n- Do not make commitments on behalf of the sales team` },
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
  { id: "hr",    name: "HR Agent",          status: "Active", version: "v2.0.2", model: "DeepSeek V4 Flash", desc: "Trả lời câu hỏi của nhân viên về chính sách, phúc lợi và nghỉ phép trên Slack.", edited: "12 phút trước" },
  { id: "ba",    name: "BA Agent",          status: "Active", version: "v1.3.0", model: "DeepSeek V4 Flash", desc: "Hỗ trợ BA soạn user story, BRD và phân tích yêu cầu.", edited: "5 phút trước" },
  { id: "onboarding", name: "Onboarding Agent", status: "Draft", model: "DeepSeek V4 Flash", desc: "Dẫn nhân viên mới qua lộ trình 30/60/90 ngày kèm tài liệu.", edited: "45 phút trước" },
  { id: "qt-procure", kind: "process", name: "Đề nghị mua sắm", status: "Draft", model: "DeepSeek V4 Flash", desc: "Kiểm ngân sách, Nhân sự số lấy báo giá NCC, duyệt theo phân cấp, tạo và gửi PO (PR-0142).", edited: "Vừa xong" },
] as { id: string; kind?: "process"; name: string; status: string; version?: string; model: string; desc: string; edited: string }[];

const getStarted = [
  { label: "Giới thiệu",        title: "Video hướng dẫn FPT AI EOS Console",   icon: PlayCircleIcon,  href: "https://www.youtube.com/results?search_query=fpt+ai+eos+console" },
  { label: "Giới thiệu",        title: "Video hướng dẫn FPT AI EOS Workspace", icon: PlayCircleIcon,  href: "https://www.youtube.com/results?search_query=fpt+ai+eos+workspace" },
  { label: "Cẩm nang sản phẩm", title: "Làm chủ FPT AI EOS",                   icon: BookOpen01Icon,  href: "https://docs-agents.fpt.ai" },
  { label: "Cập nhật",          title: "Release Note FPT AI EOS: Những nâng cấp quan trọng bạn không nên bỏ lỡ!", icon: SparklesIcon, href: "https://docs-agents.fpt.ai" },
];

/** Thư viện mẫu trên Trang chủ - tên và danh mục như staging, trỏ tới template có sẵn. */
const homeTemplates = [
  { id: 1, name: "Trợ lý hỗ trợ khách hàng", cat: "Chăm sóc khách hàng", icon: HeadsetIcon },
  { id: 3, name: "Trợ lý kinh doanh",         cat: "Kinh doanh",          icon: BubbleChatIcon },
  { id: 4, name: "Trợ lý nhân sự",            cat: "Nhân sự",             icon: UserIcon },
  { id: 7, name: "Trợ lý phân tích dữ liệu",  cat: "Vận hành",            icon: ChartLineData01Icon },
];

const GET_STARTED_HIDDEN_KEY = "home.getStarted.hidden";

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
  const active = a.status === "Active";

  useEffect(() => {
    if (!showMenu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  return (
    <Link to={`/agents/${a.id}`} className="group relative rounded-lg border border-border bg-card text-card-foreground p-4 hover:border-primary/30 transition-base flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={AiBrain01Icon} size={20} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-semibold text-sm truncate">{a.name}</p>
            {a.version && <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-sm bg-primary-soft text-primary tabular-nums">{a.version}</span>}
            {a.kind === "process"
              ? <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-sm bg-primary-soft text-primary">Co-Run</span>
              : <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-sm bg-primary-soft text-primary"><HugeiconsIcon icon={UserMultiple02Icon} size={12} strokeWidth={1.5} /> Cả Space</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Cập nhật {a.edited}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1 mb-3">{a.desc}</p>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`chip ${active ? "chip-success" : ""} w-fit shrink-0`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" /> {active ? "Đang hoạt động" : "Bản nháp"}
        </span>
        <span className="text-border">|</span>
        <span className="text-xs text-muted-foreground truncate flex-1">{a.model}</span>
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={e => { e.preventDefault(); setShowMenu(o => !o); }}
            aria-label="Thao tác"
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-base"
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} strokeWidth={1.5} />
          </button>
          {showMenu && (
            <div
              className="absolute z-20 top-full right-0 mt-1 w-40 bg-popover text-popover-foreground rounded-lg border border-border shadow-sm py-1 animate-fade-up"
              onMouseDown={e => e.stopPropagation()}
            >
              <button onClick={e => { e.preventDefault(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-muted transition-base text-left">
                <Edit size={14} /> Chỉnh sửa
              </button>
              <button onClick={e => { e.preventDefault(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-muted transition-base text-left">
                <Copy size={14} /> Nhân bản
              </button>
              <button onClick={e => { e.preventDefault(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-destructive hover:bg-muted transition-base text-left">
                <Trash2 size={14} /> Xoá
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
  const [kind, setKind] = useState<"productivity" | "process">("productivity");
  const isProc = kind === "process";

  const handleBuild = () => {
    if (!prompt.trim()) return;
    if (isProc) { navigate(`/process/new?${new URLSearchParams({ prompt: prompt.trim() }).toString()}`); onClose(); return; }
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
    navigate(isProc ? "/process/new" : "/agents/new?tab=build&section=instructions");
  };

  if (showTemplates) return <TemplateModal onClose={onClose} />;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>Bắt đầu tạo Nhân sự số ngay hôm nay</DialogTitle>
          <DialogDescription>Mô tả việc bạn cần, AI dựng bản nháp để bạn chỉnh tiếp.</DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Loại Nhân sự số" className="grid grid-cols-2 gap-2">
          {([
            { id: "productivity", label: "Nhân sự số Năng suất", desc: "Giao việc bằng lời, Nhân sự số tự làm tới khi xong." },
            { id: "process", label: "Nhân sự số Quy trình", desc: "Đi đúng các bước đã định: người duyệt, hệ thống, rẽ nhánh." },
          ] as const).map(k => (
            <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => { setKind(k.id); setPrompt(""); }}
              className={`text-left rounded-lg border p-3 transition-base ${kind === k.id ? "border-primary bg-primary-soft/60" : "border-border hover:bg-surface-muted"}`}>
              <span className={`block text-sm font-semibold ${kind === k.id ? "text-primary" : "text-foreground"}`}>{k.label}</span>
              <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">{k.desc}</span>
            </button>
          ))}
        </div>

        <div className="rounded-[8px] border border-border bg-surface p-3 transition-base focus-within:border-ring">
          <textarea
            autoFocus
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed min-h-[80px] border-0 p-0"
            placeholder={isProc ? "Ví dụ: Người đề nghị gõ /Đề nghị mua sắm. Trưởng phòng duyệt, trên 50 triệu thì Giám đốc khối cùng duyệt, rồi tạo PO." : "Ví dụ: Nhân sự số chăm sóc khách hàng ngân hàng 24/7, khóa thẻ, tra lãi suất vay và đặt lịch tư vấn…"}
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
              {!isProc && <button type="button" onClick={() => setShowTemplates(true)} className="text-sm text-muted-foreground hover:text-foreground transition-base">Dùng mẫu</button>}
              <button type="button" onClick={handleBuild} disabled={!prompt.trim()} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                <Sparkles size={14} /> {isProc ? "Tạo bản nháp Quy trình" : "Tạo Nhân sự số"}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <button type="button" onClick={handleBlank} className="btn-secondary">
            Tự dựng từ đầu
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
  const [getStartedHidden, setGetStartedHidden] = useState(() => {
    try { return localStorage.getItem(GET_STARTED_HIDDEN_KEY) === "1"; } catch { return false; }
  });
  const toggleGetStarted = () => setGetStartedHidden(h => {
    const next = !h;
    try { localStorage.setItem(GET_STARTED_HIDDEN_KEY, next ? "1" : "0"); } catch { /* ignore */ }
    return next;
  });

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
      <div className="max-w-[940px] mx-auto px-6 pt-6 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Trang chủ</h1>
        <p className="text-sm text-muted-foreground">
          Tổng quan không gian làm việc - Tiếp tục với Nhân sự số gần đây hoặc tạo Nhân sự số mới.
        </p>
      </div>

      <div className="max-w-[940px] mx-auto px-6 pb-8 space-y-8">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section
          className="rounded-lg overflow-hidden border border-border"
          style={{ background: "linear-gradient(90deg, hsl(var(--background)) 0%, hsl(var(--background)) 45%, hsl(var(--primary-soft)) 100%)" }}
        >
          <div className="flex items-center justify-between px-6 py-8 gap-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight mb-2">
                Chào mừng bạn đến với FPT AI EOS Console
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Xây dựng, kết nối và vận hành Nhân sự số AI của doanh nghiệp bạn.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => canCreateAgent && setShowCreate(true)}
                  disabled={!canCreateAgent}
                  title={!canCreateAgent ? "Bạn không có quyền tạo Nhân sự số." : undefined}
                  className="btn-primary h-9 px-4 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Tạo Nhân sự số mới <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => canCreateAgent && setShowTemplates(true)}
                  disabled={!canCreateAgent}
                  title={!canCreateAgent ? "Bạn không có quyền tạo Nhân sự số." : undefined}
                  className="btn-secondary h-9 px-4 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Xem thư viện mẫu
                </button>
              </div>
            </div>

            {/* Decorative illustration */}
            <div className="relative shrink-0 w-56 h-36 hidden md:block" aria-hidden>
              <div className="absolute inset-2 rounded-lg bg-card/70 border border-border" />
              <div className="absolute top-4 right-3 w-24 h-12 rounded-md bg-card border border-border flex items-center justify-center gap-1.5">
                <HugeiconsIcon icon={SparklesIcon} size={16} strokeWidth={1.5} className="text-primary" />
                <div className="space-y-1">
                  <div className="h-1.5 w-10 rounded-full bg-primary-soft" />
                  <div className="h-1.5 w-6 rounded-full bg-muted" />
                </div>
              </div>
              <div className="absolute bottom-5 left-6 w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <HugeiconsIcon icon={AiBrain01Icon} size={24} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Bắt đầu ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Bắt đầu</h2>
            <button onClick={toggleGetStarted} className="text-sm font-medium text-foreground hover:text-primary transition-base">
              {getStartedHidden ? "Hiện" : "Ẩn"}
            </button>
          </div>
          {!getStartedHidden && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {getStarted.map(g => (
                <a
                  key={g.title}
                  href={g.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 transition-base flex flex-col"
                >
                  <div className="h-28 flex items-center justify-center bg-primary-soft text-primary">
                    <HugeiconsIcon icon={g.icon} size={32} strokeWidth={1.5} />
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">{g.label}</p>
                    <p className="text-sm font-medium leading-snug">
                      {g.title} <HugeiconsIcon icon={LinkSquare02Icon} size={14} strokeWidth={1.5} className="inline align-[-2px] text-muted-foreground" />
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* ── Gần đây ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Gần đây</h2>
            <Link to="/agents" className="text-sm font-medium text-primary flex items-center gap-1 hover:underline">
              Tất cả Nhân sự số <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map(a => (
              <RecentAgentCard key={a.id} a={a} />
            ))}
          </div>
        </section>

        {/* ── Thư viện mẫu ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Thư viện mẫu</h2>
            <button
              onClick={() => canCreateAgent && setShowTemplates(true)}
              disabled={!canCreateAgent}
              className="text-sm font-medium text-primary flex items-center gap-1 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Xem thêm <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            {homeTemplates.map(h => {
              const t = templates.find(x => x.id === h.id)!;
              return (
                <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={h.icon} size={16} strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium flex-1 min-w-0 truncate">{h.name}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{h.cat}</span>
                  <button
                    onClick={() => setDetailTemplate(t)}
                    className="shrink-0 h-7 px-3 rounded-md border border-border text-xs font-medium hover:bg-muted transition-base"
                  >
                    Xem
                  </button>
                </div>
              );
            })}
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


