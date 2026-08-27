import { AlertTriangle } from "lucide-react";
import { agentConnectorStore } from "./agentConnectorStore";
import { CATALOG as CONNECTOR_CATALOG } from "./ConnectionsTab";
import { toast } from "sonner";

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} và ${names[names.length - 1]}`;
}

/** Persistent, non-blocking explanation for the "agent has a per-user connection so it can't
 * have a Trigger" rule — renders as soon as the conflict exists, with a working "switch to
 * shared" action, instead of a modal that only appears on click. Used by both the right-rail
 * Triggers box and the Triggers page so the copy and the fix action can't drift. */
export default function TriggerBlockedByConnectorNotice({ agentId, onSwitched }: {
  agentId: string;
  onSwitched?: () => void;
}) {
  const personalConnectors = agentConnectorStore.list(agentId).filter(c => c.scope === "personal");
  if (personalConnectors.length === 0) return null;

  const names = personalConnectors.map(c => CONNECTOR_CATALOG.find(x => x.id === c.connectorId)?.name ?? c.connectorId);
  const nameList = joinNames(names);

  const switchToShared = () => {
    personalConnectors.forEach(c => agentConnectorStore.setScope(agentId, c.connectorId, "shared"));
    toast.success(`Đã đổi ${nameList} sang kết nối Dùng chung.`);
    onSwitched?.();
  };

  return (
    <div className="rounded-lg border border-warning/25 bg-[hsl(var(--warning-soft))] px-3.5 py-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-warning" />
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs font-semibold text-foreground">Chưa thêm được Trigger cho agent này</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Agent đang dùng kết nối Riêng cá nhân ({nameList}). Trigger chạy nền khi không có ai đăng nhập, nên không có tài khoản cá nhân nào để agent dùng.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Muốn giữ kết nối Riêng cá nhân? Mỗi người vẫn có thể tự đặt trigger trên bản agent họ cài trong Workspace.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={switchToShared}
        className="mt-2 ml-6 text-xs font-semibold text-warning hover:underline"
      >
        Đổi sang kết nối Dùng chung
      </button>
    </div>
  );
}
