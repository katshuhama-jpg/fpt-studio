import { useState, useMemo, useEffect } from "react";
import { Search, CheckCircle2, ChevronRight, Pencil, Trash2, User, Building2, X, AlertTriangle } from "lucide-react";
import { agentConnectorStore, type ConnectorScope } from "./agentConnectorStore";
import { triggerStore } from "./triggerStore";
import { hasTriggers } from "./agentAutomationGuard";
import { CONNECTOR_BLOCKED_BY_TRIGGER_REASON, CONNECTOR_BLOCKED_BY_TRIGGER_TOAST } from "./agentPublishStore";
import { toast } from "sonner";

export const CATALOG = [
  { id: "gmail", name: "Gmail", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg", desc: "Search, create, and manage emails on this agent's behalf." },
  { id: "gdrive", name: "Google Drive", logo: "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg", desc: "Search and retrieve files and folders from Drive." },
  { id: "sheets", name: "Google Sheets", logo: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Google_Sheets_2020_Logo.svg", desc: "Read and write rows, ranges, and formulas." },
  { id: "slack", name: "Slack", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg", desc: "Read channels, send messages, and search conversations." },
  { id: "notion", name: "Notion", logo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png", desc: "Read, create, and update pages and databases." },
  { id: "hubspot", name: "HubSpot", logo: "https://upload.wikimedia.org/wikipedia/commons/3/3f/HubSpot_Logo.svg", desc: "Query and update contacts, deals, and companies in your CRM." },
];

function ScopeModal({ agentId, connectorId, editing, onClose, onSaved, onViewTriggers }: {
  agentId: string; connectorId: string; editing?: boolean; onClose: () => void; onSaved: () => void; onViewTriggers?: () => void;
}) {
  const meta = CATALOG.find(c => c.id === connectorId);
  const existing = agentConnectorStore.list(agentId).find(c => c.connectorId === connectorId);
  const triggerCount = triggerStore.list(agentId).length;
  const blockedByTriggers = hasTriggers(agentId);
  const [scope, setScope] = useState<ConnectorScope>(blockedByTriggers ? "shared" : (existing?.scope ?? "shared"));

  const warnBlockedByTriggers = () => {
    toast.warning(CONNECTOR_BLOCKED_BY_TRIGGER_TOAST(triggerCount), {
      duration: 4000,
      style: {
        background: "hsl(var(--warning-soft))",
        color: "hsl(var(--warning))",
        border: "1px solid hsl(var(--warning) / 0.25)",
      },
    });
  };

  const save = () => {
    const ok = agentConnectorStore.add(agentId, connectorId, scope);
    if (!ok) {
      // Backstop: the radio is disabled whenever blockedByTriggers, so this should be
      // unreachable through the UI — the store itself rejected the write regardless.
      toast.error(CONNECTOR_BLOCKED_BY_TRIGGER_REASON(triggerStore.list(agentId).length));
      return;
    }
    toast.success("Connection saved.");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-border shadow-lg animate-fade-up">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
            {meta && <img src={meta.logo} alt={meta.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
          </div>
          <h3 className="font-display text-base font-semibold flex-1">
            {editing ? `Edit ${meta?.name ?? connectorId}` : `Connect ${meta?.name ?? connectorId}`}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground shrink-0">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-1.5">
          <label
            aria-disabled={blockedByTriggers}
            onClick={() => { if (blockedByTriggers) warnBlockedByTriggers(); }}
            className={`flex items-start gap-3 w-full text-left rounded-xl border px-3.5 py-3 transition-base ${
              blockedByTriggers
                ? "border-border opacity-50 cursor-not-allowed"
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
                <span className="text-sm font-semibold">Per-user connection</span>
              </span>
              <span className="block text-xs text-muted-foreground leading-relaxed">
                Each person signs in with their own account. The agent runs under whoever is currently using it.
              </span>
            </span>
          </label>
          {blockedByTriggers && (
            <div id="connector-scope-personal-warning" className="flex items-start gap-2 text-xs text-warning bg-[hsl(var(--warning-soft))] border border-warning/25 rounded-lg px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p>
                {CONNECTOR_BLOCKED_BY_TRIGGER_REASON(triggerCount)}{" "}
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
                <span className="text-sm font-semibold">Shared organization connection</span>
              </span>
              <span className="block text-xs text-muted-foreground leading-relaxed">
                You connect once. Every run uses this same account.
              </span>
            </span>
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Cancel</button>
          <button onClick={save} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base">
            Save connection
          </button>
        </div>
      </div>
    </div>
  );
}

function ConnectionCard({ meta, attached, highlighted, onAdd, onEdit, onRemove }: {
  meta: typeof CATALOG[number];
  attached?: { scope: ConnectorScope };
  highlighted?: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      id={`connector-card-${meta.id}`}
      className={`flex items-start gap-3 p-4 rounded-xl border bg-surface transition-base ${
        highlighted ? "border-warning ring-2 ring-warning/40" : attached ? "border-primary/30" : "border-border"
      }`}
    >
      <div className="w-10 h-10 rounded-xl border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
        <img src={meta.logo} alt={meta.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-medium">{meta.name}</span>
          {attached && <CheckCircle2 size={13} className="text-success shrink-0" />}
          {attached && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
              style={attached.scope === "shared" ? { background: "#EEF2FF", color: "#4338CA", border: "0.5px solid #C7D2FE" } : { background: "#ECFDF5", color: "#047857", border: "0.5px solid #A7F3D0" }}
            >
              {attached.scope === "shared" ? "Shared" : "Per-user"}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{meta.desc}</p>
      </div>
      {attached ? (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} aria-label="Edit connection" className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base">
            <Pencil size={13} />
          </button>
          <button onClick={onRemove} aria-label="Remove connection" className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-surface-muted transition-base">
            <Trash2 size={13} />
          </button>
        </div>
      ) : (
        <button onClick={onAdd} aria-label={`Add ${meta.name}`} className="text-muted-foreground hover:text-primary shrink-0 mt-0.5">
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

export default function ConnectionsTab({ agentId, onViewTriggers, onChange, highlightConnectorId }: {
  agentId: string; onViewTriggers?: () => void; onChange?: () => void; highlightConnectorId?: string;
}) {
  const [tick, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onChange?.(); };
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | undefined>(undefined);
  void tick;
  const connections = agentConnectorStore.list(agentId);

  useEffect(() => {
    if (!highlightConnectorId) return;
    setFlashId(highlightConnectorId);
    document.getElementById(`connector-card-${highlightConnectorId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setFlashId(undefined), 2500);
    return () => clearTimeout(timer);
  }, [highlightConnectorId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter(c => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="p-8 w-full animate-fade-up">
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold">Connections</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Connect services so this agent can access and act on your data.</p>
      </div>

      <div className="relative mb-6">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search connections…"
          className="h-9 w-full max-w-xs pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
        {filtered.map(meta => {
          const attached = connections.find(c => c.connectorId === meta.id);
          return (
            <ConnectionCard
              key={meta.id}
              meta={meta}
              attached={attached}
              highlighted={flashId === meta.id}
              onAdd={() => setAddingId(meta.id)}
              onEdit={() => setEditingId(meta.id)}
              onRemove={() => {
                agentConnectorStore.remove(agentId, meta.id);
                toast.success(`Connection "${meta.name}" removed.`);
                refresh();
              }}
            />
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm">No connections found.</div>
      )}

      {addingId && (
        <ScopeModal
          agentId={agentId}
          connectorId={addingId}
          onClose={() => setAddingId(null)}
          onSaved={() => { refresh(); setAddingId(null); }}
          onViewTriggers={onViewTriggers}
        />
      )}

      {editingId && (
        <ScopeModal
          agentId={agentId}
          connectorId={editingId}
          editing
          onClose={() => setEditingId(null)}
          onSaved={() => { refresh(); setEditingId(null); }}
          onViewTriggers={onViewTriggers}
        />
      )}
    </div>
  );
}
