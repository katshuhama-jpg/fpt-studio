import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Layers, ListChecks } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioCard } from "./QueryScopeSection";
import FileTypeIcon from "./FileTypeIcon";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeUrlStore } from "./knowledgeUrlStore";
import { knowledgeFaqStore } from "./knowledgeFaqStore";
import { coveredBy, scopeItemCount, UNCATEGORIZED_FAQ, UNCATEGORIZED_FAQ_LABEL, type KbLinkScope } from "./kbLinkScope";

export const SCOPE_COPY = {
  allLabel: "Toàn bộ kho",
  allHelper: "Agent dùng mọi nội dung trong kho, kể cả nội dung thêm sau này.",
  partLabel: "Chọn một phần",
  partHelper: "Agent chỉ dùng các mục bạn chọn. Tài liệu thêm sau vào thư mục đã chọn cũng được dùng.",
  emptyError: "Chọn ít nhất một mục, hoặc chuyển về Toàn bộ kho.",
  failedTip: "Tài liệu xử lý thất bại nên chưa dùng được.",
  processingNote: "Đang xử lý",
};

type TreeNode = { id: string; name: string; isFolder: boolean; folderId: string | null; status?: string; kind?: "url" };

function TriCheckbox({ checked, indeterminate, disabled, onChange, label }: {
  checked: boolean; indeterminate?: boolean; disabled?: boolean; onChange: () => void; label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate && !checked; }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      onClick={e => e.stopPropagation()}
      className="w-4 h-4 accent-primary shrink-0 cursor-pointer disabled:cursor-not-allowed"
    />
  );
}

/** Tri-state tree over one KB's documents or websites. A chosen folder stands for everything
 * inside it; unticking something inside a chosen folder swaps the folder for its other items. */
function ScopeTree({ nodes, selected, onChange, emptyText }: {
  nodes: TreeNode[]; selected: string[]; onChange: (ids: string[]) => void; emptyText: string;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const sel = useMemo(() => new Set(selected), [selected]);
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const childrenOf = (folderId: string | null) => nodes
    .filter(n => n.folderId === folderId)
    .sort((a, b) => (a.isFolder === b.isFolder ? a.name.localeCompare(b.name) : a.isFolder ? -1 : 1));
  const descendants = (folderId: string): string[] => childrenOf(folderId).flatMap(c => [c.id, ...(c.isFolder ? descendants(c.id) : [])]);
  const isCovered = (id: string) => coveredBy(nodes, sel, id);
  const hasSelectedInside = (folderId: string) => descendants(folderId).some(id => sel.has(id));
  const isFailed = (n: TreeNode) => n.status === "failed" || n.status === "cancelled";

  const toggle = (n: TreeNode) => {
    const next = new Set(sel);
    if (isCovered(n.id)) {
      if (next.has(n.id)) next.delete(n.id);
      else {
        // Covered through a chosen parent folder: drop that folder and keep its other items.
        const path: TreeNode[] = [];
        let cur: TreeNode | undefined = n;
        while (cur && !next.has(cur.id)) { path.unshift(cur); cur = cur.folderId ? byId.get(cur.folderId) : undefined; }
        if (cur) {
          next.delete(cur.id);
          let parent = cur;
          for (const step of path) {
            for (const c of childrenOf(parent.id)) if (c.id !== step.id && !isFailed(c)) next.add(c.id);
            parent = step;
          }
        }
      }
    } else {
      next.add(n.id);
      if (n.isFolder) for (const d of descendants(n.id)) next.delete(d);
    }
    onChange([...next]);
  };

  const roots = childrenOf(null);
  if (nodes.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">{emptyText}</p>;

  const allCovered = roots.filter(r => !isFailed(r)).every(r => isCovered(r.id));
  const anySelected = sel.size > 0;
  // Failed documents can't be used, so "Chọn tất cả" leaves them out.
  const toggleAll = () => onChange(allCovered ? [] : roots.filter(r => !isFailed(r)).map(r => r.id));

  const renderNode = (n: TreeNode, depth: number): React.ReactNode => {
    const covered = isCovered(n.id);
    const partial = n.isFolder && !covered && hasSelectedInside(n.id);
    const failed = !n.isFolder && isFailed(n);
    const expanded = open.has(n.id);
    const busy = !n.isFolder && (n.status === "pending" || n.status === "processing");
    const row = (
      <div
        className={`flex items-center gap-2 h-9 pr-2 rounded-lg ${failed ? "opacity-50" : "hover:bg-surface-muted cursor-pointer"}`}
        style={{ paddingLeft: 8 + depth * 20 }}
        onClick={() => { if (failed) return; if (n.isFolder) setOpen(prev => { const s = new Set(prev); s.has(n.id) ? s.delete(n.id) : s.add(n.id); return s; }); else toggle(n); }}
      >
        {n.isFolder ? (
          <ChevronRight size={14} className={`text-muted-foreground shrink-0 transition-base ${expanded ? "rotate-90" : ""}`} />
        ) : <span className="w-3.5 shrink-0" />}
        <TriCheckbox checked={covered} indeterminate={partial} disabled={failed} onChange={() => toggle(n)} label={n.name} />
        <FileTypeIcon kind={n.isFolder ? "folder" : n.kind} name={n.isFolder || n.kind ? undefined : n.name} size={14} />
        <span className="text-sm truncate flex-1 min-w-0">{n.name}</span>
        {busy && <span className="text-[11px] text-muted-foreground shrink-0">{SCOPE_COPY.processingNote}</span>}
        {n.isFolder && <span className="text-[11px] text-muted-foreground shrink-0">{descendants(n.id).filter(id => !byId.get(id)?.isFolder).length}</span>}
      </div>
    );
    return (
      <div key={n.id}>
        {failed ? (
          <Tooltip delayDuration={200}><TooltipTrigger asChild>{row}</TooltipTrigger><TooltipContent>{SCOPE_COPY.failedTip}</TooltipContent></Tooltip>
        ) : row}
        {n.isFolder && expanded && childrenOf(n.id).map(c => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-0.5">
      <label className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-surface-muted cursor-pointer border-b border-border mb-1">
        <span className="w-3.5 shrink-0" />
        <TriCheckbox checked={allCovered} indeterminate={anySelected} onChange={toggleAll} label="Chọn tất cả" />
        <span className="text-sm font-medium">Chọn tất cả</span>
      </label>
      {roots.map(r => renderNode(r, 0))}
    </div>
  );
}

function FaqCategoryList({ kbId, selected, onChange }: { kbId: string; selected: string[]; onChange: (c: string[]) => void }) {
  const faqs = knowledgeFaqStore.list(kbId);
  const counts = new Map<string, number>();
  for (const f of faqs) for (const c of (f.categories.length ? f.categories : [UNCATEGORIZED_FAQ])) counts.set(c, (counts.get(c) ?? 0) + 1);
  const cats = [...counts.keys()].sort((a, b) => (a === UNCATEGORIZED_FAQ ? 1 : b === UNCATEGORIZED_FAQ ? -1 : a.localeCompare(b)));
  if (cats.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">Kho chưa có câu hỏi thường gặp.</p>;
  const sel = new Set(selected);
  const all = cats.every(c => sel.has(c));
  const toggle = (c: string) => { const n = new Set(sel); n.has(c) ? n.delete(c) : n.add(c); onChange([...n]); };
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground px-2 pb-1">Chọn theo danh mục. Câu hỏi thêm sau vào danh mục đã chọn cũng được dùng.</p>
      <label className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-surface-muted cursor-pointer border-b border-border mb-1">
        <TriCheckbox checked={all} indeterminate={sel.size > 0} onChange={() => onChange(all ? [] : cats)} label="Chọn tất cả" />
        <span className="text-sm font-medium">Chọn tất cả</span>
      </label>
      {cats.map(c => (
        <label key={c} className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-surface-muted cursor-pointer">
          <TriCheckbox checked={sel.has(c)} onChange={() => toggle(c)} label={c === UNCATEGORIZED_FAQ ? UNCATEGORIZED_FAQ_LABEL : c} />
          <span className={`text-sm flex-1 truncate ${c === UNCATEGORIZED_FAQ ? "italic text-muted-foreground" : ""}`}>{c === UNCATEGORIZED_FAQ ? UNCATEGORIZED_FAQ_LABEL : c}</span>
          <span className="text-[11px] text-muted-foreground">{counts.get(c)} câu hỏi</span>
        </label>
      ))}
    </div>
  );
}

type Tab = "docs" | "urls" | "faqs";

/** "Toàn bộ kho" / "Chọn một phần" for one linked knowledge base. */
export default function KbScopePicker({ kbId, value, onChange, showError }: {
  kbId: string; value: KbLinkScope; onChange: (s: KbLinkScope) => void; showError?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("docs");
  const docs: TreeNode[] = knowledgeDocumentStore.list(kbId).map(d => ({ id: d.id, name: d.name, isFolder: d.isFolder, folderId: d.folderId, status: d.status }));
  const urls: TreeNode[] = knowledgeUrlStore.list(kbId).map(u => ({ id: u.id, name: u.isFolder ? u.name : (u.title || u.url || u.name), isFolder: u.isFolder, folderId: u.folderId, status: u.status, kind: u.isFolder ? undefined : "url" as const }));
  const count = scopeItemCount(value);
  const tabs: { key: Tab; label: string; picked: number }[] = [
    { key: "docs", label: "Tài liệu", picked: value.docIds.length },
    { key: "urls", label: "Website", picked: value.urlIds.length },
    { key: "faqs", label: "Câu hỏi thường gặp", picked: value.faqCategories.length },
  ];

  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Phạm vi liên kết" className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <RadioCard selected={value.mode === "all"} onSelect={() => onChange({ ...value, mode: "all" })} label={SCOPE_COPY.allLabel} helper={SCOPE_COPY.allHelper} icon={Layers} />
        <RadioCard selected={value.mode === "partial"} onSelect={() => onChange({ ...value, mode: "partial" })} label={SCOPE_COPY.partLabel} helper={SCOPE_COPY.partHelper} icon={ListChecks} />
      </div>

      {value.mode === "partial" && (
        <div className="rounded-xl border border-border">
          <div role="tablist" className="flex items-center gap-1 px-2 pt-2 border-b border-border">
            {tabs.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`h-9 px-3 -mb-px text-sm border-b-2 transition-base ${tab === t.key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {t.label}{t.picked > 0 && <span className="ml-1.5 text-[11px] font-semibold rounded-full bg-primary-soft text-primary px-1.5 py-0.5">{t.picked}</span>}
              </button>
            ))}
          </div>
          <div className="p-2 max-h-[300px] overflow-y-auto">
            {tab === "docs" && <ScopeTree nodes={docs} selected={value.docIds} onChange={docIds => onChange({ ...value, docIds })} emptyText="Kho chưa có tài liệu." />}
            {tab === "urls" && <ScopeTree nodes={urls} selected={value.urlIds} onChange={urlIds => onChange({ ...value, urlIds })} emptyText="Kho chưa có website." />}
            {tab === "faqs" && <FaqCategoryList kbId={kbId} selected={value.faqCategories} onChange={faqCategories => onChange({ ...value, faqCategories })} />}
          </div>
          <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
            Đã chọn {count} mục
          </div>
        </div>
      )}
      {showError && value.mode === "partial" && count === 0 && (
        <p role="alert" className="text-xs text-destructive">{SCOPE_COPY.emptyError}</p>
      )}
    </div>
  );
}
