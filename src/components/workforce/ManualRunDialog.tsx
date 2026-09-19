import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Play, Info } from "lucide-react";

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
 * Styled from the wf-slate canvas system's own tokens (--wf-*), tuned "bolder" than a plain
 * settings dialog since this is the actual moment a real run starts: a gradient wash + glowing
 * icon chip tinted in the Trigger's own accent color, and Trigger selection as a segmented
 * control rather than a plain <select>. The footer intentionally stays on the shared wf-btn-sec /
 * wf-btn-pri button system rather than a one-off pill/glow CTA, so it reads as the same "Hủy bỏ" /
 * primary-action pairing every other drawer and dialog on the canvas already uses.
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
        className="sm:max-w-[400px] p-0 gap-0 border-0 shadow-none overflow-hidden [font-family:var(--wf-font-body)]"
        style={{
          borderRadius: 18,
          background: "var(--wf-surface)",
          border: "1px solid var(--wf-border)",
          boxShadow: "0 24px 60px -10px rgba(194, 86, 15, 0.18), 0 6px 14px -2px rgba(13, 22, 47, 0.06)",
        }}
      >
        {/* Header: gradient wash tinted in the Trigger's own accent color, with a glowing icon
            chip — the one part of the feature meant to feel a step more "arrived" than a plain
            settings dialog. */}
        <div
          className="px-[22px] pt-[22px] pb-4"
          style={{ background: "linear-gradient(150deg, var(--wf-trigger-bg) 0%, var(--wf-surface) 78%)" }}
        >
          <div
            className="w-[42px] h-[42px] rounded-[13px] flex items-center justify-center mb-3"
            style={{ background: "var(--wf-trigger)", color: "#FFFFFF", boxShadow: "0 8px 18px -4px rgba(194, 86, 15, 0.45)" }}
          >
            <MessageSquare size={20} />
          </div>
          <h3 className="text-[18px] font-extrabold leading-tight tracking-tight [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>
            Chạy Workforce
          </h3>
          <p className="text-[12.5px] mt-1" style={{ color: "var(--wf-muted)" }}>
            Gõ yêu cầu — Workforce chạy thật ngay lập tức
          </p>
        </div>

        <div className="px-[22px] pt-1 pb-1 space-y-3.5">
          {options.length > 1 && (
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 mb-2" style={{ color: "var(--wf-muted)" }}>
                <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: "var(--wf-trigger)" }} />
                Bắt đầu từ Trigger nào?
              </label>
              <div className="flex flex-wrap gap-1.5 p-1 rounded-[11px]" style={{ background: "var(--wf-bg)", border: "1px solid var(--wf-border)" }}>
                {options.map(o => {
                  const on = o.nodeId === selected?.nodeId;
                  return (
                    <button
                      key={o.nodeId}
                      type="button"
                      onClick={() => setSelectedId(o.nodeId)}
                      aria-pressed={on}
                      title={`${o.name} — ${o.agentName}`}
                      className="text-[12px] font-bold rounded-[8px] transition-base"
                      style={{
                        padding: "9px 12px",
                        color: on ? "var(--wf-text)" : "var(--wf-muted)",
                        background: on ? "var(--wf-surface)" : "transparent",
                        boxShadow: on ? "var(--wf-node-shadow)" : "none",
                      }}
                    >
                      {o.name}
                    </button>
                  );
                })}
              </div>
              {selected && (
                <p className="text-[11.5px] mt-1.5" style={{ color: "var(--wf-muted)" }}>
                  → Agent: <span style={{ color: "var(--wf-text)", fontWeight: 600 }}>{selected.agentName}</span>
                </p>
              )}
            </div>
          )}

          {selected?.instructions && (
            <div className="rounded-[12px] p-3" style={{ background: "#FFF9F3", border: "1px dashed #E7B389" }}>
              <p className="text-[10.5px] font-extrabold uppercase tracking-wide mb-1 flex items-center gap-1.5" style={{ color: "var(--wf-trigger)" }}>
                <Info size={12} /> Hướng dẫn sử dụng
              </p>
              <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "#7A3B10" }}>
                {selected.instructions}
              </p>
            </div>
          )}

          <div>
            <label className="text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 mb-2" style={{ color: "var(--wf-muted)" }}>
              <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: "var(--wf-trigger)" }} />
              Yêu cầu của bạn
            </label>
            <textarea
              autoFocus
              value={message}
              rows={3}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); start(); }
              }}
              placeholder="Mô tả yêu cầu của bạn — Workforce sẽ bắt đầu chạy từ đây."
              className="w-full px-3.5 py-3 rounded-[12px] text-sm outline-none resize-none transition-base placeholder:opacity-60"
              style={{ background: "var(--wf-surface)", border: "1.5px solid var(--wf-accent)", color: "var(--wf-text)", boxShadow: "0 0 0 4px rgba(70, 80, 214, 0.10)" }}
            />
          </div>
        </div>

        {/* Footer stays on the shared wf-btn-sec / wf-btn-pri system — same pairing every other
            drawer/dialog on the canvas uses — rather than a one-off CTA style. */}
        <DialogFooter className="px-[22px] py-3.5 m-0 flex items-center gap-2" style={{ borderTop: "1px solid var(--wf-border)", background: "var(--wf-bg)" }}>
          <span className="text-[11px] mr-auto hidden sm:inline-flex items-center gap-1" style={{ color: "var(--wf-muted)" }}>
            Gửi nhanh:
            <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: "var(--wf-surface)", border: "1px solid var(--wf-border)" }}>⌘</kbd>
            +
            <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: "var(--wf-surface)", border: "1px solid var(--wf-border)" }}>Enter</kbd>
          </span>
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
