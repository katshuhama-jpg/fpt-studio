import { useState } from "react";
import { Plus, Trash2, Pencil, User, Building2, X, AlertTriangle } from "lucide-react";
import { agentConnectorStore, type ConnectorScope } from "./agentConnectorStore";
import { triggerStore } from "./triggerStore";
import { CONNECTOR_BLOCKED_BY_TRIGGER_REASON } from "./agentPublishStore";
import { toast } from "sonner";

export const CATALOG = [
  { id: "gmail", name: "Gmail", logo: "G" },
  { id: "gdrive", name: "Google Drive", logo: "D" },
  { id: "sheets", name: "Google Sheets", logo: "Sh" },
  { id: "slack", name: "Slack", logo: "S" },
  { id: "notion", name: "Notion", logo: "N" },
  { id: "hubspot", name: "HubSpot", logo: "H" },
];

function AddConnectionModal({ agentId, editing, onClose, onSaved, onViewTriggers }: {
  agentId: string; editing?: { connectorId: string; scope: ConnectorScope }; onClose: () => void; onSaved: () => void; onViewTriggers?: () => void;
}) {
  const [connectorId, setConnectorId] = useState(editing?.connectorId ?? CATALOG[0].id);
  const [scope, setScope] = useState<ConnectorScope>(editing?.scope ?? "shared");

  const triggerCount = triggerStore.list(agentId).length;
  const personalBlocked = triggerCount > 0;

  const save = () => {
    // The personal option is disabled whenever this is true, so this can only be reached
    // by a stale scope value from before a trigger was added elsewhere — fall back safely.
    if (scope === "personal" && personalBlocked) { setScope("shared"); return; }
    agentConnectorStore.add(agentId, connectorId, scope);
    toast.success("Đã lưu kết nối.");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-border shadow-lg animate-fade-up">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <h3 className="font-display text-base font-semibold">{editing ? "Sửa kết nối" : "Thêm kết nối"}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ứng dụng</label>
            <select value={connectorId} onChange={e => setConnectorId(e.target.value)} disabled={!!editing} className="ds-input h-9 w-full disabled:opacity-60 disabled:cursor-not-allowed">
              {CATALOG.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => !personalBlocked && setScope("personal")}
              disabled={personalBlocked}
              className={`w-full text-left rounded-xl border px-3.5 py-3 transition-base ${
                scope === "personal" ? "border-primary bg-primary-soft/40 ring-1 ring-primary" : "border-border"
              } ${personalBlocked ? "opacity-50 cursor-not-allowed" : "hover:bg-surface-muted"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <User size={14} className="text-foreground shrink-0" />
                <span className="text-sm font-semibold">Kết nối riêng của từng người dùng</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Mỗi người dùng tự đăng nhập tài khoản của họ. Agent chạy dưới quyền của chính người đang dùng.
              </p>
            </button>
            {personalBlocked && (
              <div className="flex items-start gap-2 text-xs text-warning bg-[hsl(var(--warning-soft))] border border-warning/25 rounded-lg px-3 py-2.5">
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

            <button
              onClick={() => setScope("shared")}
              className={`w-full text-left rounded-xl border px-3.5 py-3 transition-base hover:bg-surface-muted ${
                scope === "shared" ? "border-primary bg-primary-soft/40 ring-1 ring-primary" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={14} className="text-foreground shrink-0" />
                <span className="text-sm font-semibold">Kết nối dùng chung của tổ chức</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bạn kết nối một lần. Mọi lần chạy đều dùng tài khoản này.
              </p>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Huỷ</button>
          <button onClick={save} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base">
            Lưu kết nối
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConnectionsTab({ agentId, onViewTriggers, onChange }: {
  agentId: string; onViewTriggers?: () => void; onChange?: () => void;
}) {
  const [tick, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onChange?.(); };
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  void tick;
  const connections = agentConnectorStore.list(agentId);
  const editingConnection = editingId ? connections.find(c => c.connectorId === editingId) : undefined;

  return (
    <div className="p-8 w-full animate-fade-up max-w-3xl">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">Kết nối</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tài khoản và hệ thống bên ngoài mà agent có thể dùng.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary h-9">
          <Plus size={13} /> Thêm kết nối
        </button>
      </div>

      {connections.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 py-14 px-6 text-center">
          <p className="text-sm text-muted-foreground max-w-sm">Chưa có kết nối nào. Thêm một kết nối để agent có thể thao tác trên tài khoản bên ngoài.</p>
          <button onClick={() => setShowAdd(true)} className="text-sm font-semibold text-primary hover:underline mt-1">
            + Thêm kết nối
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {connections.map(c => {
            const meta = CATALOG.find(x => x.id === c.connectorId);
            return (
              <div key={c.connectorId} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface">
                <span className="w-8 h-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-xs font-bold shrink-0">{meta?.logo ?? "?"}</span>
                <span className="text-sm font-medium flex-1 truncate">{meta?.name ?? c.connectorId}</span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                  style={c.scope === "shared" ? { background: "#EEF2FF", color: "#4338CA", border: "0.5px solid #C7D2FE" } : { background: "#ECFDF5", color: "#047857", border: "0.5px solid #A7F3D0" }}
                >
                  {c.scope === "shared" ? "Dùng chung" : "Riêng cá nhân"}
                </span>
                <button
                  onClick={() => setEditingId(c.connectorId)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base shrink-0"
                  aria-label="Sửa kết nối"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => {
                    agentConnectorStore.remove(agentId, c.connectorId);
                    toast.success(`Đã gỡ kết nối "${meta?.name ?? c.connectorId}".`);
                    refresh();
                  }}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-surface-muted transition-base shrink-0"
                  aria-label="Gỡ kết nối"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddConnectionModal
          agentId={agentId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { refresh(); setShowAdd(false); }}
          onViewTriggers={onViewTriggers}
        />
      )}

      {editingConnection && (
        <AddConnectionModal
          agentId={agentId}
          editing={{ connectorId: editingConnection.connectorId, scope: editingConnection.scope }}
          onClose={() => setEditingId(null)}
          onSaved={() => { refresh(); setEditingId(null); }}
          onViewTriggers={onViewTriggers}
        />
      )}
    </div>
  );
}
