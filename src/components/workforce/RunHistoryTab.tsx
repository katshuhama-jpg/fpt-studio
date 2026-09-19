import { useNavigate } from "react-router-dom";
import { Zap, FlaskConical, CheckCircle2, Square, TriangleAlert, Waypoints, XCircle } from "lucide-react";
import type { WorkforceRunRecord } from "./runHistoryStore";

const STATUS_META: Record<WorkforceRunRecord["status"], { label: string; icon: typeof CheckCircle2; bg: string; ink: string }> = {
  success: { label: "Thành công", icon: CheckCircle2, bg: "var(--wf-pub-bg)", ink: "var(--wf-pub-ink)" },
  stopped: { label: "Đã dừng", icon: Square, bg: "var(--wf-bg)", ink: "var(--wf-muted)" },
  error: { label: "Lỗi", icon: TriangleAlert, bg: "#FDECEC", ink: "#C0362C" },
  rejected: { label: "Bị từ chối", icon: XCircle, bg: "#FDECEC", ink: "#C0362C" },
};

function fmtDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "Lịch sử chạy" — one row per completed run of this Workforce, real "Chạy thử" sessions this
 * browser tab has recorded (WorkforceCanvasPage calls `runHistoryStore.record()` the moment a
 * run finishes) plus a few seeded past runs so the tab isn't empty on first load (S-gap-8,
 * Observability). Same table shell as Agent's own History tab (`HistoryTab.tsx`) — source,
 * time, duration, status, a "Xem trace" link to the per-run detail page — scoped to run
 * sessions instead of conversations. */
export default function RunHistoryTab({ workforceId, runs }: { workforceId: string; runs: WorkforceRunRecord[] }) {
  const navigate = useNavigate();

  if (runs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className="text-center max-w-md"
          style={{ borderRadius: "var(--wf-radius)", border: "1px dashed var(--wf-border)", background: "var(--wf-surface)", padding: "40px 32px" }}
        >
          <h3 className="text-[15px] font-bold mb-1.5 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>Chưa có phiên chạy nào</h3>
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>
            Mỗi lần bấm "Chạy thử" hoặc Workforce này tự chạy qua Trigger, phiên chạy sẽ xuất hiện ở đây kèm đường đi qua từng node.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div style={{ borderRadius: "var(--wf-radius-sm)", border: "1px solid var(--wf-border)", overflow: "hidden", background: "var(--wf-surface)" }}>
        <div
          className="grid grid-cols-[110px,190px,90px,130px,70px,1fr,90px] gap-4 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wide"
          style={{ background: "var(--wf-bg)", color: "var(--wf-muted)", borderBottom: "1px solid var(--wf-border)", fontFamily: "var(--wf-font-display)" }}
        >
          <div>Nguồn</div>
          <div>Bắt đầu</div>
          <div>Thời lượng</div>
          <div>Trạng thái</div>
          <div>Bước</div>
          <div>Ghi chú</div>
          <div></div>
        </div>
        {runs.map(r => {
          const meta = STATUS_META[r.status];
          const StatusIcon = meta.icon;
          const SourceIcon = r.source === "trigger" ? Zap : FlaskConical;
          return (
            <div
              key={r.id}
              className="grid grid-cols-[110px,190px,90px,130px,70px,1fr,90px] gap-4 px-4 py-3 items-center"
              style={{ borderBottom: "1px solid var(--wf-border)" }}
            >
              <span
                className="inline-flex items-center gap-1.5 w-fit text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: r.source === "trigger" ? "var(--wf-trigger-bg)" : "var(--wf-accent-bg)",
                  color: r.source === "trigger" ? "var(--wf-trigger)" : "var(--wf-accent)",
                }}
              >
                <SourceIcon size={11} /> {r.source === "trigger" ? "Trigger" : "Chạy thử"}
              </span>
              <span className="text-[12.5px]" style={{ color: "var(--wf-text)", fontFamily: "var(--wf-font-body)" }}>{fmtTime(r.startedAt)}</span>
              <span className="text-[12.5px] tabular-nums" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>{fmtDuration(r.endedAt - r.startedAt)}</span>
              <span className="inline-flex items-center gap-1.5 w-fit text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.ink }}>
                <StatusIcon size={11} /> {meta.label}
              </span>
              <span className="text-[12.5px] tabular-nums" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>{r.steps.length}</span>
              <span className="text-[12px] truncate" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }} title={r.errorReason ?? r.contextMessage ?? undefined}>
                {r.errorReason ?? r.contextMessage ?? "—"}
              </span>
              <button
                type="button"
                onClick={() => navigate(`/workforce/${workforceId}/trace/${r.id}`)}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold transition-base hover:opacity-75 justify-self-start min-h-[32px]"
                style={{ color: "var(--wf-accent)", fontFamily: "var(--wf-font-display)" }}
              >
                <Waypoints size={13} /> Xem trace
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
