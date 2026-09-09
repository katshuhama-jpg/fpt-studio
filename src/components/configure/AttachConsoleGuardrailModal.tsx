import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { guardrailConsoleStore } from "./guardrailConsoleStore";
import { agentGuardrailStore } from "./agentGuardrailStore";
import { isAccessibleTo } from "./guardrailSharing";

/** "+ Liên kết guardrail" picker — lists the Console guardrails the current user can actually
 * access (mandatory/all-agents rules, ones they own, and ones shared with them), same
 * ownership-aware filtering as /guardrails itself. Field-for-field port of
 * AttachConsoleKnowledgeBaseModal.tsx. */
export default function AttachConsoleGuardrailModal({ agentId, userId, onClose }: { agentId: string; userId: string; onClose: () => void }) {
  const alreadyLinked = new Set(agentGuardrailStore.listAttachedConsoleGuardrailIds(agentId));
  const all = guardrailConsoleStore.list().filter(g =>
    g.mandatory || g.allAgents || (g.ownerId && g.sharing && isAccessibleTo(g.sharing, g.ownerId, userId)),
  );
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
    for (const id of selected) agentGuardrailStore.attachConsoleGuardrail(agentId, id);
    toast.success(selected.size === 1 ? "Đã liên kết guardrail." : `Đã liên kết ${selected.size} guardrail.`);
    onClose();
  };

  const q = debouncedQuery.trim().toLowerCase();
  const visible = all.filter(g =>
    selected.has(g.id) ||
    !q ||
    g.name.toLowerCase().includes(q) ||
    g.desc.toLowerCase().includes(q),
  );

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Liên kết guardrail</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Agent sẽ dùng guardrail trực tiếp từ Console — nội dung không được sao chép.</p>

        {all.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Không có guardrail nào để liên kết.</p>
        ) : (
          <>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tìm guardrail..."
                className="h-9 w-full pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <p className="text-xs text-muted-foreground">Đã chọn {selected.size} guardrail</p>

            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Không tìm thấy guardrail phù hợp.</p>
            ) : (
              <div className="space-y-1.5 py-1">
                {visible.map(g => {
                  const linked = alreadyLinked.has(g.id);
                  const isMine = g.ownerId === userId;
                  const row = (
                    <label
                      key={g.id}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border transition-base ${
                        linked ? "opacity-60 cursor-not-allowed" : "hover:bg-surface-muted/50 cursor-pointer"
                      }`}
                    >
                      <input type="checkbox" checked={linked || selected.has(g.id)} disabled={linked} onChange={() => toggle(g.id)} className="w-4 h-4 accent-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{g.name}</span>
                          <span className="chip chip-muted px-1.5 py-0.5 shrink-0">
                            {g.mandatory ? "Bắt buộc" : g.allAgents ? "Mọi Agent" : isMine ? "Của tôi" : "Được chia sẻ"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{g.desc}</div>
                      </div>
                    </label>
                  );
                  return linked ? (
                    <Tooltip key={g.id} delayDuration={200}>
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
