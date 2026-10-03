import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { knowledgeBaseStore, isAccessibleTo, type KnowledgeBase } from "./knowledgeBaseStore";
import { knowledgeStore } from "./knowledgeStore";
import KnowledgeTypeIcon from "./KnowledgeTypeIcon";
import KbScopePicker from "./KbScopePicker";
import { FULL_SCOPE, pruneScope, scopeItemCount, scopeLabel, type KbLinkScope } from "./kbLinkScope";

const sameScope = (a: KbLinkScope, b: KbLinkScope) => JSON.stringify(a) === JSON.stringify(b);
const isEmptyPartial = (kbId: string, s: KbLinkScope) => s.mode === "partial" && scopeItemCount(pruneScope(kbId, s)) === 0;

/** "Liên kết kho tri thức": pick one or more Space knowledge bases on the left, and for each one
 * choose "Toàn bộ kho" or only some folders, documents, websites and FAQ categories on the right.
 * Already linked knowledge bases stay ticked here so their scope can be changed; unlinking stays
 * on the card's "Gỡ liên kết". Only knowledge bases this user can access are listed. */
export default function AttachConsoleKnowledgeBaseModal({ agentId, userId, onClose, initialFocusKbId }: {
  agentId: string; userId: string; onClose: () => void; initialFocusKbId?: string;
}) {
  const linkedIds = useMemo(() => knowledgeStore.listAttachedConsoleKbIds(agentId), [agentId]);
  const linked = useMemo(() => new Set(linkedIds), [linkedIds]);
  const all = useMemo(() => {
    const list = knowledgeBaseStore.list().filter(kb => isAccessibleTo(kb, userId) || linked.has(kb.id));
    // Linked first, so the knowledge bases this Agent already uses are easy to find.
    return [...list.filter(kb => linked.has(kb.id)), ...list.filter(kb => !linked.has(kb.id))];
  }, [userId, linked]);
  const initialScopes = useMemo(() => new Map(linkedIds.map(id => [id, knowledgeStore.getLinkScope(agentId, id)])), [agentId, linkedIds]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(linkedIds));
  const [scopes, setScopes] = useState<Map<string, KbLinkScope>>(() => new Map(initialScopes));
  const [focusId, setFocusId] = useState<string | null>(initialFocusKbId ?? linkedIds[0] ?? null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const scopeOf = (id: string) => scopes.get(id) ?? FULL_SCOPE;
  const setScope = (id: string, s: KbLinkScope) => setScopes(prev => new Map(prev).set(id, s));

  const toggle = (id: string) => {
    if (linked.has(id)) return;
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else { n.add(id); setFocusId(id); }
      return n;
    });
  };
  const focusRow = (id: string) => {
    setFocusId(id);
    if (!selected.has(id) && !linked.has(id)) setSelected(prev => new Set(prev).add(id));
  };

  const newIds = [...selected].filter(id => !linked.has(id));
  const editedIds = linkedIds.filter(id => !sameScope(scopeOf(id), initialScopes.get(id) ?? FULL_SCOPE));
  const invalidIds = [...selected].filter(id => isEmptyPartial(id, scopeOf(id)));
  const hasChanges = newIds.length > 0 || editedIds.length > 0;

  const submit = () => {
    setSubmitAttempted(true);
    if (invalidIds.length > 0) { setFocusId(invalidIds[0]); return; }
    for (const id of newIds) knowledgeStore.attachConsoleKb(agentId, id, pruneScope(id, scopeOf(id)));
    for (const id of editedIds) knowledgeStore.setLinkScope(agentId, id, pruneScope(id, scopeOf(id)));
    toast.success(newIds.length > 0 ? `Đã liên kết ${newIds.length} kho tri thức.` : "Đã cập nhật phạm vi liên kết.");
    onClose();
  };

  const q = debouncedQuery.trim().toLowerCase();
  const visible = all.filter(kb => selected.has(kb.id) || !q || kb.name.toLowerCase().includes(q) || kb.description.toLowerCase().includes(q));
  const focused: KnowledgeBase | undefined = all.find(kb => kb.id === focusId);
  const selectedCount = selected.size;

  const rowStatus = (kb: KnowledgeBase) => {
    if (!selected.has(kb.id)) return <span>{kb.stats.docs} tài liệu · {kb.stats.urls} website · {kb.stats.faqs} câu hỏi</span>;
    const { label, empty } = scopeLabel(kb.id, scopeOf(kb.id));
    return <span className={empty && submitAttempted ? "text-destructive" : "text-primary font-medium"}>{label}</span>;
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[920px] p-0 gap-0 overflow-hidden" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{initialFocusKbId ? "Đổi phạm vi liên kết" : "Liên kết kho tri thức"}</DialogTitle>
          <DialogDescription>Chọn kho tri thức trong Space cho Agent tra cứu. Có thể liên kết cả kho hoặc chỉ một số thư mục, tài liệu.</DialogDescription>
        </DialogHeader>

        {all.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12 border-t border-border">Chưa có kho tri thức nào bạn được dùng. Tạo kho mới hoặc nhờ chủ sở hữu mở quyền truy cập.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] border-t border-border md:h-[520px]">
            {/* Left: knowledge bases */}
            <div className="flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-border">
              <div className="p-3 space-y-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Tìm kho tri thức..."
                    aria-label="Tìm kho tri thức"
                    className="h-9 w-full pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Đã chọn {selectedCount} kho</p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-1.5 max-h-[300px] md:max-h-none">
                {visible.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Không tìm thấy kho tri thức phù hợp.</p>
                ) : visible.map(kb => {
                  const isLinked = linked.has(kb.id);
                  const isFocused = kb.id === focusId;
                  const checkbox = (
                    <input
                      type="checkbox"
                      checked={selected.has(kb.id)}
                      disabled={isLinked}
                      onChange={() => toggle(kb.id)}
                      onClick={e => e.stopPropagation()}
                      aria-label={`Chọn ${kb.name}`}
                      className="w-4 h-4 accent-primary mt-0.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                  );
                  return (
                    <div
                      key={kb.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => focusRow(kb.id)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusRow(kb.id); } }}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isFocused ? "border-primary bg-primary-soft/40" : "border-border hover:bg-surface-muted/60"
                      }`}
                    >
                      {isLinked ? (
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild><span>{checkbox}</span></TooltipTrigger>
                          <TooltipContent>Để gỡ kho, dùng Gỡ liên kết ở thẻ kho.</TooltipContent>
                        </Tooltip>
                      ) : checkbox}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-medium truncate">{kb.name}</span>
                          {isLinked && <span className="chip chip-muted px-1.5 py-0.5 shrink-0">Đã liên kết</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{rowStatus(kb)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: scope of the focused knowledge base */}
            <div className="min-h-0 overflow-y-auto p-5">
              {!focused ? (
                <p className="text-sm text-muted-foreground text-center py-16">Chọn một kho ở cột bên trái để xem nội dung và chọn phạm vi.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <KnowledgeTypeIcon type={focused.type} className="w-9 h-9 rounded-lg" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{focused.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{focused.ownerId === userId ? "Của tôi" : focused.ownerName}{focused.description ? ` · ${focused.description}` : ""}</div>
                    </div>
                  </div>
                  {focused.type === "external_api" ? (
                    <p className="text-sm text-muted-foreground rounded-xl border border-border p-4">Kho kết nối ngoài luôn được liên kết toàn bộ, vì nội dung nằm ở hệ thống bên ngoài.</p>
                  ) : (
                    <KbScopePicker
                      key={focused.id}
                      kbId={focused.id}
                      value={scopeOf(focused.id)}
                      onChange={s => {
                        // Choosing a scope for a knowledge base that isn't ticked yet also ticks it.
                        setScope(focused.id, s);
                        if (!selected.has(focused.id)) setSelected(prev => new Set(prev).add(focused.id));
                      }}
                      showError={submitAttempted}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-border">
          {submitAttempted && invalidIds.length > 0 && (
            <p className="text-xs text-destructive mr-auto self-center">{invalidIds.length} kho chưa chọn mục nào.</p>
          )}
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} disabled={!hasChanges} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">
            {newIds.length > 0 ? `Liên kết (${newIds.length})` : editedIds.length > 0 ? "Lưu phạm vi" : "Liên kết"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
