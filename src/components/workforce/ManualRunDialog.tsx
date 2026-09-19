import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Play } from "lucide-react";

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
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader><DialogTitle className="font-display">Chạy Workforce</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          {options.length > 1 && (
            <div>
              <label className="text-xs font-medium mb-1.5 block">Bắt đầu từ Trigger nào?</label>
              <select value={selected?.nodeId} onChange={e => setSelectedId(e.target.value)} className="ds-input h-9 w-full">
                {options.map(o => (
                  <option key={o.nodeId} value={o.nodeId}>{o.name} — {o.agentName}</option>
                ))}
              </select>
            </div>
          )}

          {selected?.instructions && (
            <div className="rounded-lg border border-border bg-surface-muted/60 p-3">
              <p className="text-[11px] font-semibold text-muted-foreground mb-1">Hướng dẫn sử dụng</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.instructions}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block">Yêu cầu của bạn</label>
            <textarea
              autoFocus
              value={message}
              rows={3}
              onChange={e => setMessage(e.target.value)}
              placeholder="Mô tả yêu cầu của bạn — Workforce sẽ bắt đầu chạy từ đây."
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none resize-none transition-base focus:border-primary"
            />
          </div>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button
            onClick={start}
            disabled={!selected}
            className="btn-primary h-9 flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Play size={13} fill="currentColor" /> Bắt đầu
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
