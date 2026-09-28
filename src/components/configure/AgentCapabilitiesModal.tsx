import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CircleArrowReload01Icon } from "@hugeicons/core-free-icons";
import { Switch } from "@/components/ui/switch";
import { agentCapabilityStore } from "./agentCapabilityStore";

/** Full editor for the agent's default capabilities. Lives in a dialog rather than inline in
 * the config rail because each of the nine needs a description (and some a condition note) to
 * be decidable — too much for a 476px sidebar, where the rail instead shows just the on/total
 * count. Each capability is its own full-width bordered row rather than a multi-column grid
 * or one box split by divider rules, so the eye runs straight down the switches on the right.
 * Changes are written straight through, so there's nothing to save. */
export default function AgentCapabilitiesModal({ agentId, onClose, onChanged }: {
  agentId: string;
  onClose: () => void;
  /** Fired after every change so the config rail's count stays in step. */
  onChanged: () => void;
}) {
  const [tick, setTick] = useState(0);
  void tick;
  const capabilities = agentCapabilityStore.list();
  const onCount = agentCapabilityStore.onCount(agentId);
  const atDefault = agentCapabilityStore.isAtDefault(agentId);

  const refresh = () => { setTick(t => t + 1); onChanged(); };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-card rounded-lg border shadow-sm flex flex-col max-h-[85vh] animate-fade-up">
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Agent capabilities</h2>
              <span className="text-xs font-medium tabular-nums rounded-sm px-1.5 py-0.5 bg-muted text-muted-foreground">
                {onCount}/{capabilities.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bật/tắt các năng lực mặc định của Agent này.
            </p>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors shrink-0">
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2.5">
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
                    onCheckedChange={v => { agentCapabilityStore.setOn(agentId, cap.id, v); refresh(); }}
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
            onClick={onClose}
            className="h-9 px-5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            Xong
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
