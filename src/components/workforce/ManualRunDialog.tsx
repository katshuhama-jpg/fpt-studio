import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Play, Info, ChevronDown } from "lucide-react";

export interface ManualRunTriggerOption {
  nodeId: string;
  name: string;
  agentName: string;
  instructions?: string;
}

/** "Chạy Workforce" — the real entry point a business user has to start this Workforce by hand,
 * parallel to (and reusing the same run-trace visualization as) "Chạy thử", which is a
 * builder-only test tool. Mirrors Relevance AI's "New task" page, reached from its default
 * "User message received" Trigger: shows that trigger's own "Guide for using workforce" text,
 * then takes a free-text request before handing off to the run.
 *
 * Styled from the wf-slate canvas system's own tokens (--wf-*) rather than the app's generic
 * shadcn Dialog look — this is reached from the canvas toolbar, right next to node cards and
 * drawers that already read as crisp/high-contrast, so a washed-out generic modal here stood
 * out as the one under-designed surface in the flow.
 *
 * Only ever opened with at least one option (WorkforceCanvasPage gates the toolbar button on
 * that), so `options` is never empty while `open` is true. */
export default function ManualRunDialog({
  open, options, onStart, onClose,
}: {
  open: boolean;
  options: ManualRunTriggerOption[];
  onStart: (nodeId: string, message: string) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");

  // Re-seed the picker to the first option and clear any previous message every time the dialog
  // is (re)opened — not on every options change, so mid-canvas edits elsewhere don't reset what
  // the user is mid-way through typing while this happens to already be open.
  useEffect(() => {
    if (open) { setSelectedId(options[0]?.nodeId ?? ""); setMessage(""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = options.find(o => o.nodeId === selectedId) ?? options[0];

  const start = () => {
    if (!selected) return;
    onStart(selected.nodeId, message.trim());
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className="sm:max-w-[440px] p-0 gap-0 border-0 shadow-none overflow-hidden [font-family:var(--wf-font-body)]"
        style={{
          borderRadius: "var(--wf-radius)",
          background: "var(--wf-surface)",
          border: "1px solid var(--wf-border)",
          boxShadow: "var(--wf-node-shadow-selected)",
        }}
      >
        {/* Header mirrors the icon-chip + title pattern every node config drawer already uses
            (TriggerConfigDrawer, OmniConfigDrawer, …) — tinted in the Trigger's own accent
            color since this action only ever fires through a manual Trigger. */}
        <div className="flex items-center gap-2.5 px-5 h-14 shrink-0" style={{ borderBottom: "1px solid var(--wf-border)" }}>
          <div
            className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
            style={{ background: "var(--wf-trigger-bg)", color: "var(--wf-trigger)" }}
          >
            <MessageSquare size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-tight [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>
              Chạy Workforce
            </p>
            <p className="text-[12px] leading-tight mt-0.5" style={{ color: "var(--wf-muted)" }}>
              Bắt đầu một lượt chạy thật, ngay bây giờ
            </p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3.5">
          {options.length > 1 && (
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--wf-text)" }}>
                Bắt đầu từ Trigger nào?
              </label>
              <div className="relative">
                <select
                  value={selected?.nodeId}
                  onChange={e => setSelectedId(e.target.value)}
                  className="w-full h-10 pl-3 pr-9 rounded-[8px] text-sm outline-none appearance-none transition-base"
                  style={{ background: "var(--wf-surface)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
                >
                  {options.map(o => (
                    <option key={o.nodeId} value={o.nodeId}>{o.name} — {o.agentName}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--wf-muted)" }} />
              </div>
            </div>
          )}

          {selected?.instructions && (
            <div
              className="flex items-start gap-2 rounded-[8px] p-2.5"
              style={{ background: "var(--wf-trigger-bg)" }}
            >
              <Info size={14} className="shrink-0 mt-[1px]" style={{ color: "var(--wf-trigger)" }} />
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--wf-trigger)" }}>
                  Hướng dẫn sử dụng
                </p>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--wf-text)" }}>
                  {selected.instructions}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--wf-text)" }}>
              Yêu cầu của bạn
            </label>
            <textarea
              autoFocus
              value={message}
              rows={3}
              onChange={e => setMessage(e.target.value)}
              placeholder="Mô tả yêu cầu của bạn — Workforce sẽ bắt đầu chạy từ đây."
              className="w-full px-3 py-2.5 rounded-[8px] text-sm outline-none resize-none transition-base placeholder:opacity-60"
              style={{ background: "var(--wf-surface)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--wf-accent)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--wf-border)"; }}
            />
          </div>
        </div>

        <DialogFooter className="px-5 py-3.5 m-0" style={{ borderTop: "1px solid var(--wf-border)", background: "var(--wf-bg)" }}>
          <button onClick={onClose} className="wf-btn-sec">Hủy bỏ</button>
          <button
            onClick={start}
            disabled={!selected}
            className="wf-btn-pri flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Play size={12} fill="currentColor" /> Bắt đầu
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
