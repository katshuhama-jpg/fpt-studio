import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, MoreHorizontal, FileText, Globe, HelpCircle, Database,
  BarChart3, AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  knowledgeBaseStore, isViewOnly, isAccessibleTo, CURRENT_USER, type KnowledgeBase,
} from "@/components/knowledge/knowledgeBaseStore";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { knowledgeDocumentStore } from "@/components/knowledge/knowledgeDocumentStore";
import { knowledgeUrlStore } from "@/components/knowledge/knowledgeUrlStore";
import { knowledgeFaqStore } from "@/components/knowledge/knowledgeFaqStore";
import KnowledgeTypeIcon from "@/components/knowledge/KnowledgeTypeIcon";
import CreateKnowledgeBaseModal from "@/components/knowledge/CreateKnowledgeBaseModal";
import ShareKnowledgeBaseModal from "@/components/knowledge/ShareKnowledgeBaseModal";
import DeleteKnowledgeBaseDialog from "@/components/knowledge/DeleteKnowledgeBaseDialog";
import KnowledgeDocumentsTab from "@/components/knowledge/KnowledgeDocumentsTab";
import KnowledgeWebsiteTab from "@/components/knowledge/KnowledgeWebsiteTab";
import KnowledgeFaqTab from "@/components/knowledge/KnowledgeFaqTab";

type Tab = "documents" | "website" | "faq";
const VALID_TABS: Tab[] = ["documents", "website", "faq"];

function ClearContentDialog({ open, kbName, onClose, onConfirm }: { open: boolean; kbName: string; onClose: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === kbName;
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setTyped(""); onClose(); } }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader><DialogTitle>Xóa toàn bộ nội dung?</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground leading-relaxed">Toàn bộ tài liệu, URL, FAQ và chunk trong kho tri thức "{kbName}" sẽ bị xóa vĩnh viễn. Kho tri thức vẫn tồn tại nhưng sẽ trống hoàn toàn. Hành động này không thể hoàn tác.</p>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Nhập tên kho tri thức để xác nhận</label>
            <input value={typed} onChange={e => setTyped(e.target.value)} placeholder={kbName} className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/20 transition-base" />
          </div>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={() => { onConfirm(); setTyped(""); }} disabled={!matches} className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-medium transition-base disabled:opacity-40 disabled:pointer-events-none">Xác nhận và xóa</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OwnershipChips({ kb }: { kb: KnowledgeBase }) {
  if (kb.ownerId === CURRENT_USER.id) {
    return (
      <>
        <span className="chip chip-muted">Của tôi</span>
        {kb.sharing.mode === "all" && <span className="chip chip-info">Dùng chung</span>}
        {kb.sharing.mode === "specific" && kb.sharing.people.length > 0 && (
          <span className="chip chip-info">Chia sẻ với {kb.sharing.people.length} người</span>
        )}
      </>
    );
  }
  return <span className="chip chip-muted">Được chia sẻ · {kb.ownerName}</span>;
}

export default function KnowledgeDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const access = useGroupAccess("knowledge");
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab");
  const tab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "documents";
  const setTab = (t: Tab) => setParams({ tab: t });

  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [tick, setTick] = useState(0);
  const [kb, setKb] = useState<KnowledgeBase | undefined>(undefined);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showClearContent, setShowClearContent] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    // The "Cài đặt" tab was removed — its sync settings moved into the Website tab's drawer.
    if (rawTab === "settings") setParams({ tab: "website" }, { replace: true });
  }, [rawTab, setParams]);

  useEffect(() => {
    setLoadState("loading");
    const t = setTimeout(() => {
      try {
        setKb(knowledgeBaseStore.get(id));
        setLoadState("ready");
      } catch {
        setLoadState("error");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [id, tick]);

  const refresh = () => setKb(knowledgeBaseStore.get(id));
  const hardRefresh = () => setTick(t => t + 1);

  if (loadState === "loading") {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="h-16 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-8 w-full space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center text-center px-6">
        <AlertTriangle size={22} className="text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground max-w-md mb-4">Chưa tải được kho tri thức này.</p>
        <button onClick={hardRefresh} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Thử lại</button>
      </div>
    );
  }

  if (!kb) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center text-center px-6">
        <Database size={22} className="text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground max-w-md mb-4">Kho tri thức này không tồn tại hoặc đã bị xóa.</p>
        <Link to="/knowledge" className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base flex items-center">
          Về Kho tri thức
        </Link>
      </div>
    );
  }

  // A role whose Knowledge View Scope is "Own & Shared" (or that has no View permission at
  // all) can't reach a KB it doesn't own and wasn't shared with just by typing its URL —
  // mirrors the not-found state above rather than silently rendering the KB's real content.
  if (!access.canSeeAll && !isAccessibleTo(kb, access.userId)) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center text-center px-6">
        <Database size={22} className="text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground max-w-md mb-4">Bạn không có quyền truy cập kho tri thức này. Liên hệ {kb.ownerName} nếu cần được chia sẻ quyền truy cập.</p>
        <Link to="/knowledge" className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base flex items-center">
          Về Kho tri thức
        </Link>
      </div>
    );
  }

  const viewOnly = isViewOnly(kb, access.userId);
  // Sharing, deleting, and the inline click-to-rename title are reserved for the owner — an
  // editor (or anyone on a "Dùng chung" KB) can edit content but not the KB's own access/lifecycle.
  const isOwner = kb.ownerId === CURRENT_USER.id;
  const accessible = isAccessibleTo(kb, access.userId);
  const canEdit = access.canAct("manage", accessible) && !viewOnly;
  const canShare = isOwner && access.canAct("publish", accessible);
  const canClearContent = access.canAct("manage", accessible) && !viewOnly;
  const canDeleteKb = isOwner && access.canAct("delete", accessible);
  const indexedPct = kb.stats.chunks === 0 ? 100 : Math.round((kb.stats.chunks / Math.max(kb.stats.chunks, 1)) * 98);

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== kb.name) knowledgeBaseStore.update(kb.id, { name: trimmed });
    setEditingName(false);
    refresh();
  };

  const TABS: { id: Tab; label: string; Icon: any }[] = [
    { id: "documents", label: "Tài liệu", Icon: FileText },
    { id: "website", label: "Website", Icon: Globe },
    { id: "faq", label: "Câu hỏi thường gặp", Icon: HelpCircle },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border bg-surface px-4 sm:px-6 pt-4 pb-0 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => navigate("/knowledge")} className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
            <ChevronLeft size={16} />
          </button>
          <Link to="/knowledge" className="text-sm text-muted-foreground hover:text-foreground transition-base">Kho tri thức</Link>
          <span className="text-sm text-muted-foreground/50">/</span>
          <span className="text-sm text-foreground font-medium truncate">{kb.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap pb-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <KnowledgeTypeIcon type={kb.type} className="mt-1" />
            <div className="min-w-0 flex-1">
              {editingName ? (
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
                  maxLength={50}
                  className="font-display text-2xl font-semibold tracking-tight bg-transparent border-b border-primary outline-none w-full max-w-md"
                />
              ) : (
                <h1
                  className={`font-display text-2xl font-semibold tracking-tight ${canEdit ? "cursor-pointer hover:opacity-70" : ""}`}
                  onClick={() => { if (!canEdit) return; setNameDraft(kb.name); setEditingName(true); }}
                  title={canEdit ? "Bấm để đổi tên" : undefined}
                >
                  {kb.name}
                </h1>
              )}
              <p className="text-sm text-muted-foreground mt-1">{kb.description || "Chưa có mô tả"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <OwnershipChips kb={kb} />
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                aria-label="Thao tác với kho tri thức"
                className="h-9 w-9 min-w-[44px] min-h-[44px] rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-52 max-w-xs rounded-lg border border-border bg-white shadow-elev py-1">
                    <button
                      disabled={!canEdit}
                      title={!canEdit ? (viewOnly ? "Bạn chỉ có quyền xem kho tri thức này." : "Bạn không có quyền chỉnh sửa kho tri thức này.") : undefined}
                      onClick={() => { setShowEdit(true); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted disabled:text-muted-foreground/50 disabled:cursor-not-allowed transition-base"
                    >
                      Chỉnh sửa
                    </button>
                    {isOwner && (
                      <button
                        disabled={!canShare}
                        title={!canShare ? "Bạn không có quyền chia sẻ kho tri thức này." : undefined}
                        onClick={() => { setShowShare(true); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted disabled:text-muted-foreground/50 disabled:cursor-not-allowed transition-base"
                      >
                        Chia sẻ
                      </button>
                    )}
                    <div className="mt-1 pt-1 border-t border-border">
                      <button
                        disabled={!canClearContent}
                        title={!canClearContent ? (viewOnly ? "Bạn chỉ có quyền xem kho tri thức này." : "Bạn không có quyền xóa nội dung kho tri thức này.") : undefined}
                        onClick={() => { setShowClearContent(true); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-[hsl(var(--destructive-soft))] disabled:text-muted-foreground/50 disabled:cursor-not-allowed transition-base"
                      >
                        Xóa toàn bộ nội dung
                      </button>
                      {isOwner && (
                        <button
                          disabled={!canDeleteKb}
                          title={!canDeleteKb ? "Bạn không có quyền xóa kho tri thức này." : undefined}
                          onClick={() => { setShowDelete(true); setShowMenu(false); }}
                          className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-[hsl(var(--destructive-soft))] disabled:text-muted-foreground/50 disabled:cursor-not-allowed transition-base"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            {TABS.map(({ id: tid, label, Icon }) => (
              <button
                key={tid}
                onClick={() => setTab(tid)}
                className={`px-3 h-9 rounded-t-lg text-sm font-medium flex items-center gap-1.5 border-b-2 transition-base ${
                  tab === tid ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="px-3 h-9 rounded-t-lg text-sm font-medium flex items-center gap-1.5 border-b-2 border-transparent text-muted-foreground/50 cursor-not-allowed outline-none">
                  <Database size={15} /> SharePoint
                  <span className="text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-surface-muted border border-border text-muted-foreground">Sắp ra mắt</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Tính năng này sẽ sớm ra mắt.</TooltipContent>
            </Tooltip>
          </div>

          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="flex items-center gap-1.5 text-xs text-muted-foreground pb-2 outline-none">
                <BarChart3 size={13} /> {kb.stats.chunks} chunk · {indexedPct}% đã lập chỉ mục
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">Số đoạn tri thức đã xử lý và tỷ lệ sẵn sàng cho tra cứu.</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {viewOnly && (
        <div className="px-4 sm:px-6 py-2.5 bg-surface-muted border-b border-border text-xs text-muted-foreground shrink-0">
          Bạn đang xem kho tri thức được chia sẻ. Liên hệ {kb.ownerName} nếu cần quyền chỉnh sửa.
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {tab === "documents" && <KnowledgeDocumentsTab kbId={kb.id} viewOnly={viewOnly} />}
        {tab === "website" && <KnowledgeWebsiteTab kbId={kb.id} viewOnly={viewOnly} />}
        {tab === "faq" && <KnowledgeFaqTab kbId={kb.id} viewOnly={viewOnly} />}
      </div>

      {showEdit && <CreateKnowledgeBaseModal open={showEdit} editingKb={kb} onClose={() => setShowEdit(false)} onCreated={refresh} />}
      {showShare && (
        <ShareKnowledgeBaseModal
          open={showShare}
          name={kb.name}
          ownerName={kb.ownerName}
          sharing={kb.sharing}
          onSave={sharing => knowledgeBaseStore.updateSharing(kb.id, sharing)}
          onClose={() => { setShowShare(false); refresh(); }}
        />
      )}
      {showDelete && <DeleteKnowledgeBaseDialog open={showDelete} kb={kb} onClose={() => setShowDelete(false)} onDeleted={() => navigate("/knowledge")} />}
      <ClearContentDialog
        open={showClearContent}
        kbName={kb.name}
        onClose={() => setShowClearContent(false)}
        onConfirm={() => {
          knowledgeDocumentStore.removeMany(knowledgeDocumentStore.list(kb.id).map(d => d.id));
          knowledgeUrlStore.removeMany(knowledgeUrlStore.list(kb.id).map(u => u.id));
          knowledgeFaqStore.removeMany(knowledgeFaqStore.list(kb.id).map(f => f.id));
          toast.success(`Đã xóa toàn bộ nội dung của "${kb.name}".`);
          setShowClearContent(false);
          hardRefresh();
        }}
      />
    </div>
  );
}
