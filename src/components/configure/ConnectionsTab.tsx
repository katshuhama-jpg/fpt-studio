import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, MoreVertical, User, Building2, X, AlertTriangle, Info, Plus, Plug } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { agentConnectorStore, type ConnectorScope } from "./agentConnectorStore";
import { triggerStore, type ExternalApp } from "./triggerStore";
import { hasTriggers } from "./agentAutomationGuard";
import { CONNECTOR_BLOCKED_BY_TRIGGER_REASON } from "./agentPublishStore";
import { customConnectorStore, type CustomConnector } from "./customConnectorStore";
import { isAccessibleTo as isCustomConnectorAccessibleTo } from "./customConnectorSharing";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import AddCustomConnectorModal from "./AddCustomConnectorModal";
import { toast } from "sonner";

export const CATALOG = [
  { id: "gmail", name: "Gmail", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg", desc: "Search, create, and manage emails on this agent's behalf." },
  { id: "gdrive", name: "Google Drive", logo: "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg", desc: "Search and retrieve files and folders from Drive." },
  { id: "sheets", name: "Google Sheets", logo: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Google_Sheets_2020_Logo.svg", desc: "Read and write rows, ranges, and formulas." },
  { id: "slack", name: "Slack", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg", desc: "Read channels, send messages, and search conversations." },
  { id: "notion", name: "Notion", logo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png", desc: "Read, create, and update pages and databases." },
  { id: "hubspot", name: "HubSpot", logo: "https://upload.wikimedia.org/wikipedia/commons/3/3f/HubSpot_Logo.svg", desc: "Query and update contacts, deals, and companies in your CRM." },
];

const SHARED_ACCOUNT_EMAIL = "automation@fpt.com.vn";

const SCOPE_BADGE_STYLE: Record<ConnectorScope, React.CSSProperties> = {
  shared: { background: "#EEF2FF", color: "#4338CA", border: "0.5px solid #C7D2FE" },
  personal: { background: "#F5F3FF", color: "#6D28D9", border: "0.5px solid #DDD6FE" },
};

const SCOPE_LABEL: Record<ConnectorScope, string> = { shared: "Dùng chung", personal: "Riêng cá nhân" };
const SCOPE_MENU_DESC: Record<ConnectorScope, string> = {
  shared: "Một tài khoản cho cả workspace.",
  personal: "Mỗi người dùng tự kết nối tài khoản của mình.",
};

function accountLine(scope: ConnectorScope): string {
  return scope === "shared" ? `${SHARED_ACCOUNT_EMAIL} · Tài khoản tổ chức` : "Mỗi người dùng tự kết nối tài khoản của mình";
}

/* ---------- Custom Connector id namespacing ----------
 * agentConnectorStore keys connections by a single connectorId string shared with CATALOG's
 * plain ids ("gmail", "slack", ...). A Custom Connector (self-added MCP, tracked in
 * customConnectorStore.ts) is a different, Console-level resource with its own id space, so it's
 * referenced here as `custom:<customConnectorId>` to avoid ever colliding with a CATALOG id. */
const CUSTOM_PREFIX = "custom:";
const isCustomConnectorRef = (connectorId: string) => connectorId.startsWith(CUSTOM_PREFIX);
const customConnectorIdOf = (connectorId: string) => connectorId.slice(CUSTOM_PREFIX.length);
const customConnectorRef = (customId: string) => `${CUSTOM_PREFIX}${customId}`;

interface ConnectorMeta {
  id: string;
  name: string;
  desc: string;
  logo?: string;
}

/** Resolves a connectorId (as stored on agentConnectorStore) to display metadata, whether it's a
 * fixed CATALOG entry or a Console Custom Connector — so ConnectionCard/EditScopeModal/the delete
 * dialog don't need to know which kind they're rendering. */
function resolveConnectorMeta(connectorId: string): ConnectorMeta | undefined {
  const builtin = CATALOG.find(c => c.id === connectorId);
  if (builtin) return builtin;
  if (isCustomConnectorRef(connectorId)) {
    const c = customConnectorStore.get(customConnectorIdOf(connectorId));
    if (c) return { id: connectorId, name: c.name, desc: c.url };
  }
  return undefined;
}

/* ---------- Edit modal — switch an existing connector's scope ---------- */
function EditScopeModal({ agentId, connectorId, onClose, onSaved, onViewTriggers }: {
  agentId: string; connectorId: string; onClose: () => void; onSaved: () => void; onViewTriggers?: () => void;
}) {
  const meta = resolveConnectorMeta(connectorId);
  const existing = agentConnectorStore.list(agentId).find(c => c.connectorId === connectorId);
  const blockedByTriggers = hasTriggers(agentId);
  const [scope, setScope] = useState<ConnectorScope>(blockedByTriggers ? "shared" : (existing?.scope ?? "shared"));

  const save = () => {
    const ok = agentConnectorStore.add(agentId, connectorId, scope);
    if (!ok) {
      // Backstop: the radio is disabled whenever blockedByTriggers, so this should be
      // unreachable through the UI — the store itself rejected the write regardless.
      toast.error(CONNECTOR_BLOCKED_BY_TRIGGER_REASON());
      return;
    }
    toast.success("Đã lưu kết nối.");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-border shadow-lg animate-fade-up">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
            {meta && (meta.logo
              ? <img src={meta.logo} alt={meta.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              : <Plug size={14} className="text-muted-foreground" />)}
          </div>
          <h3 className="font-display text-base font-semibold flex-1">
            Chỉnh sửa kết nối {meta?.name ?? connectorId}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground shrink-0">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-1.5">
          <label
            aria-disabled={blockedByTriggers}
            className={`flex items-start gap-3 w-full text-left rounded-xl border px-3.5 py-3 transition-base ${
              blockedByTriggers
                ? "border-border opacity-45 cursor-not-allowed"
                : scope === "personal"
                  ? "border-primary bg-primary-soft/40 ring-1 ring-primary cursor-pointer"
                  : "border-border hover:bg-surface-muted cursor-pointer"
            }`}
          >
            <input
              type="radio"
              name="connector-scope"
              value="personal"
              checked={scope === "personal"}
              disabled={blockedByTriggers}
              aria-disabled={blockedByTriggers}
              onChange={() => { if (!blockedByTriggers) setScope("personal"); }}
              aria-describedby={blockedByTriggers ? "connector-scope-personal-warning" : undefined}
              className="mt-[3px] w-4 h-4 accent-primary shrink-0 disabled:cursor-not-allowed"
            />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2 mb-1">
                <User size={14} className="text-foreground shrink-0" />
                <span className="text-sm font-semibold">Riêng cá nhân</span>
              </span>
              <span className="block text-xs text-muted-foreground leading-relaxed">
                {SCOPE_MENU_DESC.personal}
              </span>
            </span>
          </label>
          {blockedByTriggers && (
            <div id="connector-scope-personal-warning" className="flex items-start gap-2 text-xs text-warning bg-[hsl(var(--warning-soft))] border border-warning/25 rounded-lg px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p>
                {CONNECTOR_BLOCKED_BY_TRIGGER_REASON()}{" "}
                {onViewTriggers && (
                  <button type="button" onClick={onViewTriggers} className="font-semibold hover:underline">
                    Xem trigger
                  </button>
                )}
              </p>
            </div>
          )}

          <label
            className={`flex items-start gap-3 w-full text-left rounded-xl border px-3.5 py-3 transition-base ${
              scope === "shared" ? "border-primary bg-primary-soft/40 ring-1 ring-primary" : "border-border hover:bg-surface-muted"
            } cursor-pointer`}
          >
            <input
              type="radio"
              name="connector-scope"
              value="shared"
              checked={scope === "shared"}
              onChange={() => setScope("shared")}
              className="mt-[3px] w-4 h-4 accent-primary shrink-0"
            />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2 mb-1">
                <Building2 size={14} className="text-foreground shrink-0" />
                <span className="text-sm font-semibold">Dùng chung</span>
              </span>
              <span className="block text-xs text-muted-foreground leading-relaxed">
                {SCOPE_MENU_DESC.shared}
              </span>
            </span>
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Huỷ</button>
          <button onClick={save} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base">
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Add-connector picker — scope already chosen, just pick the service ---------- */
function AddConnectorPicker({ scope, existingIds, onClose, onPick, onPickCustom }: {
  scope: ConnectorScope; existingIds: Set<string>; onClose: () => void; onPick: (connectorId: string) => void;
  /** Shared scope only — lets the picker offer Custom Connectors + inline "+ Add custom MCP",
   * mirroring the real product's "Shared Connectors" picker. */
  onPickCustom?: { customConnectors: CustomConnector[]; onCreateNew: () => void };
}) {
  const [query, setQuery] = useState("");
  const available = CATALOG.filter(c => !existingIds.has(c.id));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter(c => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, existingIds]);

  const availableCustom = (onPickCustom?.customConnectors ?? []).filter(c => !existingIds.has(customConnectorRef(c.id)));
  const filteredCustom = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableCustom;
    return availableCustom.filter(c => c.name.toLowerCase().includes(q) || c.url.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, existingIds, onPickCustom]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl border border-border shadow-lg animate-fade-up max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <h3 className="font-display text-base font-semibold flex-1">
            Thêm Connector — {SCOPE_LABEL[scope]}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground shrink-0">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 pt-4 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm kết nối..."
              className="h-9 w-full pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {filtered.length === 0 && filteredCustom.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {available.length === 0 && availableCustom.length === 0 ? "Bạn đã kết nối tất cả dịch vụ có sẵn." : "Không tìm thấy kết nối nào."}
            </p>
          ) : (
            <>
              {filtered.map(meta => (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => onPick(meta.id)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-surface-muted text-left transition-base"
                >
                  <div className="w-9 h-9 rounded-lg border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
                    <img src={meta.logo} alt={meta.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{meta.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{meta.desc}</p>
                  </div>
                </button>
              ))}
              {filteredCustom.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1 pt-2">Custom Connectors</p>
                  {filteredCustom.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onPick(customConnectorRef(c.id))}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-surface-muted text-left transition-base"
                    >
                      <div className="w-9 h-9 rounded-lg border border-border bg-white flex items-center justify-center shrink-0">
                        <Plug size={15} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed truncate">{c.url}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
        {onPickCustom && (
          <div className="px-5 py-3 border-t border-border shrink-0">
            <button
              type="button"
              onClick={onPickCustom.onCreateNew}
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-surface-muted text-sm font-medium text-primary transition-base"
            >
              <Plus size={14} /> Add custom MCP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- "+ Thêm Connector" menu — always both choices, personal may be inactive ---------- */
const ADD_MENU_WIDTH = 280;

function AddConnectorMenu({ blockedPersonal, onPick }: { blockedPersonal: boolean; onPick: (scope: ConnectorScope) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const left = Math.min(Math.max(r.right - ADD_MENU_WIDTH, 8), window.innerWidth - ADD_MENU_WIDTH - 8);
      setPos({ top: r.bottom + 6, left });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="btn-primary h-9"
      >
        <Plus size={14} /> Thêm Connector
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] rounded-xl border border-border bg-white shadow-elev py-1.5"
          style={{ top: pos.top, left: pos.left, width: ADD_MENU_WIDTH }}
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onPick("shared"); }}
            className="w-full flex items-start gap-2.5 text-left px-3.5 py-2.5 hover:bg-surface-muted transition-base"
          >
            <Building2 size={15} className="text-foreground shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-foreground">Dùng chung</span>
              <span className="block text-xs text-muted-foreground">{SCOPE_MENU_DESC.shared}</span>
            </span>
          </button>

          <button
            type="button"
            disabled={blockedPersonal}
            aria-disabled={blockedPersonal}
            tabIndex={blockedPersonal ? -1 : 0}
            onClick={blockedPersonal ? undefined : () => { setOpen(false); onPick("personal"); }}
            className={`w-full flex items-start gap-2.5 text-left px-3.5 py-2.5 transition-base ${
              blockedPersonal ? "opacity-45 cursor-not-allowed" : "hover:bg-surface-muted"
            }`}
          >
            <User size={15} className="text-foreground shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-foreground">Riêng cá nhân</span>
              <span className="block text-xs text-muted-foreground">{SCOPE_MENU_DESC.personal}</span>
            </span>
          </button>
          {blockedPersonal && (
            <p className="px-3.5 pt-1 pb-2 text-xs text-warning leading-relaxed">
              {CONNECTOR_BLOCKED_BY_TRIGGER_REASON()}
            </p>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ---------- per-card "…" menu ---------- */
const CARD_MENU_WIDTH = 176;

function CardMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const openUpward = window.innerHeight - r.bottom < 100 && r.top > 100;
      const left = Math.min(Math.max(r.right - CARD_MENU_WIDTH, 8), window.innerWidth - CARD_MENU_WIDTH - 8);
      setPos(openUpward ? { bottom: window.innerHeight - r.top + 4, left } : { top: r.bottom + 4, left });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-label="Tuỳ chọn kết nối"
        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base"
      >
        <MoreVertical size={15} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-44 rounded-lg border border-border bg-white shadow-elev py-1"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
        >
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base">
            Chỉnh sửa kết nối
          </button>
          <button onClick={() => { onDelete(); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">
            Xoá kết nối
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

function ConnectionCard({ meta, scope, onEdit, onRemove }: {
  meta: ConnectorMeta; scope: ConnectorScope; onEdit: () => void; onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface">
      <div className="w-10 h-10 rounded-xl border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
        {meta.logo
          ? <img src={meta.logo} alt={meta.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          : <Plug size={16} className="text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium">{meta.name}</span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
            style={SCOPE_BADGE_STYLE[scope]}
          >
            {SCOPE_LABEL[scope]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{accountLine(scope)}</p>
      </div>
      <CardMenu onEdit={onEdit} onDelete={onRemove} />
    </div>
  );
}

export default function ConnectionsTab({ agentId, onViewTriggers, onChange }: {
  agentId: string; onViewTriggers?: () => void; onChange?: () => void;
}) {
  const [tick, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onChange?.(); };
  const [pickerScope, setPickerScope] = useState<ConnectorScope | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  void tick;

  const connections = agentConnectorStore.list(agentId);
  const blockedPersonal = hasTriggers(agentId);
  const existingIds = new Set(connections.map(c => c.connectorId));
  const deletingMeta = deletingId ? resolveConnectorMeta(deletingId) : undefined;
  const affectedTriggers = deletingId
    ? triggerStore.list(agentId).filter(t => t.type === "external" && t.config.external?.app === (deletingId as ExternalApp))
    : [];

  // Custom Connectors this user can actually see, for the "Dùng chung" picker — same
  // ownership-aware filtering as the Console Connectors page's "Custom Connectors" tab.
  const accessibleCustomConnectors = customConnectorStore.list().filter(c => isCustomConnectorAccessibleTo(c.sharing, c.ownerId, CURRENT_USER.id));

  const attachConnector = (connectorId: string, scope: ConnectorScope) => {
    const ok = agentConnectorStore.add(agentId, connectorId, scope);
    if (!ok) {
      toast.error(CONNECTOR_BLOCKED_BY_TRIGGER_REASON());
      return false;
    }
    if (isCustomConnectorRef(connectorId)) customConnectorStore.addAttachingAgent(customConnectorIdOf(connectorId), agentId);
    return true;
  };

  return (
    <div className="p-8 w-full animate-fade-up">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Kết nối</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Tài khoản và dịch vụ bên ngoài mà agent này được phép dùng.</p>
        </div>
        <AddConnectorMenu blockedPersonal={blockedPersonal} onPick={scope => setPickerScope(scope)} />
      </div>

      {connections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có kết nối nào. Thêm một connector để agent bắt đầu sử dụng dữ liệu bên ngoài.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {connections.map(c => {
            const meta = resolveConnectorMeta(c.connectorId);
            if (!meta) return null;
            return (
              <ConnectionCard
                key={c.connectorId}
                meta={meta}
                scope={c.scope}
                onEdit={() => setEditingId(c.connectorId)}
                onRemove={() => setDeletingId(c.connectorId)}
              />
            );
          })}
        </div>
      )}

      {blockedPersonal && (
        <div className="mt-4 flex items-start gap-2.5 text-sm text-foreground bg-primary-soft/50 border border-primary/20 rounded-xl px-4 py-3">
          <Info size={15} className="text-primary shrink-0 mt-0.5" />
          <p>Agent này có Trigger nên chạy bằng tài khoản Dùng chung. Trigger được setup ở Workspace.</p>
        </div>
      )}

      {pickerScope && (
        <AddConnectorPicker
          scope={pickerScope}
          existingIds={existingIds}
          onClose={() => setPickerScope(null)}
          onPick={connectorId => {
            if (!attachConnector(connectorId, pickerScope)) return;
            toast.success("Đã lưu kết nối.");
            setPickerScope(null);
            refresh();
          }}
          onPickCustom={pickerScope === "shared" ? {
            customConnectors: accessibleCustomConnectors,
            onCreateNew: () => setShowAddCustom(true),
          } : undefined}
        />
      )}

      {showAddCustom && (
        <AddCustomConnectorModal
          onClose={() => setShowAddCustom(false)}
          onCreated={connector => {
            setShowAddCustom(false);
            if (!attachConnector(customConnectorRef(connector.id), "shared")) return;
            toast.success("Đã tạo và kết nối custom connector.");
            setPickerScope(null);
            refresh();
          }}
        />
      )}

      {editingId && (
        <EditScopeModal
          agentId={agentId}
          connectorId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => { refresh(); setEditingId(null); }}
          onViewTriggers={onViewTriggers}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={v => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá kết nối này?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2.5 text-left">
                <p>"{deletingMeta?.name}" sẽ bị xoá khỏi agent này.</p>
                {affectedTriggers.length > 0 && (
                  <p className="text-warning">
                    {affectedTriggers.length} trigger đang dùng kết nối này và sẽ ngừng hoạt động:{" "}
                    {affectedTriggers.map(t => t.name).join(", ")}.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletingId || !deletingMeta) return;
                agentConnectorStore.remove(agentId, deletingId);
                if (isCustomConnectorRef(deletingId)) customConnectorStore.removeAttachingAgent(customConnectorIdOf(deletingId), agentId);
                affectedTriggers.forEach(t => {
                  if (t.type === "external" && t.config.external) {
                    triggerStore.update(agentId, t.id, {
                      config: { ...t.config, external: { ...t.config.external, accountId: undefined } },
                    });
                  }
                });
                toast.success(`Đã xoá kết nối "${deletingMeta.name}".`);
                setDeletingId(null);
                refresh();
              }}
            >
              Xoá kết nối
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
