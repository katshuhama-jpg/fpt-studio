import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { knowledgeBaseStore } from "./knowledgeBaseStore";
import { knowledgeStore } from "./knowledgeStore";

export default function AttachConsoleKnowledgeBaseModal({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const alreadyLinked = new Set(knowledgeStore.listAttachedConsoleKbIds(agentId));
  const all = knowledgeBaseStore.list();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    if (alreadyLinked.has(id)) return;
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const submit = () => {
    for (const id of selected) knowledgeStore.attachConsoleKb(agentId, id);
    toast.success(selected.size === 1 ? "Đã liên kết kho tri thức." : `Đã liên kết ${selected.size} kho tri thức.`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Liên kết kho tri thức</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Agent sẽ tra cứu trực tiếp từ kho tri thức Console — nội dung không được sao chép.</p>

        {all.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Không có kho tri thức nào để liên kết.</p>
        ) : (
          <div className="space-y-1.5 py-1">
            {all.map(kb => {
              const linked = alreadyLinked.has(kb.id);
              const row = (
                <label
                  key={kb.id}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border transition-base ${
                    linked ? "opacity-60 cursor-not-allowed" : "hover:bg-surface-muted/50 cursor-pointer"
                  }`}
                >
                  <input type="checkbox" checked={linked || selected.has(kb.id)} disabled={linked} onChange={() => toggle(kb.id)} className="w-4 h-4 accent-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{kb.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{kb.ownerName} · {kb.stats.docs} tài liệu · {kb.stats.urls} URL · {kb.stats.chunks} chunk</div>
                  </div>
                </label>
              );
              return linked ? (
                <Tooltip key={kb.id} delayDuration={200}>
                  <TooltipTrigger asChild><div>{row}</div></TooltipTrigger>
                  <TooltipContent>Đã liên kết</TooltipContent>
                </Tooltip>
              ) : row;
            })}
          </div>
        )}

        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} disabled={selected.size === 0} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Liên kết</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
