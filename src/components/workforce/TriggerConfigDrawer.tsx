import { useMemo, useState } from "react";
import { X, Zap, Trash2, Plus, Pencil, Clock, Webhook, Globe, MessageSquare } from "lucide-react";
import { useReturnFocusOnUnmount } from "./useReturnFocus";
import { AGENTS } from "@/components/configure/agentStore";
import { triggerStore, triggerNeedsSetup, type TriggerRecord, type TriggerType } from "@/components/configure/triggerStore";
import TriggerFormDialog from "@/components/configure/TriggerFormDialog";
import AppLogo from "@/components/configure/AppLogo";

const TYPE_META: Record<TriggerType, { label: string; icon: typeof Clock }> = {
  manual: { label: "Chạy thủ công", icon: MessageSquare },
  scheduled: { label: "Lịch", icon: Clock },
  developer: { label: "Webhook", icon: Webhook },
  external: { label: "Ứng dụng bên ngoài", icon: Globe },
};

/** Picks a real trigger (from triggerStore, scoped to whichever Agent this node connects to)
 * rather than the free label/description text this drawer used to edit — same catalog the
 * target Agent's own Builder → Triggers tab reads and writes (S-gap-3), so a trigger created or
 * edited from either place shows up correctly in both. */
export default function TriggerConfigDrawer({
  agentId, triggerId, onSelectTrigger, onClose, onDelete,
}: {
  agentId: string | null;
  triggerId: string | null;
  onSelectTrigger: (triggerId: string) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  useReturnFocusOnUnmount();
  const [tick, setTick] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TriggerRecord | null>(null);

  const agent = agentId ? AGENTS.find(a => a.id === agentId) : undefined;
  const triggers = useMemo(() => {
    void tick;
    return agentId ? triggerStore.list(agentId) : [];
  }, [agentId, tick]);
  const refresh = () => setTick(t => t + 1);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (t: TriggerRecord) => { setEditTarget(t); setFormOpen(true); };

  return (
    <aside className="fixed right-0 top-24 bottom-0 w-[420px] border-l border-border bg-surface shadow-2xl z-20 flex flex-col animate-fade-up">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--wf-trigger-bg)", color: "var(--wf-trigger)" }}>
          <Zap size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">Trigger</div>
        </div>
        <button onClick={onDelete} aria-label="Xóa node" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Trash2 size={14} />
        </button>
        <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!agentId ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-muted/60 p-5 text-center">
            <div className="w-11 h-11 mx-auto rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-3">
              <Zap size={18} />
            </div>
            <p className="text-sm font-medium mb-1">Chưa kết nối tới Agent</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kéo một đường nối từ Trigger này sang một Agent để chọn trigger thật của Agent đó — trigger được cấu hình theo từng Agent, giống như ở trang Agent Builder.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-surface-muted">
              <span className="text-xs text-muted-foreground shrink-0">Trigger cho Agent</span>
              <span className="text-xs font-semibold truncate">{agent?.name ?? agentId}</span>
            </div>

            {triggers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center mb-3">
                <p className="text-sm font-medium mb-1">Agent này chưa có trigger nào</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tạo trigger đầu tiên — theo lịch, webhook, hoặc sự kiện từ ứng dụng bên ngoài.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 mb-3">
                {triggers.map(t => {
                  const meta = TYPE_META[t.type];
                  const Icon = meta.icon;
                  const selected = t.id === triggerId;
                  const needsSetup = triggerNeedsSetup(t);
                  return (
                    <div
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectTrigger(t.id)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectTrigger(t.id); } }}
                      className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-border/60 flex items-center justify-center shrink-0 overflow-hidden">
                        {t.type === "external" && t.config.external
                          ? <AppLogo app={t.config.external.app} size={32} />
                          : <Icon size={14} className="text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {meta.label}{needsSetup ? " · Cần cấu hình" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); openEdit(t); }}
                        aria-label={`Chỉnh sửa trigger ${t.name}`}
                        className="w-7 h-7 min-w-[44px] min-h-[44px] -m-2 rounded-md flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-surface hover:text-foreground transition-base shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:opacity-100"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={openCreate}
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus size={13} /> Tạo trigger mới
            </button>

            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Trigger là điểm bắt đầu của Workforce này — dùng chung danh sách trigger với trang Agent Builder của {agent?.name ?? "agent này"}. Chọn hoặc tạo một trigger để Workforce có thể chạy.
            </p>
          </>
        )}
      </div>

      {agentId && (
        <TriggerFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          mode={editTarget ? "edit" : "create"}
          agentId={agentId}
          trigger={editTarget ?? undefined}
          onSubmitted={rec => { refresh(); onSelectTrigger(rec.id); }}
        />
      )}
    </aside>
  );
}
