import { useEffect, useState } from "react";
import { useAgentAccessLevel, useIsAgentCollaborator } from "@/components/configure/agentShareStore";
import { notifySpaceOwner, useSpaceActor, spaceDeleteLabel } from "@/components/governance/spaceDelete";
import {
  ChevronLeft, MoreHorizontal, FileText, Globe, HelpCircle, Database, Loader2, AlertTriangle,
  Users, MessageSquareText, ChevronDown, X, ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { knowledgeBaseStore, isViewOnly, isAccessibleTo, CURRENT_USER, type KnowledgeBase } from "./knowledgeBaseStore";
import { useAgentContextAccess } from "@/components/governance/agentContextAccess";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import KnowledgeTypeIcon from "./KnowledgeTypeIcon";
import CreateKnowledgeBaseModal from "./CreateKnowledgeBaseModal";
import ShareKnowledgeBaseModal from "./ShareKnowledgeBaseModal";
import DeleteKnowledgeBaseDialog from "./DeleteKnowledgeBaseDialog";
import RetrievalScopeModal from "./RetrievalScopeModal";
import { ACCESS_COPY, RETRIEVAL_COPY, accessLabel, retrievalLabel } from "./QueryScopeSection";
import KnowledgeDocumentsTab from "./KnowledgeDocumentsTab";
import ChunkViewerModal from "./ChunkViewerModal";

/**
 * One knowledge base, Production layout (eos.fpt.ai, Nov 2026). Used in two places:
 * - "space": /knowledge/:id - breadcrumb "Kho tri thức / Tên", "Truy cập" + "Truy xuất" chips,
 *   "⋯" menu, tabs Tài liệu / Website / Câu hỏi thường gặp / SharePoint (the last three "Sắp có").
 * - "agent": inside a Digital Worker (section=knowledge&kb=…) - "‹ Tri thức của Nhân sự số",
 *   tabs Tài liệu / Website / Câu hỏi thường gặp, search + "Thêm" on the tab row, and the
 *   "Ai được Nhân sự số trả lời…" note. It opens in the Digital Worker's own content area, so
 *   the user never leaves the Digital Worker page.
 * A document opens in place of the list (same content area), never as a full-screen overlay.
 */
export default function KnowledgeBaseView({
  kbId, variant, agentId, onBack, backLabel, openDocId, onOpenDoc, onCloseDoc, onDeleted, onOpenChannels,
}: {
  kbId: string;
  variant: "space" | "agent";
  /** The Digital Worker this is viewed from (agent variant, or a Space link carrying ?viaAgent=). */
  agentId?: string | null;
  onBack: () => void;
  backLabel: string;
  openDocId: string | null;
  onOpenDoc: (docId: string) => void;
  onCloseDoc: () => void;
  onDeleted?: () => void;
  /** Agent variant: "Mở Channels" in the answer-audience note. */
  onOpenChannels?: () => void;
}) {
  const access = useGroupAccess("knowledge");
  const actor = useSpaceActor();
  const isAgentView = variant === "agent";

  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [tick, setTick] = useState(0);
  const [kb, setKb] = useState<KnowledgeBase | undefined>(undefined);
  const agentCtx = useAgentContextAccess(kb?.attachedByAgentIds);
  const viaAgentLevel = useAgentAccessLevel(agentId ?? "__none__");
  const viaAgentCollaborator = useIsAgentCollaborator(agentId ?? null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showRetrieval, setShowRetrieval] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [noteDismissed, setNoteDismissed] = useState(false);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoadState("loading");
    const t = setTimeout(() => {
      try { setKb(knowledgeBaseStore.get(kbId)); setLoadState("ready"); }
      catch { setLoadState("error"); }
    }, 250);
    return () => clearTimeout(t);
  }, [kbId, tick]);

  const refresh = () => { setKb(knowledgeBaseStore.get(kbId)); setTick0(t => t + 1); };
  const [, setTick0] = useState(0);
  const hardRefresh = () => setTick(t => t + 1);

  const wrap = (node: React.ReactNode) => (
    <div className={isAgentView ? "p-8 max-w-6xl mx-auto w-full" : "px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full"}>{node}</div>
  );

  if (loadState === "loading") {
    return wrap(
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>,
    );
  }
  if (loadState === "error") {
    return wrap(
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <AlertTriangle size={24} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">Chưa tải được kho tri thức này</p>
        <p className="text-sm text-muted-foreground mb-4">Kiểm tra kết nối rồi thử lại.</p>
        <button onClick={hardRefresh} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Thử lại</button>
      </div>,
    );
  }
  if (!kb) {
    return wrap(
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <Database size={24} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">Kho tri thức này không tồn tại hoặc đã bị xóa</p>
        <p className="text-sm text-muted-foreground mb-4">Quay lại để chọn kho tri thức khác.</p>
        <button onClick={onBack} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">{backLabel}</button>
      </div>,
    );
  }

  // ── Access (unchanged rules) ──────────────────────────────────────────────────────────────
  const viaAgentOnly = !access.canSeeAll && !actor.isAdmin && !isAccessibleTo(kb, access.userId);
  if (viaAgentOnly && (!agentCtx.allowed || !(access.hasPermission("view") || access.hasPermission("manage")))) {
    return wrap(
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <Database size={24} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">Bạn không có quyền truy cập kho tri thức này</p>
        <p className="text-sm text-muted-foreground mb-4">Liên hệ {kb.ownerName} nếu cần được chia sẻ quyền truy cập.</p>
        <button onClick={onBack} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">{backLabel}</button>
      </div>,
    );
  }
  const viaOwningAgent = !!kb.agentOnlyFor && agentCtx.allowed && agentCtx.agent?.id === kb.agentOnlyFor;
  const viewOnly = !viaAgentOnly && !viaOwningAgent && isViewOnly(kb, access.userId);
  const isOwner = kb.ownerId === CURRENT_USER.id;
  const accessible = isAccessibleTo(kb, access.userId) || ((viaAgentOnly || viaOwningAgent) && agentCtx.allowed);
  const canEditBase = agentId && viaAgentCollaborator && !isOwner && !actor.isAdmin
    ? viaAgentLevel === "edit" && kb.agentOnlyFor === agentId
    : access.canAct("manage", accessible) && !viewOnly;
  // Inside a Digital Worker, a knowledge base linked from the Space follows the viewer's own
  // permission on it: whoever may edit it in the Space may edit it here too (same content).
  const linkedInAgent = isAgentView && kb.agentOnlyFor !== agentId;
  const linkedInAgentTag = linkedInAgent;
  const canEdit = canEditBase;
  const canShare = isOwner && access.canAct("publish", accessible);
  const manages = (isOwner || (actor.isAdmin && !kb.agentOnlyFor)) && !kb.deletedFromSpace;
  const canShareAccess = manages && (actor.isAdmin || access.canAct("publish", accessible));
  const canDeleteKb = manages && (actor.isAdmin || access.canAct("delete", accessible));
  const docs = knowledgeDocumentStore.list(kb.id);
  const docCount = docs.filter(d => !d.isFolder).length;
  const isProcessing = docs.some(d => !d.isFolder && (d.status === "pending" || d.status === "processing"));

  // ── A document is open: it replaces the knowledge base view in the same content area ─────
  const openDoc = openDocId ? knowledgeDocumentStore.get(kb.id, openDocId) : undefined;
  if (openDocId && openDoc && !openDoc.isFolder && openDoc.status === "done") {
    return (
      <div className={isAgentView ? "p-8 max-w-6xl mx-auto w-full h-full" : "px-4 sm:px-8 py-6 w-full h-[calc(100vh-3rem)]"}>
        <ChunkViewerModal
          inline
          trail={[
            { label: backLabel, onClick: onBack },
            { label: kb.name, onClick: onCloseDoc },
          ]}
          kbId={kb.id}
          sourceType="document"
          sourceId={openDoc.id}
          sourceName={openDoc.name}
          sourceStatus={openDoc.status}
          sourceCreatedAt={openDoc.createdAt}
          sourceUpdatedAt={openDoc.updatedAt}
          onClose={onCloseDoc}
          viewOnly
        />
      </div>
    );
  }

  const comingSoon = (label: string, Icon: typeof FileText) => (
    <Tooltip key={label} delayDuration={300}>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-disabled className="px-1 h-10 text-sm font-medium flex items-center gap-1.5 border-b-2 border-transparent text-muted-foreground/70 cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          <Icon size={15} /> {label}
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-surface-muted text-muted-foreground">Sắp có</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">Tính năng này sẽ sớm ra mắt.</TooltipContent>
    </Tooltip>
  );

  const menuItem = (label: string, onClick: () => void, opts: { disabled?: string; danger?: boolean } = {}) => (
    <button
      key={label}
      disabled={!!opts.disabled}
      title={opts.disabled}
      onClick={() => { setShowMenu(false); onClick(); }}
      className={`w-full text-left px-3 py-2 text-sm transition-base disabled:text-muted-foreground/50 disabled:cursor-not-allowed ${opts.danger ? "text-destructive hover:bg-[hsl(var(--destructive-soft))]" : "hover:bg-surface-muted"}`}
    >
      {label}
    </button>
  );

  return wrap(
    <div className="animate-fade-up">
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-1.5 mb-3 min-w-0">
        {(
          <>
            <button onClick={onBack} aria-label={`Về ${backLabel}`} className="h-7 w-7 -ml-1.5 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
              <ChevronLeft size={15} />
            </button>
            <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-base">{backLabel}</button>
            <span className="text-sm text-muted-foreground/60">/</span>
            <span className="text-sm font-medium truncate">{kb.name}</span>
          </>
        )}
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {!isAgentView && <KnowledgeTypeIcon type={kb.type} className="mt-0.5" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight truncate" title={kb.name}>{kb.name}</h1>
              {isAgentView && (
                <span className="chip chip-muted shrink-0">{linkedInAgentTag ? "Liên kết từ Space" : "Kho riêng"}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{kb.description || "Kho tri thức này chưa có mô tả."}</p>
          </div>
        </div>
        {!isAgentView && (
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <span className="chip chip-muted">{isOwner ? "Của tôi" : `Được chia sẻ · ${kb.ownerName}`}</span>
            <PermissionChip
              Icon={Users} prefix={ACCESS_COPY.chip}
              value={accessLabel(kb.sharing.mode, kb.sharing.people.length)}
              tip={ACCESS_COPY.title} canManage={canShareAccess} onClick={() => setShowShare(true)}
            />
            <PermissionChip
              Icon={MessageSquareText} prefix={RETRIEVAL_COPY.chip}
              value={retrievalLabel(kb.querySharing)}
              tip={RETRIEVAL_COPY.title} canManage={canShare} onClick={() => setShowRetrieval(true)}
            />
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                aria-label={`Tuỳ chọn cho ${kb.name}`}
                aria-expanded={showMenu}
                className="h-9 w-9 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-52 rounded-lg border border-border bg-white shadow-elev py-1">
                    {menuItem("Chỉnh sửa", () => setShowEdit(true), { disabled: !canEdit ? "Bạn không có quyền chỉnh sửa kho tri thức này." : undefined })}
                    {menuItem(ACCESS_COPY.menu, () => setShowShare(true), { disabled: !canShareAccess ? "Chỉ chủ sở hữu hoặc Admin của Space mới đổi được quyền truy cập." : undefined })}
                    {menuItem(RETRIEVAL_COPY.menu, () => setShowRetrieval(true), { disabled: !canShare ? "Chỉ chủ sở hữu mới đổi được quyền truy xuất." : undefined })}
                    <div className="mt-1 pt-1 border-t border-border">
                      {menuItem("Xóa toàn bộ nội dung", () => setShowClear(true), { disabled: !canEdit ? "Bạn không có quyền chỉnh sửa kho tri thức này." : docs.length === 0 ? "Kho tri thức chưa có nội dung." : undefined })}
                      {menuItem(spaceDeleteLabel(kb), () => setShowDelete(true), { danger: true, disabled: !canDeleteKb ? "Bạn không có quyền xóa kho tri thức này." : undefined })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs (+ agent toolbar slot) */}
      <div className="flex items-center justify-between gap-3 border-b border-border mb-4 flex-wrap">
        <div className="flex items-center gap-5" role="tablist" aria-label="Nguồn tri thức">
          <span role="tab" aria-selected className="px-1 h-10 text-sm font-medium flex items-center gap-1.5 border-b-2 border-primary text-primary">
            <FileText size={15} /> Tài liệu
            {isAgentView && <span className="text-xs px-1.5 rounded-md bg-primary/10 tabular-nums">{docCount}</span>}
          </span>
          {comingSoon("Website", Globe)}
          {comingSoon("Câu hỏi thường gặp", HelpCircle)}
          {!isAgentView && comingSoon("SharePoint", Database)}
        </div>
        {isAgentView ? (
          <div ref={setToolbarTarget} className="pb-2" />
        ) : isProcessing ? (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="flex items-center gap-1.5 text-xs text-muted-foreground outline-none">
                <Loader2 size={13} className="animate-spin" /> Đang xử lý
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">Nhân sự số dùng được nội dung mới sau khi xử lý xong.</TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {/* Notes */}
      {isAgentView && !linkedInAgent && !noteDismissed && (
        <div className="flex items-start gap-2.5 rounded-lg bg-muted px-3.5 py-3 mb-4 text-sm">
          <Users size={15} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="flex-1 text-muted-foreground">
            <span className="font-medium text-foreground">Ai được Nhân sự số trả lời bằng tri thức này?</span>{" "}
            Mọi người trò chuyện với Nhân sự số này, kể cả khách trên các kênh của Nhân sự số. Để giới hạn, hãy chỉnh đối tượng ở Publish / Channels của Nhân sự số.{" "}
            {onOpenChannels && <button onClick={onOpenChannels} className="font-medium text-primary hover:underline">Mở Channels</button>}
          </p>
          <button onClick={() => setNoteDismissed(true)} aria-label="Ẩn ghi chú" className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-background transition-base shrink-0">
            <X size={14} />
          </button>
        </div>
      )}
      {linkedInAgent && (
        <div className="flex items-center gap-2.5 rounded-lg bg-muted px-3.5 py-3 mb-4 text-sm">
          <Database size={15} className="shrink-0 text-muted-foreground" />
          <p className="flex-1 text-muted-foreground">
            {canEdit
              ? "Kho tri thức này được liên kết từ Space. Thay đổi ở đây áp dụng cho mọi Nhân sự số đang dùng kho này."
              : `Kho tri thức này được liên kết từ Space. Bạn chỉ xem được nội dung - Liên hệ ${kb.ownerName} nếu cần quyền chỉnh sửa.`}
          </p>
          <a href={`/knowledge/${kb.id}?viaAgent=${agentId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline shrink-0">
            Mở trong Kho tri thức <ExternalLink size={13} />
          </a>
        </div>
      )}
      {!isAgentView && viewOnly && (
        <p className="rounded-lg bg-muted px-3.5 py-2.5 mb-4 text-sm text-muted-foreground">Bạn đang xem kho tri thức được chia sẻ. Liên hệ {kb.ownerName} nếu cần quyền chỉnh sửa.</p>
      )}

      <KnowledgeDocumentsTab
        kbId={kb.id}
        viewOnly={!canEdit}
        variant={variant}
        onOpenDoc={onOpenDoc}
        toolbarTarget={isAgentView ? toolbarTarget : undefined}
      />

      {showEdit && <CreateKnowledgeBaseModal open={showEdit} editingKb={kb} onClose={() => setShowEdit(false)} onCreated={refresh} />}
      {showShare && (
        <ShareKnowledgeBaseModal
          open={showShare}
          name={kb.name}
          ownerName={kb.ownerName}
          sharing={kb.sharing}
          resourceOwnerId={kb.ownerId}
          attachedAgentIds={kb.attachedByAgentIds}
          agentOnlyFor={kb.agentOnlyFor}
          onSave={sharing => {
            knowledgeBaseStore.updateSharing(kb.id, sharing);
            if (sharing.mode === "private" && kb.sharing.mode !== "private") notifySpaceOwner("resource_unshared", actor, kb, "kho tri thức", `/knowledge/${kb.id}`);
          }}
          onClose={() => { setShowShare(false); refresh(); }}
        />
      )}
      {showRetrieval && (
        <RetrievalScopeModal
          name={kb.name}
          value={kb.querySharing}
          onSave={q => knowledgeBaseStore.updateQuerySharing(kb.id, q)}
          onClose={() => { setShowRetrieval(false); refresh(); }}
        />
      )}
      {showDelete && <DeleteKnowledgeBaseDialog open={showDelete} kb={kb} onClose={() => setShowDelete(false)} onDeleted={() => (onDeleted ?? onBack)()} />}
      <AlertDialog open={showClear} onOpenChange={setShowClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa toàn bộ nội dung?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ {docs.length} tài liệu và thư mục trong "{kb.name}" sẽ bị xóa vĩnh viễn. Kho tri thức và quyền của kho vẫn được giữ. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                knowledgeDocumentStore.removeMany(docs.map(d => d.id));
                toast.success(`Đã xóa toàn bộ nội dung của "${kb.name}".`);
                setShowClear(false);
                refresh();
              }}
            >
              Xóa toàn bộ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
  );
}

/** "Truy cập: Cả Space" / "Truy xuất: Cả tổ chức" - a button for whoever may change it. */
function PermissionChip({ Icon, prefix, value, tip, canManage, onClick }: {
  Icon: typeof Users; prefix: string; value: string; tip: string; canManage: boolean; onClick: () => void;
}) {
  const body = (
    <>
      <Icon size={13} className="shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{prefix}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </>
  );
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        {canManage ? (
          <button
            type="button"
            onClick={onClick}
            aria-label={`Đổi ${tip.toLowerCase()} (hiện tại: ${value})`}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border border-primary/25 bg-primary-soft/50 text-xs hover:border-primary/50 transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {body}
            <ChevronDown size={12} className="text-muted-foreground" />
          </button>
        ) : (
          <span tabIndex={0} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border border-border bg-muted text-xs cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{body}</span>
        )}
      </TooltipTrigger>
      <TooltipContent>{canManage ? `Đổi ${tip.toLowerCase()}` : tip}</TooltipContent>
    </Tooltip>
  );
}
