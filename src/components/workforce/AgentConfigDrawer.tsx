import { X, ExternalLink, Trash2 } from "lucide-react";
import { AGENTS } from "@/components/configure/agentStore";
import Toggle from "./Toggle";
import { useReturnFocusOnUnmount } from "./useReturnFocus";
import FlowControlSection from "./FlowControlSection";
import OutputFieldsList from "./OutputFieldsList";
import type { FlowControl } from "./types";

export default function AgentConfigDrawer({
  agentId, isDestination, keepContext, onChangeKeepContext, onClose, onDelete, flow, outCount, inCount, onChangeFlow,
}: {
  flow: FlowControl;
  outCount: number;
  inCount: number;
  onChangeFlow: (patch: FlowControl) => void;
  agentId: string;
  isDestination: boolean;
  keepContext: boolean;
  onChangeKeepContext: (value: boolean) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  useReturnFocusOnUnmount();
  const agent = AGENTS.find(a => a.id === agentId);

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-[420px] border-l border-border bg-surface shadow-2xl z-20 flex flex-col animate-fade-up">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-base shrink-0 ${agent?.bg ?? "bg-surface-muted"}`}>
          {agent?.emoji ?? "🤖"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">{agent?.name ?? "Nhân sự số"}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{agent?.kind === "process" ? "Nhân sự số · Quy trình" : "Nhân sự số"}</div>
        </div>
        <button onClick={onDelete} aria-label="Xóa node" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">
          <Trash2 size={14} />
        </button>
        <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-xs text-muted-foreground mb-3">{agent?.desc}</p>
        <a
          href={`/agents/${agentId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base mb-4"
        >
          <ExternalLink size={12} /> {agent?.kind === "process" ? "Mở Quy trình" : "Mở Nhân sự số"}
        </a>

        {isDestination ? (
          <div className="pt-4 border-t border-border">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bối cảnh chuyển giao</div>
            <Toggle
              checked={keepContext}
              onChange={onChangeKeepContext}
              label="Giữ ngữ cảnh hội thoại"
            />
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {keepContext
                ? "Bật: Nhân sự số đích nhận toàn bộ lịch sử hội thoại trước đó để tiếp tục xử lý liền mạch."
                : "Tắt: Nhân sự số đích bắt đầu một phiên hoàn toàn mới, không có lịch sử trước đó."}
            </p>
          </div>
        ) : (
          null
        )}
        {agent?.kind === "process" && (
          <p className="text-xs leading-relaxed rounded-lg bg-surface-muted px-3 py-2 mt-3">Bước này chạy tất định theo Quy trình đã publish - không dùng LLM để chấm điểm hay tính tiền. Cùng hồ sơ luôn ra cùng kết quả.</p>
        )}
        <OutputFieldsList fields={agent?.outputs ?? []} />
        <FlowControlSection value={flow} outCount={outCount} inCount={inCount} onChange={onChangeFlow} />
      </div>
    </aside>
  );
}
