import { useState, useMemo } from "react";
import { agentsUsing, ResourceInUseDialog } from "@/components/governance/resourceInUseGuard";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Search, CheckCircle2, ChevronRight, ChevronDown, Plug, MoreVertical, AlertTriangle, X, Rocket, Globe, BarChart3, type LucideIcon } from "lucide-react";
import RequestPublishModal from "@/components/governance/RequestPublishModal";
import { governanceStore } from "@/components/governance/governanceStore";
import { StatusBadge } from "@/components/governance/governanceUi";
import { resourceBlockStore } from "@/components/governance/resourceBlockStore";
import { useGroupAccess, isOwnedOrShared } from "@/pages/organization/scopeAccess";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { customConnectorStore, type CustomConnector } from "@/components/configure/customConnectorStore";
import { isAccessibleTo as isCustomConnectorAccessibleTo } from "@/components/configure/customConnectorSharing";
import AddCustomConnectorModal from "@/components/configure/AddCustomConnectorModal";
import CustomConnectorShareModal from "@/components/configure/CustomConnectorShareModal";
import { customApiToolStore, AUTH_TYPE_LABEL, type CustomApiTool, type HttpMethod } from "@/components/configure/customApiToolStore";
import AddCustomApiToolModal from "@/components/configure/AddCustomApiToolModal";
import { getAgent } from "@/components/configure/agentStore";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import {
  CONNECTOR_TEMPLATES, connectorTemplateStore, type ConnectorTemplateDef,
} from "@/components/configure/connectorTemplateStore";
import { ConnectorTemplateConnectModal, ConnectorTemplateManageModal } from "@/components/configure/ConnectorTemplateModals";
import AgentResourceDetailModal from "@/components/configure/AgentResourceDetailModal";
import {
  ownershipTags, countByTab, matchesTab, OwnershipTabs, ownershipEmptyCopy, ResourceCard, ResourceIconTile, CardCreator, AgentCount,
  type OwnershipTab, type OwnershipTag,
} from "@/components/governance/resourceOwnership";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

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
type CustomTab = OwnershipTab;

interface Connector {
  id: string;
  name: string;
  desc: string;
  /** Plain display tag shown on the card footer (e.g. "Analytics", "Productivity") per the
   * Oct 2026 Marketplace redesign — the flat 3-col grid has no category grouping anymore, so
   * this is no longer matched against a CATEGORIES lookup. */
  category: string;
  connected: boolean;
  soon: boolean;
  requestedBy?: string[];
  /** Only meaningful once `connected` — who set up this workspace connection, and who else it
   * was explicitly shared with. An unconnected catalog entry isn't anyone's resource yet, so
   * it's never restricted by Scope; only established connections are. */
  ownerId?: string;
  sharedWith?: string[];
  /** How to render the card's logo tile: a real brand image, the shared FPT 3-color mark (for
   * the internal FCI toolkits, which have no public logo), or a Lucide icon placeholder. */
  logoKind: "image" | "fpt" | "icon";
  logo?: string;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}

/* ─── Logo URLs ──────────────────────────────────────── */
const LOGO: Record<string, string> = {
  outlook:    "https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg",
  sharepoint: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Microsoft_Office_SharePoint_%282018%E2%80%93present%29.svg",
  onedrive:   "https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg",
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

/* ─── Seed data (Marketplace Connectors) ─────────────── */
const CONNECTORS: Connector[] = [
  {
    id: "datasuite", name: "DataSuite", category: "Analytics",
    desc: "FPT Cloud DataSuite BI: quản lý dataset, xây dựng và đọc dashboard, trang và biểu đồ, chạy truy vấn OLAP cube, sao chép hoặc dùng mẫu báo cáo. Kết nối bằng session token của DataSuite (Authorization: Bearer <JWT>).",
    connected: false, soon: false,
    logoKind: "icon", icon: BarChart3, iconBg: "bg-blue-50 border-blue-200", iconColor: "text-blue-600",
  },
  {
    id: "fci-crm", name: "FCI CRM", category: "Productivity",
    desc: "Đọc dữ liệu khách hàng/CRM từ hệ thống FCI CRM (vtiger): liệt kê module, mô tả field và chạy truy vấn SQL chỉ-đọc. Là 1 trong 3 toolkit FCI ĐỘC LẬP, dùng credential username + access-key riêng.",
    connected: false, soon: false, logoKind: "fpt",
  },
  {
    id: "fci-member", name: "FCI Member", category: "Productivity",
    desc: "Onboarding thành viên (nhân viên/cộng tác viên) trong hệ thống FCI HR: tạo member và kiểm tra trạng thái member. Là 1 trong 3 toolkit FCI ĐỘC LẬP, dùng credential api-key riêng.",
    connected: false, soon: false, logoKind: "fpt",
  },
  {
    id: "fci-tickets", name: "FCI Tickets", category: "Ticketing",
    desc: "Phiếu yêu cầu dịch vụ và quy trình duyệt trong FCI (FPT SMS): tạo, hủy và tra cứu ticket. Là 1 trong 3 toolkit FCI ĐỘC LẬP, dùng credential S-Token riêng.",
    connected: false, soon: false, logoKind: "fpt",
  },
  {
    id: "onedrive", name: "OneDrive", category: "Documents",
    desc: "Duyệt, tải xuống, chỉnh sửa và chia sẻ file trên Microsoft OneDrive.",
    connected: false, soon: false, logoKind: "image", logo: LOGO.onedrive,
  },
  {
    id: "outlook", name: "Outlook", category: "Email",
    desc: "Đọc, tìm kiếm và gửi email từ hộp thư Microsoft 365 Outlook của bạn.",
    connected: false, soon: false, logoKind: "image", logo: LOGO.outlook,
  },
  {
    id: "sharepoint", name: "SharePoint", category: "Documents",
    desc: "Duyệt, tìm kiếm và đọc file cùng dữ liệu Excel trên Microsoft 365 SharePoint / OneDrive của bạn.",
    connected: true, soon: false, ownerId: CURRENT_USER.id,
    logoKind: "image", logo: LOGO.sharepoint,
  },
  {
    id: "tavily", name: "Tavily", category: "Web Search",
    desc: "Tìm kiếm web và crawl site bằng Tavily, dùng API key Tavily riêng của tenant (toàn bộ chi phí tính vào key đó). Kết nối bằng Tavily API key (tvly-…).",
    connected: false, soon: false,
    logoKind: "icon", icon: Globe, iconBg: "bg-teal-50 border-teal-200", iconColor: "text-teal-600",
  },
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
  const [publishTarget, setPublishTarget] = useState<CustomConnector | null>(null);
  const [editTarget, setEditTarget] = useState<CustomConnector | null>(null);
  const [shareTarget, setShareTarget] = useState<CustomConnector | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomConnector | null>(null);
  // API Tool — a separate "Custom Tool" kind (a single REST endpoint definition) alongside
  // Custom MCP connectors above, with the same sharing / in-use rules.
  const [showAddApiTool, setShowAddApiTool] = useState(false);
  const [shareApiToolTarget, setShareApiToolTarget] = useState<CustomApiTool | null>(null);
  const { can } = useMyPermissions();
  const canCreateConnector = can("connectors.create");
  const [editApiToolTarget, setEditApiToolTarget] = useState<CustomApiTool | null>(null);
  const [deleteApiToolTarget, setDeleteApiToolTarget] = useState<CustomApiTool | null>(null);
  const [customTab, setCustomTab] = useState<CustomTab>("all");
  // Clicking a custom connector card shows its details (same popup as in an Agent's Instructions).
  const [detailConnectorId, setDetailConnectorId] = useState<string | null>(null);
  const [detailApiToolId, setDetailApiToolId] = useState<string | null>(null);

  // Connector Templates — internal FPT systems (FCI CRM/Member/Tickets) that moved out of
  // Marketplace into Custom Connectors as pre-built templates (see connectorTemplateStore.ts).
  const [connectTemplate, setConnectTemplate] = useState<ConnectorTemplateDef | null>(null);
  const [manageTemplate, setManageTemplate] = useState<ConnectorTemplateDef | null>(null);

  // Marketplace connector cards — `connectedIds` is a session-local override on top of the
  // static seed array so "Kết nối" / "Ngắt kết nối" (from the detail modal) actually do
  // something, without standing up a full persisted store for a static seed array.
  const [detailTarget, setDetailTarget] = useState<Connector | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(
    () => new Set(CONNECTORS.filter(c => c.connected).map(c => c.id)),
  );
  const effectiveConnectors = useMemo(
    () => CONNECTORS.map(c => ({ ...c, connected: connectedIds.has(c.id) })),
    [connectedIds],
  );
  const customConnectors = customConnectorStore.list();
  const accessibleCustomConnectors = customConnectors.filter(c => isCustomConnectorAccessibleTo(c.sharing, c.ownerId, CURRENT_USER.id));
  // Custom section = FPT's internal connector templates (tagged Hệ thống) + MCP connectors people
  // added (Của tôi / Được chia sẻ). Tabs filter by tag.
  type CustomItem =
    | { kind: "template"; t: ConnectorTemplateDef; tags: OwnershipTag[] }
    | { kind: "custom"; c: CustomConnector; tags: OwnershipTag[] }
    | { kind: "apitool"; a: CustomApiTool; tags: OwnershipTag[] };
  const customApiTools = customApiToolStore.listAccessible(CURRENT_USER.id);
  const customItems: CustomItem[] = [
    ...CONNECTOR_TEMPLATES.map(t => ({ kind: "template" as const, t, tags: ["system"] as OwnershipTag[] })),
    ...accessibleCustomConnectors.map(c => ({ kind: "custom" as const, c, tags: ownershipTags({ ownerId: c.ownerId, sharing: c.sharing, userId: CURRENT_USER.id }) })),
    ...customApiTools.map(a => ({ kind: "apitool" as const, a, tags: ownershipTags({ ownerId: a.ownerId, sharing: a.sharing, userId: CURRENT_USER.id }) })),
  ];
  const customTabCounts = countByTab(customItems, i => i.tags);
  const customFiltered = customItems.filter(i => matchesTab(i.tags, customTab));

  // Only an established connection is really "someone's resource" — browsing the catalog of
  // not-yet-connected services is never restricted. A role whose Connectors View Scope is
  // "Own & Shared" (or with no View permission at all) only sees connections it set up or that
  // were shared with it.
  const isConnectorVisible = (c: Connector) =>
    !c.connected || access.canSeeAll || isOwnedOrShared(c, access.userId);

  const visibleConnectors = useMemo(
    () => effectiveConnectors.filter(isConnectorVisible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveConnectors, access.canSeeAll, access.userId],
  );
  const tabCounts: Record<Tab, number> = {
    all: visibleConnectors.length,
    connected: visibleConnectors.filter(c => c.connected).length,
    available: visibleConnectors.filter(c => !c.connected).length,
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return visibleConnectors.filter(c => {
      if (tab === "connected" && !c.connected) return false;
      if (tab === "available" && c.connected) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.desc.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tab, query, visibleConnectors]);

  const handleConnect = (c: Connector) => {
    setConnectedIds(prev => new Set(prev).add(c.id));
    toast.success(`Đã kết nối ${c.name}.`);
  };

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto animate-fade-up">
      {/* Page header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-11 h-11 rounded-xl bg-primary-soft border border-primary/20 flex items-center justify-center shrink-0">
          <Plug size={20} className="text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight mb-1">Kết nối</h1>
          <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">
            Kết nối Agent với Marketplace Connectors, Custom Connectors và các hệ thống bên ngoài để truy vấn dữ liệu và thực thi hành động.
          </p>
        </div>
      </div>

      {/* Marketplace / Custom split — segmented control */}
      <Tabs value={section} onValueChange={v => setSection(v as Section)} className="mb-6">
        <TabsList className="h-auto p-1 rounded-xl bg-surface-muted">
          <TabsTrigger
            value="marketplace"
            className="rounded-lg px-4 h-8 text-sm font-medium text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Marketplace Connectors
          </TabsTrigger>
          <TabsTrigger
            value="custom"
            className="rounded-lg px-4 h-8 text-sm font-medium text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Custom Connectors
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {section === "marketplace" && (
        <>
          {/* Toolbar: search (left) + status filter pills (right) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
            <div className="relative w-full md:w-[360px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tìm Marketplace Connectors…"
                className="h-10 w-full pl-9 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="flex items-center gap-2">
              {MARKETPLACE_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`h-8 pl-3 pr-2 rounded-full border text-sm font-medium flex items-center gap-1.5 transition-base ${
                    tab === t.key ? "bg-primary-soft border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-surface-muted"
                  }`}
                >
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-primary/10" : "bg-surface-sunken"}`}>
                    {tabCounts[t.key]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Card grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(c => (
                <MarketplaceConnectorCard
                  key={c.id}
                  connector={c}
                  onConnect={() => handleConnect(c)}
                  onManage={() => setDetailTarget(c)}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground text-sm">Không tìm thấy connector nào.</div>
          )}
        </>
      )}

      {section === "custom" && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-5">
            <p className="text-sm text-muted-foreground">Connector hệ thống nội bộ FPT dựng sẵn, thêm một MCP server, hoặc định nghĩa một API Tool để cấp công cụ cho Agent của bạn.</p>
            <AddCustomConnectorMenu
              disabled={!canCreateConnector}
              disabledReason="Vai trò của bạn chưa có quyền tạo connector."
              onPickMcp={() => canCreateConnector && setShowAddCustom(true)}
              onPickApiTool={() => canCreateConnector && setShowAddApiTool(true)}
            />
          </div>

          <div className="mb-5">
            <OwnershipTabs tab={customTab} onChange={setCustomTab} counts={customTabCounts} noun="kết nối" />
          </div>

          {customFiltered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
              <Plug size={22} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">{ownershipEmptyCopy(customTab, "kết nối")?.title ?? "Chưa có custom connector nào"}</p>
              <p className="text-sm text-muted-foreground">{ownershipEmptyCopy(customTab, "kết nối")?.body ?? "Thêm một MCP server hoặc một API Tool để cấp công cụ cho Agent của bạn."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {customFiltered.map(i => {
                if (i.kind === "template") {
                  const t = i.t;
                  const connected = connectorTemplateStore.isConnected(t.id);
                  const open = () => (connected ? setManageTemplate(t) : setConnectTemplate(t));
                  return (
                    <ResourceCard
                      key={`tpl-${t.id}`}
                      icon={<ResourceIconTile system><span className="text-sm font-semibold">{t.name.slice(0, 1)}</span></ResourceIconTile>}
                      name={t.name}
                      tags={i.tags}
                      description={t.desc}
                      extra={connected
                        ? <p className="text-xs text-success font-medium flex items-center gap-1"><CheckCircle2 size={12} /> {connectorTemplateStore.listAccounts(t.id).length} credential đã kết nối</p>
                        : <p className="text-xs text-muted-foreground">Chưa kết nối · điền credential để dùng</p>}
                      creator={<CardCreator displayName="FPT AI Agents" system />}
                      highlighted={connected}
                      onOpen={open}
                    />
                  );
                }
                if (i.kind === "apitool") {
                  const a = i.a;
                  return (
                    <CustomApiToolCard
                      key={a.id}
                      tool={a}
                      tags={i.tags}
                      onOpen={() => setDetailApiToolId(a.id)}
                      onEdit={a.ownerId === CURRENT_USER.id ? () => setEditApiToolTarget(a) : undefined}
                      onShare={a.ownerId === CURRENT_USER.id ? () => setShareApiToolTarget(a) : undefined}
                      onDelete={() => setDeleteApiToolTarget(a)}
                    />
                  );
                }
                const c = i.c;
                const isMine = c.ownerId === CURRENT_USER.id;
                return (
                  <CustomConnectorCard
                    key={c.id}
                    connector={c}
                    tags={i.tags}
                    isMine={isMine}
                    onOpen={() => setDetailConnectorId(c.id)}
                    onEdit={isMine ? () => setEditTarget(c) : undefined}
                    onShare={isMine ? () => setShareTarget(c) : undefined}
                    onPublish={isMine ? () => setPublishTarget(c) : undefined}
                    onDelete={() => setDeleteTarget(c)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {detailConnectorId && (
        <AgentResourceDetailModal
          agentId=""
          target={{ kind: "connector", id: detailConnectorId }}
          onClose={() => setDetailConnectorId(null)}
          onChanged={refresh}
        />
      )}

      {detailApiToolId && (
        <AgentResourceDetailModal
          agentId=""
          target={{ kind: "apiTool", id: detailApiToolId }}
          onClose={() => setDetailApiToolId(null)}
          onChanged={refresh}
        />
      )}

      {shareApiToolTarget && (
        <CustomConnectorShareModal
          open
          noun="API Tool"
          name={shareApiToolTarget.name}
          ownerName={shareApiToolTarget.ownerName}
          sharing={shareApiToolTarget.sharing}
          resourceOwnerId={shareApiToolTarget.ownerId}
          attachedAgentIds={shareApiToolTarget.attachedByAgentIds}
          agentOnlyFor={shareApiToolTarget.originAgentId}
          originAgentName={shareApiToolTarget.originAgentId ? getAgent(shareApiToolTarget.originAgentId).name : undefined}
          onSave={sharing => { customApiToolStore.updateSharing(shareApiToolTarget.id, sharing); refresh(); }}
          onClose={() => setShareApiToolTarget(null)}
        />
      )}

      {showAddCustom && (
        <AddCustomConnectorModal
          onClose={() => setShowAddCustom(false)}
          onCreated={() => { setShowAddCustom(false); refresh(); }}
        />
      )}

      {showAddApiTool && (
        <AddCustomApiToolModal
          onClose={() => setShowAddApiTool(false)}
          onCreated={() => { setShowAddApiTool(false); refresh(); }}
        />
      )}

      {editApiToolTarget && (
        <AddCustomApiToolModal
          editing={editApiToolTarget}
          onClose={() => setEditApiToolTarget(null)}
          onUpdated={() => { setEditApiToolTarget(null); toast.success("Đã lưu thay đổi."); refresh(); }}
        />
      )}

      {publishTarget && (
        <RequestPublishModal
          resourceType="connector" resourceId={publishTarget.id} resourceName={publishTarget.name}
          onClose={() => setPublishTarget(null)}
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
          resourceOwnerId={shareTarget.ownerId}
          attachedAgentIds={shareTarget.attachedByAgentIds}
          agentOnlyFor={shareTarget.originAgentId}
          originAgentName={shareTarget.originAgentId ? getAgent(shareTarget.originAgentId).name : undefined}
          onSave={sharing => { customConnectorStore.updateSharing(shareTarget.id, sharing); refresh(); }}
          onClose={() => setShareTarget(null)}
        />
      )}

      <ResourceInUseDialog
        open={!!deleteTarget && deleteTarget.attachedByAgentIds.length > 0}
        onClose={() => setDeleteTarget(null)}
        title="Chưa thể xóa connector"
        description={"Connector vẫn đang được các Agent dưới đây sử dụng. Chủ sở hữu cần gỡ connector khỏi Agent trước, sau đó bạn mới xóa được."}
        agents={agentsUsing(deleteTarget?.attachedByAgentIds)}
      />
      <AlertDialog open={!!deleteTarget && deleteTarget.attachedByAgentIds.length === 0} onOpenChange={v => !v && setDeleteTarget(null)}>
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

      <ResourceInUseDialog
        open={!!deleteApiToolTarget && deleteApiToolTarget.attachedByAgentIds.length > 0}
        onClose={() => setDeleteApiToolTarget(null)}
        title="Chưa thể xóa API Tool"
        description={"API Tool vẫn đang được các Agent dưới đây sử dụng. Chủ sở hữu cần gỡ API Tool khỏi Agent trước, sau đó bạn mới xóa được."}
        agents={deleteApiToolTarget ? agentsUsing(deleteApiToolTarget.attachedByAgentIds) : []}
      />
      <AlertDialog open={!!deleteApiToolTarget && deleteApiToolTarget.attachedByAgentIds.length === 0} onOpenChange={v => !v && setDeleteApiToolTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa API Tool "{deleteApiToolTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>API Tool sẽ bị xóa vĩnh viễn khỏi workspace. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteApiToolTarget) { customApiToolStore.remove(deleteApiToolTarget.id); refresh(); } setDeleteApiToolTarget(null); }}
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
            setConnectedIds(prev => { const next = new Set(prev); next.delete(detailTarget.id); return next; });
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
function ConnectorLogo({ connector: c }: { connector: Connector }) {
  if (c.logoKind === "fpt") {
    return (
      <div className="w-11 h-11 rounded-xl border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden">
        <FptMark />
      </div>
    );
  }
  if (c.logoKind === "icon" && c.icon) {
    const Icon = c.icon;
    return (
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${c.iconBg ?? "bg-surface-muted border-border"}`}>
        <Icon size={20} className={c.iconColor ?? "text-muted-foreground"} />
      </div>
    );
  }
  return (
    <div className="w-11 h-11 rounded-xl border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden p-1.5">
      <img
        src={c.logo}
        alt={c.name}
        className="w-full h-full object-contain"
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    </div>
  );
}

/** Placeholder brand mark for the 3 internal FCI toolkits (FCI CRM / Member / Tickets) — FPT's
 * 3-brand-color motif, drawn inline since these internal systems have no public logo asset. */
function FptMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="7" height="24" rx="2" fill="#F36F21" />
      <rect x="9.5" y="1" width="7" height="24" rx="2" fill="#00A651" />
      <rect x="18" y="1" width="7" height="24" rx="2" fill="#0071BC" />
    </svg>
  );
}

function MarketplaceConnectorCard({ connector: c, onConnect, onManage }: {
  connector: Connector; onConnect: () => void; onManage: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-[18px] flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <ConnectorLogo connector={c} />
        {c.connected ? (
          <span className="chip chip-success shrink-0"><CheckCircle2 size={12} /> Đã kết nối</span>
        ) : (
          <span className="chip chip-muted shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-current" /> Chưa kết nối</span>
        )}
      </div>
      <p className="text-sm font-semibold mb-1">{c.name}</p>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[32px] mb-3 flex-1">{c.desc}</p>
      <Separator className="mb-3" />
      <div className="flex items-center justify-between gap-2">
        <span className="chip chip-muted text-[11px] px-2 py-0.5 shrink-0">{c.category}</span>
        {c.connected ? (
          <button onClick={onManage} className="btn-secondary shrink-0">Quản lý</button>
        ) : (
          <button onClick={onConnect} className="btn-primary shrink-0"><Plug size={13} /> Kết nối</button>
        )}
      </div>
    </div>
  );
}

/* ─── Custom Connector card + row menu ───────────────── */
function CustomConnectorRowMenu({ onView, onEdit, onShare, onPublish, onToggleBlock, isBlocked, onDelete }: {
  onView?: () => void; onEdit?: () => void; onShare?: () => void; onPublish?: () => void; onToggleBlock?: () => void; isBlocked?: boolean; onDelete: () => void;
}) {
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
          {onView && (
            <button onClick={() => { setOpen(false); onView(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">
              Xem chi tiết
            </button>
          )}
          {onEdit && (
            <button onClick={() => { setOpen(false); onEdit(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">
              Chỉnh sửa
            </button>
          )}
          {onShare && (
            <button onClick={() => { setOpen(false); onShare(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">
              Ai được dùng
            </button>
          )}
          {onPublish && (
            <button onClick={() => { setOpen(false); onPublish(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">
              Publish
            </button>
          )}
          {onToggleBlock && (
            <button onClick={() => { setOpen(false); onToggleBlock(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">
              {isBlocked ? "Bỏ chặn agent mới" : "Chặn dùng trong Agent mới"}
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

function CustomConnectorCard({ connector: c, tags, isMine, onOpen, onEdit, onShare, onPublish, onToggleBlock, onDelete }: {
  connector: CustomConnector; tags: OwnershipTag[]; isMine: boolean; onOpen: () => void; onEdit?: () => void; onShare?: () => void; onPublish?: () => void; onToggleBlock?: () => void; onDelete: () => void;
}) {
  const openReq = governanceStore.getOpenRequestForResource("connector", c.id);
  const isApproved = governanceStore.isResourceApproved("connector", c.id);
  const isBlocked = resourceBlockStore.isBlocked("connector", c.id);
  return (
    <ResourceCard
      icon={<ResourceIconTile><Plug size={16} /></ResourceIconTile>}
      name={c.name}
      tags={tags}
      menu={<CustomConnectorRowMenu onView={onOpen} onEdit={onEdit} onShare={onShare} onPublish={onPublish} onToggleBlock={onToggleBlock} isBlocked={isBlocked} onDelete={onDelete} />}
      description={c.url}
      singleLineDescription
      onOpen={onOpen}
      extra={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{AUTH_LABEL[c.authType]}</span>
          {(openReq || isApproved) && <StatusBadge status={openReq ? openReq.status : "approved"} />}
        </div>
      }
      creator={<CardCreator displayName={isMine ? "Bạn" : c.ownerName} fullName={c.ownerName} />}
      agents={<AgentCount count={c.attachedByAgentIds.length} />}
    />
  );
}

/** One "+ Thêm custom connector" button that asks which kind to add — MCP server or API Tool —
 * instead of two sibling buttons that read as unrelated actions. */
function AddCustomConnectorMenu({ onPickMcp, onPickApiTool, disabled, disabledReason }: {
  onPickMcp: () => void; onPickApiTool: () => void; disabled?: boolean; disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const options = [
    { icon: Plug, label: "MCP server", sub: "Kết nối một MCP server có sẵn để cấp công cụ của nó cho Agent.", onPick: onPickMcp },
    { icon: Globe, label: "API Tool", sub: "Định nghĩa một REST API (URL, method, xác thực, tham số) để Agent gọi.", onPick: onPickApiTool },
  ];
  return (
    <div className="relative shrink-0" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        + Thêm custom connector
        <ChevronDown size={14} className={`transition-base ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-30 w-80 bg-white rounded-2xl border border-border shadow-elev p-1.5 animate-fade-up">
          {options.map((o, i) => (
            <div key={o.label}>
              {i > 0 && <div className="h-px bg-border mx-2.5 my-1" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); o.onPick(); }}
                className="w-full flex items-start gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <o.icon size={16} />
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block text-sm font-semibold text-foreground">{o.label}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground mt-0.5">{o.sub}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const API_METHOD_CLASS: Record<HttpMethod, string> = {
  GET: "bg-[hsl(var(--success-soft))] text-[hsl(var(--success-strong))]",
  POST: "bg-primary-soft text-primary",
  PUT: "bg-amber-100 text-amber-700",
  PATCH: "bg-purple-100 text-purple-700",
  DELETE: "bg-destructive/10 text-destructive",
};

/** API Tool card — same "Phương án A" ResourceCard shell as a Custom Connector card, with a
 * method badge and the auth type. Menu: Xem chi tiết / Chỉnh sửa / Chia sẻ (owner) / Xóa. */
function CustomApiToolCard({ tool: a, tags, onOpen, onEdit, onShare, onDelete }: {
  tool: CustomApiTool; tags: OwnershipTag[]; onOpen: () => void; onEdit?: () => void; onShare?: () => void; onDelete: () => void;
}) {
  return (
    <ResourceCard
      icon={<ResourceIconTile><Globe size={16} /></ResourceIconTile>}
      name={a.name}
      tags={tags}
      menu={<CustomConnectorRowMenu onView={onOpen} onEdit={onEdit} onShare={onShare} onDelete={onDelete} />}
      description={a.description}
      onOpen={onOpen}
      extra={
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${API_METHOD_CLASS[a.method]}`}>{a.method}</span>
          <span className="text-xs text-muted-foreground truncate">{AUTH_TYPE_LABEL[a.auth.type]}</span>
        </div>
      }
      creator={<CardCreator displayName={a.ownerId === CURRENT_USER.id ? "Bạn" : a.ownerName} fullName={a.ownerName} />}
    />
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
            <ConnectorLogo connector={connector} />
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
