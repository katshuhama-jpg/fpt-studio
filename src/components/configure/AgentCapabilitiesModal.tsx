import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CircleArrowReload01Icon } from "@hugeicons/core-free-icons";
import { Switch } from "@/components/ui/switch";
import { useSearchParams } from "react-router-dom";
import { agentCapabilityStore } from "./agentCapabilityStore";
import { handoffStore, channelName } from "./handoffStore";

/** Full editor for the agent's default capabilities. Lives in a dialog rather than inline in
 * the config rail because each of the nine needs a description (and some a condition note) to
 * be decidable — too much for a 476px sidebar, where the rail instead shows just the on/total
 * count. Each capability is its own full-width bordered row rather than a multi-column grid
 * or one box split by divider rules, so the eye runs straight down the switches on the right.
 * Toggling writes straight through to the store, but the footer still tracks a local "dirty"
 * flag so the primary button only turns into an active Save (with a confirming toast) once
 * something actually changed this time round — closing untouched is just closing. */
export default function AgentCapabilitiesModal({ agentId, onClose, onChanged }: {
  agentId: string;
  onClose: () => void;
  /** Fired after every change so the config rail's count stays in step. */
  onChanged: () => void;
}) {
  const [tick, setTick] = useState(0);
  void tick;
  const [dirty, setDirty] = useState(false);
  const capabilities = agentCapabilityStore.list();
  const onCount = agentCapabilityStore.onCount(agentId);
  const atDefault = agentCapabilityStore.isAtDefault(agentId);

  const refresh = () => { setTick(t => t + 1); onChanged(); };

  const handleSave = () => {
    if (dirty) toast.success("Đã lưu thay đổi.");
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-card rounded-lg border shadow-sm flex flex-col max-h-[85vh] animate-fade-up">
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Khả năng của Nhân sự số</h2>
              <span className="text-xs font-medium tabular-nums rounded-sm px-1.5 py-0.5 bg-muted text-muted-foreground">
                {onCount}/{capabilities.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bật/tắt các năng lực mặc định của Nhân sự số này.
            </p>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors shrink-0">
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2.5">
            <HandoffCapabilityRow agentId={agentId} onChange={() => { setDirty(true); refresh(); }} onOpenChannels={onClose} />
            {capabilities.map(cap => {
              const on = agentCapabilityStore.isOn(agentId, cap.id);
              return (
                <div key={cap.id} className="flex items-start gap-4 rounded-md border p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${on ? "" : "text-muted-foreground"}`}>{cap.name}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{cap.description}</p>
                  </div>
                  <Switch
                    checked={on}
                    onCheckedChange={v => { agentCapabilityStore.setOn(agentId, cap.id, v); setDirty(true); refresh(); }}
                    aria-label={`${on ? "Tắt" : "Bật"} ${cap.name}`}
                    className="shrink-0 mt-0.5"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t shrink-0">
          <button
            onClick={() => {
              agentCapabilityStore.restoreDefaults(agentId);
              setDirty(true);
              toast.success("Đã bật lại toàn bộ năng lực mặc định.");
              refresh();
            }}
            disabled={atDefault}
            title={atDefault ? "Toàn bộ năng lực đang bật." : undefined}
            className="h-9 px-4 rounded-md border bg-transparent hover:bg-muted text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <HugeiconsIcon icon={CircleArrowReload01Icon} size={14} /> Khôi phục mặc định
          </button>
          <button
            onClick={handleSave}
            className="h-9 px-5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            {dirty ? "Lưu thay đổi" : "Xong"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** "Chuyển cho nhân viên" (Mới) — off by default, unlike the nine above. Shows where handoff is
 * active and links to Kênh triển khai, where the Contact Center and per-channel switches live. */
function HandoffCapabilityRow({ agentId, onChange, onOpenChannels }: { agentId: string; onChange: () => void; onOpenChannels: () => void }) {
  const [, setParams] = useSearchParams();
  const on = handoffStore.capabilityOn(agentId);
  const conn = handoffStore.connection(agentId);
  const active = handoffStore.activeChannels(agentId);
  const status = active.length && conn
    ? `Đang hoạt động trên: ${active.map(channelName).join(", ")} (EOS Contact Center)`
    : conn ? "Đã liên kết EOS Contact Center theo tài khoản của bạn, chưa bật kênh nào." : "Tài khoản của bạn chưa có EOS Contact Center.";
  return (
    <div className="flex items-start gap-4 rounded-md border p-3.5">
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium flex items-center gap-2 ${on ? "" : "text-muted-foreground"}`}>
          Chuyển cho nhân viên
          <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">Mới</span>
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">Cho phép Nhân sự số chuyển hội thoại cho nhân viên CSKH trên Contact Center khi không xử lý tiếp được hoặc khách muốn gặp người thật.</p>
        <p className="text-xs text-muted-foreground mt-1.5">
          {status}{" "}
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => { onOpenChannels(); setParams({ tab: "channels", ctab: "external" }); }}>Mở Kênh triển khai</button>
        </p>
        {!on && active.length > 0 && (
          <p className="text-xs text-warning mt-1">Còn {active.length} kênh đang bật chuyển cho nhân viên — sẽ có cảnh báo khi Publish.</p>
        )}
      </div>
      <Switch
        checked={on}
        onCheckedChange={v => { handoffStore.setCapability(agentId, v); onChange(); }}
        aria-label={`${on ? "Tắt" : "Bật"} Chuyển cho nhân viên`}
        className="shrink-0 mt-0.5"
      />
    </div>
  );
}
