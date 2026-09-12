import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Search, CheckCircle2, ChevronRight, Plug, MoreVertical, AlertTriangle, X } from "lucide-react";
import { useGroupAccess, isOwnedOrShared } from "@/pages/organization/scopeAccess";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { customConnectorStore, type CustomConnector } from "@/components/configure/customConnectorStore";
import { isAccessibleTo as isCustomConnectorAccessibleTo } from "@/components/configure/customConnectorSharing";
import AddCustomConnectorModal from "@/components/configure/AddCustomConnectorModal";
import CustomConnectorShareModal from "@/components/configure/CustomConnectorShareModal";
import { getAgent } from "@/components/configure/agentStore";
import {
  CONNECTOR_TEMPLATES, connectorTemplateStore, type ConnectorTemplateDef,
} from "@/components/configure/connectorTemplateStore";
import { ConnectorTemplateConnectModal, ConnectorTemplateManageModal } from "@/components/configure/ConnectorTemplateModals";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ─── Types ─────────────────────────────────────────── */
type Tab = "all" | "connected" | "available";
/** Top-level split, mirroring the real product's "Marketplace Connectors" / "Custom Connectors"
 * tabs at console-agents.fpt.ai/connectors. "Custom" is scoped ONLY to self-added (Custom MCP)
 * connectors — the Marketplace tab below is entirely unrelated pre-built catalog and is untouched
 * by this split. */
type Section = "marketplace" | "custom";
/** Ownership filter for the Custom Connectors list — mirrors the Của tôi/Được chia sẻ split
 * already used for Skills, replacing per-card ownership pills that crowded the row and broke
 * layout on longer connector names (see CustomConnectorCard below). */
type CustomTab = "all" | "mine" | "shared";

interface Connector {
  id: string;
  name: string;
  desc: string;
  logo: string;
  connected: boolean;
  soon: boolean;
  requestedBy?: string[];
  category: string;
  /** Only meaningful once `connected` — who set up this workspace connection, and who else it
   * was explicitly shared with. An unconnected catalog entry isn't anyone's resource yet, so
   * it's never restricted by Scope; only established connections are. */
  ownerId?: string;
  sharedWith?: string[];
}

/* ─── Logo URLs ──────────────────────────────────────── */
const LOGO: Record<string, string> = {
  outlook:    "https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg",
  sharepoint: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Microsoft_Office_SharePoint_%282018%E2%80%93present%29.svg",
  gmail:      "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg",
  slack:      "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
  notion:     "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
  github:     "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg",
  figma:      "https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg",
  linear:     "https://asset.brandfetch.io/idFdo8ulhr/idg1AZBV8h.png",
  supabase:   "https://upload.wikimedia.org/wikipedia/commons/b/b8/Supabase_Logo.svg",
  vercel:     "https://upload.wikimedia.org/wikipedia/commons/5/5e/Vercel_logo_black.svg",
  openai:     "https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg",
  discord:    "https://upload.wikimedia.org/wikipedia/commons/9/98/Discord_logo.svg",
  zoom:       "https://upload.wikimedia.org/wikipedia/commons/1/11/Zoom_Logo_2022.svg",
  telegram:   "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg",
  teams:      "https://upload.wikimedia.org/wikipedia/commons/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg",
  twilio:     "https://upload.wikimedia.org/wikipedia/commons/7/7e/Twilio-logo-red.svg",
  sheets:     "https://upload.wikimedia.org/wikipedia/commons/a/ae/Google_Sheets_2020_Logo.svg",
  stripe:     "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
  salesforce: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg",
  clickup:    "https://upload.wikimedia.org/wikipedia/commons/3/37/ClickUp_Logo.png",
  trello:     "https://upload.wikimedia.org/wikipedia/commons/1/13/Trello-logo.svg",
  dropbox:    "https://upload.wikimedia.org/wikipedia/commons/7/74/Dropbox_logo_2017.svg",
  gdrive:     "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg",
  gitlab:     "https://upload.wikimedia.org/wikipedia/commons/e/e1/GitLab_logo.svg",
  gcalendar:  "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
};

/* ─── Seed data ──────────────────────────────────────── */
const CONNECTORS: Connector[] = [
  { id:"outlook",    name:"Microsoft Outlook",   desc:"Tìm kiếm email và sự kiện lịch, gửi email thay bạn.",                     logo:LOGO.outlook,    connected:true,  soon:false, requestedBy:["You Need A Hug","meo meo"], category:"requested", ownerId: "m-fsoft-coo" },
  { id:"sharepoint", name:"Microsoft SharePoint",desc:"Đọc file, thư viện tài liệu và site trên SharePoint của bạn.",              logo:LOGO.sharepoint, connected:true,  soon:false, requestedBy:["meo meo"],                 category:"requested", ownerId: "m-fsoft-ceo" },
  { id:"gmail",      name:"Gmail",               desc:"Tìm kiếm, tạo và quản lý email cùng sự kiện lịch của bạn.",                    logo:LOGO.gmail,      connected:false, soon:true,  category:"popular" },
  { id:"slack",      name:"Slack",               desc:"Đọc kênh, gửi tin nhắn và tìm kiếm hội thoại.",                        logo:LOGO.slack,      connected:false, soon:true,  category:"popular" },
  { id:"notion",     name:"Notion",              desc:"Đọc, tạo và cập nhật trang cùng cơ sở dữ liệu trong workspace của bạn.",            logo:LOGO.notion,     connected:false, soon:true,  category:"popular" },
  { id:"github",     name:"GitHub",              desc:"Đọc repository, issue và pull request; tìm kiếm code và commit.",         logo:LOGO.github,     connected:false, soon:true,  category:"popular" },
  { id:"figma",      name:"Figma",               desc:"Quản lý file, dự án và nhóm; đọc thiết kế từ workspace của bạn.",          logo:LOGO.figma,      connected:false, soon:true,  category:"popular" },
  { id:"linear",     name:"Linear",              desc:"Tạo và cập nhật issue, theo dõi dự án và tìm kiếm roadmap của nhóm.",      logo:LOGO.linear,     connected:false, soon:true,  category:"new" },
  { id:"supabase",   name:"Supabase",            desc:"Xây dựng và quản lý database, auth và storage cho ứng dụng của bạn.",                      logo:LOGO.supabase,   connected:false, soon:true,  category:"new" },
  { id:"vercel",     name:"Vercel",              desc:"Quản lý team, dự án và deployment; tìm kiếm tài liệu.",                 logo:LOGO.vercel,     connected:false, soon:true,  category:"new" },
  { id:"openai",     name:"OpenAI",              desc:"Truy cập model, file và assistant trong tổ chức OpenAI của bạn.",         logo:LOGO.openai,     connected:false, soon:true,  category:"new" },
  { id:"discord",    name:"Discord",             desc:"Đọc kênh, gửi tin nhắn và quản lý thành viên trên các server của bạn.",         logo:LOGO.discord,    connected:false, soon:true,  category:"communication" },
  { id:"zoom",       name:"Zoom",                desc:"Quản lý cuộc họp và bản ghi, lấy transcript.",                     logo:LOGO.zoom,       connected:false, soon:true,  category:"communication" },
  { id:"telegram",   name:"Telegram",            desc:"Gửi tin nhắn và file, đọc cập nhật qua bot của bạn.",                   logo:LOGO.telegram,   connected:false, soon:true,  category:"communication" },
  { id:"teams",      name:"Microsoft Teams",     desc:"Đọc kênh và đoạn chat, gửi tin nhắn và lên lịch cuộc họp.",               logo:LOGO.teams,      connected:false, soon:true,  category:"communication" },
  { id:"twilio",     name:"Twilio",              desc:"Gửi SMS và tin nhắn, lấy trạng thái gửi và log.",                logo:LOGO.twilio,     connected:false, soon:true,  category:"communication" },
  { id:"sheets",     name:"Google Sheets",       desc:"Đọc và ghi dòng, vùng dữ liệu và công thức trong spreadsheet của bạn.",          logo:LOGO.sheets,     connected:false, soon:true,  category:"data" },
  { id:"stripe",     name:"Stripe",              desc:"Lấy dữ liệu khách hàng, thanh toán và subscription; đọc báo cáo tài chính.",      logo:LOGO.stripe,     connected:false, soon:true,  category:"data" },
  { id:"salesforce", name:"Salesforce",          desc:"Truy vấn và cập nhật lead, cơ hội bán hàng và tài khoản trong CRM của bạn.",         logo:LOGO.salesforce, connected:false, soon:true,  category:"data" },
  { id:"clickup",    name:"ClickUp",             desc:"Quản lý task, tài liệu và mục tiêu; tự động hoá workflow trong các space.",             logo:LOGO.clickup,    connected:false, soon:true,  category:"productivity" },
  { id:"trello",     name:"Trello",              desc:"Quản lý board, list và card; di chuyển công việc và thêm bình luận.",                 logo:LOGO.trello,     connected:false, soon:true,  category:"productivity" },
  { id:"dropbox",    name:"Dropbox",             desc:"Tìm kiếm, tải lên và lấy file, thư mục từ tài khoản của bạn.",            logo:LOGO.dropbox,    connected:false, soon:true,  category:"productivity" },
  { id:"gdrive",     name:"Google Drive",        desc:"Tìm kiếm và lấy file, thư mục từ Drive của bạn.",                       logo:LOGO.gdrive,     connected:false, soon:true,  category:"productivity" },
  { id:"gitlab",     name:"GitLab",              desc:"Đọc dự án, issue và merge request; quản lý pipeline và code.",         logo:LOGO.gitlab,     connected:false, soon:true,  category:"productivity" },
  { id:"gcalendar",  name:"Google Calendar",     desc:"Tìm kiếm, tạo mới và lấy sự kiện lịch, cuộc họp.",                   logo:LOGO.gcalendar,  connected:false, soon:true,  category:"productivity" },
];

const CATEGORIES = [
  { key:"popular",      label:"Phổ biến",           icon:"🔥" },
  { key:"new",          label:"Mới",                icon:"✨" },
  { key:"communication",label:"Giao tiếp",          icon:"💬" },
  { key:"data",         label:"Dữ liệu & phân tích",icon:"📊" },
  { key:"productivity", label:"Năng suất",          icon:"⚡" },
];

const AUTH_LABEL: Record<CustomConnector["authType"], string> = {
  none: "Không xác thực",
  static_headers: "Static Headers",
};

const MARKETPLACE_TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "connected", label: "Đã kết nối" },
  { key: "available", label: "Chưa kết nối" },
];

/* ─── Main page ──────────────────────────────────────── */
export default function WorkspaceConnectors() {
  const access = useGroupAccess("connectors");
  const [section, setSection] = useState<Section>("marketplace");
  const [tab, setTab]     = useState<Tab>("all");
  const [query, setQuery] = useState("");

  // Custom Connectors section state — kept separate from the Marketplace tab/query state above
  // since the two lists are unrelated data sources.
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  void tick;
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomConnector | null>(null);
  const [shareTarget, setShareTarget] = useState<CustomConnector | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomConnector | null>(null);
  const [customTab, setCustomTab] = useState<CustomTab>("all");

  // Connector Templates — internal FPT systems (FCI CRM/Member/Tickets) that moved out of
  // Marketplace into Custom Connectors as pre-built templates (see connectorTemplateStore.ts).
  const [connectTemplate, setConnectTemplate] = useState<ConnectorTemplateDef | null>(null);
  const [manageTemplate, setManageTemplate] = useState<ConnectorTemplateDef | null>(null);

  // Marketplace connector cards used to be dead clicks (cursor-pointer + chevron with no
  // onClick at all). `disconnected` is a session-local override so "Ngắt kết nối" from the
  // detail modal below actually does something, without standing up a full persisted store
  // for a static seed array.
  const [detailTarget, setDetailTarget] = useState<Connector | null>(null);
  const [disconnected, setDisconnected] = useState<Set<string>>(new Set());
  const effectiveConnectors = useMemo(
    () => CONNECTORS.map(c => (disconnected.has(c.id) ? { ...c, connected: false } : c)),
    [disconnected],
  );
  const customConnectors = customConnectorStore.list();
  const accessibleCustomConnectors = customConnectors.filter(c => isCustomConnectorAccessibleTo(c.sharing, c.ownerId, CURRENT_USER.id));
  const customTabCounts = {
    all: accessibleCustomConnectors.length,
    mine: accessibleCustomConnectors.filter(c => c.ownerId === CURRENT_USER.id).length,
    shared: accessibleCustomConnectors.filter(c => c.ownerId !== CURRENT_USER.id).length,
  };
  const customFiltered = customTab === "mine" ? accessibleCustomConnectors.filter(c => c.ownerId === CURRENT_USER.id)
    : customTab === "shared" ? accessibleCustomConnectors.filter(c => c.ownerId !== CURRENT_USER.id)
    : accessibleCustomConnectors;

  // Only an established connection is really "someone's resource" — browsing the catalog of
  // not-yet-connected services is never restricted. A role whose Connectors View Scope is
  // "Own & Shared" (or with no View permission at all) only sees connections it set up or that
  // were shared with it.
  const isConnectorVisible = (c: Connector) =>
    !c.connected || access.canSeeAll || isOwnedOrShared(c, access.userId);

  const requested = effectiveConnectors.filter(c => c.category === "requested" && isConnectorVisible(c));

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return effectiveConnectors.filter(c => {
      if (c.category === "requested") return false;
      if (!isConnectorVisible(c)) return false;
      if (tab === "connected" && !c.connected) return false;
      if (tab === "available" && c.connected) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.desc.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query, access.canSeeAll, access.userId, effectiveConnectors]);

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Connectors</h1>
        <p className="text-sm text-muted-foreground">Kết nối các dịch vụ để Agent có thể truy cập và thao tác trên dữ liệu của bạn.</p>
      </div>

      {/* Marketplace / Custom split */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {([
          { key: "marketplace" as Section, label: "Marketplace Connectors" },
          { key: "custom" as Section, label: "Custom Connectors" },
        ]).map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-3 pb-3 text-sm font-medium border-b-2 -mb-px transition-base ${
              section === s.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "marketplace" && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 border-b border-border pb-3">
            <div className="flex items-center gap-1">
              {MARKETPLACE_TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-3 h-8 rounded-lg text-sm font-medium transition-base ${
                    tab === t.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
                  }`}
                >{t.label}</button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm connector…"
                className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
          </div>

          {/* Requested connections — these are always already-connected connectors (see seed
           * data), so they belong on both "Tất cả" and "Đã kết nối"; only "Chưa kết nối" should
           * hide them. Gap fix: this used to read `tab !== "connected"`, which meant the "Đã kết
           * nối" filter excluded every requested-category connector (Outlook, SharePoint) on top
           * of `filtered` already excluding them (see the `filtered` useMemo below) — the tab
           * rendered fully blank with no empty state at all, even though 2 connectors really are
           * connected. */}
          {tab !== "available" && requested.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Agent đang yêu cầu kết nối
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {requested.map(c => (
                  <ConnectorCard
                    key={c.id}
                    connector={c}
                    onOpen={() => (c.connected ? setDetailTarget(c) : toast.info(`Tích hợp ${c.name} sắp ra mắt — theo dõi để cập nhật khi có nhé.`))}
                  />
                ))}
              </div>
              <div className="mt-6 mb-2 border-t border-border" />
            </div>
          )}

          {/* Category sections */}
          {CATEGORIES.map(cat => {
            const items = filtered.filter(c => c.category === cat.key);
            if (!items.length) return null;
            return (
              <div key={cat.key} className="mb-8">
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>{cat.icon}</span>{cat.label}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(c => (
                    <ConnectorCard
                      key={c.id}
                      connector={c}
                      onOpen={() => (c.connected ? setDetailTarget(c) : toast.info(`Tích hợp ${c.name} sắp ra mắt — theo dõi để cập nhật khi có nhé.`))}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && !requested.length && (
            <div className="py-20 text-center text-muted-foreground text-sm">Không tìm thấy connector nào.</div>
          )}
        </>
      )}

      {section === "custom" && (
        <div>
          {/* Connector Templates — pre-built by FPT (FCI CRM/Member/Tickets), distinct from the
           * MCP connectors below that a user adds themselves. Kept as its own section with its
           * own heading so the two kinds of "Custom" aren't visually mixed into one list. */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>🏢</span>Connector Templates nội bộ
            </div>
            <p className="text-xs text-muted-foreground mb-3">Các hệ thống nội bộ FPT dựng sẵn — chỉ cần điền credential để kết nối, không cần tự cấu hình MCP server.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {CONNECTOR_TEMPLATES.map(t => {
                const connected = connectorTemplateStore.isConnected(t.id);
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => (connected ? setManageTemplate(t) : setConnectTemplate(t))}
                    onKeyDown={e => { if (e.key === "Enter") (connected ? setManageTemplate(t) : setConnectTemplate(t)); }}
                    className={`flex items-start gap-3 p-4 rounded-xl border bg-surface transition-base cursor-pointer hover:border-primary/40 hover:bg-primary-soft/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      connected ? "border-primary/30" : "border-border"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl border border-border bg-white flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground">
                      {t.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium">{t.name}</span>
                        {connected && <CheckCircle2 size={13} className="text-success shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                      {connected && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {connectorTemplateStore.listAccounts(t.id).length} credential đã kết nối
                        </p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 mb-5 border-t border-border" />

          <div className="flex items-center justify-between gap-3 mb-5">
            <p className="text-sm text-muted-foreground">Thêm một MCP server để cấp công cụ của nó cho Agent của bạn.</p>
            <button
              onClick={() => setShowAddCustom(true)}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base shrink-0"
            >
              + Thêm MCP tùy chỉnh
            </button>
          </div>

          {accessibleCustomConnectors.length > 0 && (
            <div className="flex items-center gap-1 mb-5">
              {([
                { key: "all" as CustomTab, label: "Tất cả" },
                { key: "mine" as CustomTab, label: "Của tôi" },
                { key: "shared" as CustomTab, label: "Được chia sẻ" },
              ]).map(t => (
                <button key={t.key} onClick={() => setCustomTab(t.key)}
                  className={`px-3 h-8 rounded-lg text-sm font-medium transition-base ${
                    customTab === t.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
                  }`}
                >
                  {t.label} <span className="ml-0.5 text-xs opacity-70">{customTabCounts[t.key]}</span>
                </button>
              ))}
            </div>
          )}

          {accessibleCustomConnectors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
              <Plug size={22} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Chưa có custom connector nào</p>
              <p className="text-sm text-muted-foreground">Thêm một MCP server để cấp công cụ của nó cho Agent của bạn.</p>
            </div>
          ) : customFiltered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Không có custom connector nào trong mục này.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customFiltered.map(c => {
                const isMine = c.ownerId === CURRENT_USER.id;
                return (
                  <CustomConnectorCard
                    key={c.id}
                    connector={c}
                    isMine={isMine}
                    onEdit={isMine ? () => setEditTarget(c) : undefined}
                    onShare={isMine ? () => setShareTarget(c) : undefined}
                    onDelete={() => setDeleteTarget(c)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {showAddCustom && (
        <AddCustomConnectorModal
          onClose={() => setShowAddCustom(false)}
          onCreated={() => { setShowAddCustom(false); refresh(); }}
        />
      )}

      {editTarget && (
        <AddCustomConnectorModal
          editing={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={() => { setEditTarget(null); toast.success("Đã lưu thay đổi."); refresh(); }}
        />
      )}

      {shareTarget && (
        <CustomConnectorShareModal
          open
          name={shareTarget.name}
          ownerName={shareTarget.ownerName}
          sharing={shareTarget.sharing}
          onSave={sharing => { customConnectorStore.updateSharing(shareTarget.id, sharing); refresh(); }}
          onClose={() => setShareTarget(null)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa custom connector "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Custom connector sẽ bị xóa vĩnh viễn khỏi workspace. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && deleteTarget.attachedByAgentIds.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-[hsl(var(--destructive-soft))] px-3.5 py-3">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-destructive" />
              <p className="text-xs text-destructive leading-relaxed">
                {deleteTarget.attachedByAgentIds.length} Agent đang dùng custom connector này và sẽ mất quyền truy cập các công cụ của nó: {deleteTarget.attachedByAgentIds.map(id => getAgent(id).name).join(", ")}.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) { customConnectorStore.remove(deleteTarget.id); refresh(); } setDeleteTarget(null); }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {detailTarget && (
        <ConnectorDetailModal
          connector={detailTarget}
          onClose={() => setDetailTarget(null)}
          onDisconnect={() => {
            setDisconnected(prev => new Set(prev).add(detailTarget.id));
            toast.success(`Đã ngắt kết nối ${detailTarget.name}.`);
            setDetailTarget(null);
          }}
        />
      )}

      {connectTemplate && (
        <ConnectorTemplateConnectModal
          template={connectTemplate}
          onClose={() => setConnectTemplate(null)}
          onConnected={() => { setConnectTemplate(null); refresh(); }}
        />
      )}

      {manageTemplate && (
        <ConnectorTemplateManageModal
          template={manageTemplate}
          onClose={() => setManageTemplate(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

/* ─── Connector card (Marketplace) ───────────────────── */
function ConnectorCard({ connector: c, onOpen }: { connector: Connector; onOpen: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === "Enter") onOpen(); }}
      className={`flex items-start gap-3 p-4 rounded-xl border bg-surface transition-base cursor-pointer hover:border-primary/40 hover:bg-primary-soft/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      c.connected ? "border-primary/30" : "border-border"
    }`}>
      <div className="w-10 h-10 rounded-xl border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
        <img src={c.logo} alt={c.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium">{c.name}</span>
          {c.connected && <CheckCircle2 size={13} className="text-success shrink-0" />}
          {c.soon && !c.connected && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border bg-surface-muted text-muted-foreground shrink-0">Sắp ra mắt</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
        {c.requestedBy && (
          <p className="text-[11px] text-muted-foreground mt-1">Được yêu cầu bởi: {c.requestedBy.join(", ")}</p>
        )}
      </div>
      <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-0.5" />
    </div>
  );
}

/* ─── Custom Connector card + row menu ───────────────── */
function CustomConnectorRowMenu({ onEdit, onShare, onDelete }: { onEdit?: () => void; onShare?: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Tuỳ chọn custom connector"
        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-xl border border-border shadow-lg py-1 animate-fade-up">
          {/* Gap fix: this menu used to offer only Chia sẻ/Xóa — there was no way to correct a
           * wrong URL or rotate a header/API key on an existing connector without deleting and
           * recreating it (losing sharing config and breaking any Agent already attached). */}
          {onEdit && (
            <button onClick={() => { setOpen(false); onEdit(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">
              Sửa
            </button>
          )}
          {onShare && (
            <button onClick={() => { setOpen(false); onShare(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">
              Chia sẻ
            </button>
          )}
          <button onClick={() => { setOpen(false); onDelete(); }} className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-base">
            Xóa
          </button>
        </div>
      )}
    </div>
  );
}

function CustomConnectorCard({ connector: c, isMine, onEdit, onShare, onDelete }: {
  connector: CustomConnector; isMine: boolean; onEdit?: () => void; onShare?: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface">
      <div className="w-10 h-10 rounded-xl border border-border bg-white flex items-center justify-center shrink-0">
        <Plug size={16} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        {/* Ownership/sharing pills ("Của tôi", "Dùng chung", "Chia sẻ với N người") used to sit
         * in this row — redundant once the Tất cả/Của tôi/Được chia sẻ tab above already says
         * which group a card belongs to, and they fought the connector name for space, wrapping
         * or overflowing the card on longer names. Only the owner's name remains, as plain text,
         * so a shared-to-me card still says whose connector it is. */}
        <p className="text-sm font-medium truncate">{c.name}</p>
        <p className="text-xs text-muted-foreground truncate">Người tạo: {isMine ? "Bạn" : c.ownerName}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.url}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {AUTH_LABEL[c.authType]}
          {c.attachedByAgentIds.length > 0 && ` · ${c.attachedByAgentIds.length} Agent đang dùng`}
        </p>
      </div>
      <CustomConnectorRowMenu onEdit={onEdit} onShare={onShare} onDelete={onDelete} />
    </div>
  );
}

/* ─── Connector detail modal (Marketplace, connected only) ───────────────
 * Marketplace connector cards used to render a hover state + chevron with no
 * click handler at all — a dead end. This gives "connected" cards somewhere
 * real to go: which Agents depend on it, and a way to disconnect. */
function ConnectorDetailModal({ connector, onClose, onDisconnect }: {
  connector: Connector; onClose: () => void; onDisconnect: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-up">
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
              <img src={connector.logo} alt={connector.name} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold truncate">{connector.name}</h2>
              <p className="text-xs text-success font-medium flex items-center gap-1 mt-0.5"><CheckCircle2 size={12} /> Đã kết nối</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base mt-0.5 shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{connector.desc}</p>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Agent đang dùng connector này</p>
            {connector.requestedBy && connector.requestedBy.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {connector.requestedBy.map(name => (
                  <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface text-sm">
                    <span className="w-6 h-6 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[10px] font-bold shrink-0">{name.slice(0, 1).toUpperCase()}</span>
                    {name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có Agent nào dùng connector này.</p>
            )}
          </div>
          {confirming && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-[hsl(var(--destructive-soft))] px-3.5 py-3">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-destructive" />
              <p className="text-xs text-destructive leading-relaxed">
                Ngắt kết nối {connector.name}? {connector.requestedBy && connector.requestedBy.length > 0
                  ? `${connector.requestedBy.length} Agent (${connector.requestedBy.join(", ")}) `
                  : "Các Agent đang dùng connector này "}sẽ mất quyền truy cập ngay lập tức.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border shrink-0">
          {confirming ? (
            <>
              <button onClick={() => setConfirming(false)} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
              <button onClick={onDisconnect} className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-medium transition-base">Ngắt kết nối</button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirming(true)} className="h-9 px-4 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 text-sm font-medium transition-base">Ngắt kết nối</button>
              <button onClick={onClose} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base">Đóng</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
