import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { skillStore } from "./skillStore";
import { agentSkillStore } from "./agentSkillStore";
import { isAccessibleTo } from "./skillSharing";

/** "Connect workspace skill" — lists the actual Console Skills for this workspace (the same
 * ones shown on /tools), filtered to the ones the current user can access. Field-for-field port
 * of AttachConsoleKnowledgeBaseModal.tsx / AttachConsoleGuardrailModal.tsx. */
export default function AttachConsoleSkillModal({ agentId, userId, onClose }: { agentId: string; userId: string; onClose: () => void }) {
  const alreadyLinked = new Set(agentSkillStore.listAttachedConsoleSkillIds(agentId));
  const all = skillStore.list().filter(s => isAccessibleTo(s.sharing, s.ownerId, userId));
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
    for (const id of selected) agentSkillStore.attachConsoleSkill(agentId, id);
    toast.success(selected.size === 1 ? "Đã liên kết skill." : `Đã liên kết ${selected.size} skill.`);
    onClose();
  };

  const q = debouncedQuery.trim().toLowerCase();
  const visible = all.filter(s =>
    selected.has(s.id) ||
    !q ||
    s.name.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q),
  );

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect workspace skill</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Skills shared across all agents in this workspace.</p>

        {all.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Không có skill nào để liên kết.</p>
        ) : (
          <>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search..."
                className="h-9 w-full pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <p className="text-xs text-muted-foreground">Đã chọn {selected.size} skill</p>

            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Không tìm thấy skill phù hợp.</p>
            ) : (
              <div className="space-y-1.5 py-1">
                {visible.map(s => {
                  const linked = alreadyLinked.has(s.id);
                  const isMine = s.ownerId === userId;
                  const row = (
                    <label
                      key={s.id}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border transition-base ${
                        linked ? "opacity-60 cursor-not-allowed" : "hover:bg-surface-muted/50 cursor-pointer"
                      }`}
                    >
                      <input type="checkbox" checked={linked || selected.has(s.id)} disabled={linked} onChange={() => toggle(s.id)} className="w-4 h-4 accent-primary mt-0.5 shrink-0" />
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-sm shrink-0" style={{ background: s.iconBg }}>{s.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{s.name}</span>
                          <span className="chip chip-muted px-1.5 py-0.5 shrink-0">{isMine ? "Của tôi" : "Được chia sẻ"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                      </div>
                    </label>
                  );
                  return linked ? (
                    <Tooltip key={s.id} delayDuration={200}>
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
