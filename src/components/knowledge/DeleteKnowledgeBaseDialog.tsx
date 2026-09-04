import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { knowledgeBaseStore, type KnowledgeBase } from "./knowledgeBaseStore";
import { getAgent } from "@/components/configure/agentStore";

export default function DeleteKnowledgeBaseDialog({
  open, onClose, kb, onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  kb: KnowledgeBase;
  onDeleted?: () => void;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === kb.name;
  const attachedAgentNames = kb.attachedByAgentIds.map(id => getAgent(id).name);

  const confirmDelete = () => {
    if (!matches) return;
    knowledgeBaseStore.remove(kb.id);
    onClose();
    onDeleted?.();
    toast.success(`Đã xóa kho tri thức "${kb.name}".`, {
      action: { label: "Hoàn tác", onClick: () => { /* undo not persisted across the 10s window in this prototype */ } },
      duration: 10_000,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setTyped(""); onClose(); } }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Xóa kho tri thức?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kho tri thức "{kb.name}" cùng toàn bộ tài liệu, URL, FAQ và chunk bên trong sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
          </p>

          {attachedAgentNames.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-[hsl(var(--destructive-soft))] px-3.5 py-3">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-destructive" />
              <p className="text-xs text-destructive leading-relaxed">
                {attachedAgentNames.length} Agent đang dùng kho tri thức này và sẽ mất nguồn tra cứu: {attachedAgentNames.join(", ")}.
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">Nhập tên kho tri thức để xác nhận</label>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={kb.name}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/20 transition-base"
            />
          </div>
        </div>

        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-base">Hủy bỏ</button>
          <button
            onClick={confirmDelete}
            disabled={!matches}
            className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-medium transition-base disabled:opacity-40 disabled:pointer-events-none"
          >
            Xác nhận và xóa
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
