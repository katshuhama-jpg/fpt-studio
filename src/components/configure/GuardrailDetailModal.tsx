import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import type { Guardrail } from "./guardrailConsoleStore";

/** Compact read-only "Chi tiết guardrail" summary opened from Row Menu "Mở" (Console list) and
 * from an Agent's linked-guardrail "Mở guardrail" row — Chủ đề / Mô tả / Phản hồi only, with an
 * optional "Sửa" shortcut straight into CreateGuardrailModal's edit form when the viewer is
 * allowed to. Distinct from CreateGuardrailModal's own `readOnly` mode, which renders the full
 * create-form field set (Samples, sharing, etc.) — this is the lightweight detail view. */
export default function GuardrailDetailModal({ guardrail, onClose, onEdit }: {
  guardrail: Guardrail;
  onClose: () => void;
  /** Omit to hide "Sửa" entirely — e.g. when the viewer has no edit access to this guardrail. */
  onEdit?: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <h2 className="font-display text-lg font-semibold">Chi tiết guardrail</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base mt-0.5">
            <HugeiconsIcon icon={Cancel01Icon} size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Chủ đề</p>
            <p className="text-sm font-medium text-foreground">{guardrail.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Mô tả</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{guardrail.desc || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Phản hồi</p>
            <span className="inline-flex px-2.5 py-1 rounded-full border border-border bg-surface-muted text-sm text-foreground">
              {guardrail.action}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0 bg-white">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">
            Đóng
          </button>
          {onEdit && (
            <button onClick={onEdit} className="h-9 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base">
              Sửa
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes fadeScaleIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }`}</style>
    </div>,
    document.body
  );
}
