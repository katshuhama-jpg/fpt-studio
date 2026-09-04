import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { knowledgeBaseStore, CURRENT_USER } from "./knowledgeBaseStore";
import { knowledgeStore } from "./knowledgeStore";

export default function AttachConsoleKnowledgeBaseModal({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const alreadyLinked = new Set(knowledgeStore.listAttachedConsoleKbIds(agentId));
  const all = knowledgeBaseStore.list();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const toggle = (id: string) => {
    if (alreadyLinked.has(id)) return;
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const submit = () => {
    for (const id of selected) knowledgeStore.attachConsoleKb(agentId, id);
    toast.success(selected.size === 1 ? "Đã liên kết kho tri thức." : `Đã liên kết ${selected.size} kho tri thức.`);
    onClose();
  };

  const q = debouncedQuery.trim().toLowerCase();
  // Keep already-selected rows visible regardless of the filter, so filtering never hides
  // a choice the user already made.
  const visible = all.filter(kb =>
    selected.has(kb.id) ||
    !q ||
    kb.name.toLowerCase().includes(q) ||
    kb.description.toLowerCase().includes(q),
  );

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
          <>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tìm kho tri thức..."
                className="h-9 w-full pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <p className="text-xs text-muted-foreground">Đã chọn {selected.size} kho tri thức</p>

            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Không tìm thấy kho tri thức phù hợp.</p>
            ) : (
              <div className="space-y-1.5 py-1">
                {visible.map(kb => {
                  const linked = alreadyLinked.has(kb.id);
                  const isMine = kb.ownerId === CURRENT_USER.id;
                  const row = (
                    <label
                      key={kb.id}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border transition-base ${
                        linked ? "opacity-60 cursor-not-allowed" : "hover:bg-surface-muted/50 cursor-pointer"
                      }`}
                    >
                      <input type="checkbox" checked={linked || selected.has(kb.id)} disabled={linked} onChange={() => toggle(kb.id)} className="w-4 h-4 accent-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{kb.name}</span>
                          <span className="chip chip-muted text-[10px] px-1.5 py-0.5 shrink-0">{isMine ? "Của tôi" : "Được chia sẻ"}</span>
                        </div>
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
          </>
        )}

        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} disabled={selected.size === 0} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Liên kết</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
