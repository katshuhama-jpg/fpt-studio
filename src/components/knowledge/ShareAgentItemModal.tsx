import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CURRENT_USER, DEFAULT_QUERY_SHARING,
  type Sharing, type SharingMode, type QuerySharing,
} from "./knowledgeBaseStore";
import QueryScopeSection, { AccessScopeSection, isQueryScopeValid, isRetrievalNarrowing, normalizeQuerySharing } from "./QueryScopeSection";
import { knowledgeStore, type KnowledgeItem } from "./knowledgeStore";

/** Merged "Chia sẻ" dialog for an Agent's own Knowledge item (doc/url/FAQ in the "Cá nhân"
 * bucket) — replaces what used to be two separate row actions ("Chia sẻ" and "Chuyển thành kho
 * tri thức chung") with a single popup covering two independent permission questions:
 *
 * 1. `Sharing`/`SharingMode` ("Quyền xây Agent") — same model a Console KB uses:
 *    which OTHER BUILDERS can see/reuse this item in Console when building their own Agents.
 * 2. `QuerySharing`/`QueryScopeMode` ("Phạm vi trả lời") — a new, independent
 *    axis controlling which END USERS an already-published Agent may draw on this item for when
 *    answering a live chat. A "Chỉ mình tôi" item can still be answered broadly, and a
 *    "Tất cả người dùng trong Space" item can still be answer-restricted — the two questions don't
 *    imply each other.
 *
 * `RadioCard` and the "Phạm vi trả lời" field itself live in QueryScopeSection.tsx, shared with
 * the Console Knowledge creation modals (CreateKnowledgeBaseModal, ConnectExternalKnowledgeBaseModal)
 * so all three render the identical control instead of drifting copies.
 *
 * There's no more "promote to a newly-named Console KB" step: the item stays exactly where it
 * is, and both permissions are just metadata on it, matching how `sharing` already worked before
 * this merge. */
export default function ShareAgentItemModal({ agentId, items, onClose }: {
  agentId: string; items: KnowledgeItem[]; onClose: () => void;
}) {
  const single = items.length === 1 ? items[0] : undefined;
  const initialSharing: Sharing = single?.sharing ?? { mode: "private", people: [] };
  const initialQuerySharing: QuerySharing = normalizeQuerySharing(single?.querySharing ?? DEFAULT_QUERY_SHARING);

  // An item created in the Agent is not shared by default ("private" = "Chỉ Agent này").
  const [buildMode, setBuildMode] = useState<SharingMode>(initialSharing.mode);
  const [buildPeople, setBuildPeople] = useState(initialSharing.people);
  const [querySharing, setQuerySharing] = useState<QuerySharing>(initialQuerySharing);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const canSubmit =
    (buildMode !== "specific" || buildPeople.length > 0) &&
    isQueryScopeValid(querySharing);

  // Downgrading Console-wide build access away from "all" is the one change worth an explicit
  // confirm — it can silently cut off other builders mid-project. The new query-scope axis has
  // no equivalent history to downgrade from (it's brand new), so it never triggers this.
  const downgrading = (initialSharing.mode === "all" && buildMode !== "all") ||
    (initialSharing.mode !== "private" && buildMode === "private");
  const retrievalNarrowing = !!single && isRetrievalNarrowing(initialQuerySharing, querySharing);

  const applySave = () => {
    const sharing: Sharing = { mode: buildMode, people: buildMode === "specific" ? buildPeople : [] };
    for (const item of items) {
      if (buildMode === "private") {
        knowledgeStore.updateSharing(agentId, item.id, sharing);
        knowledgeStore.updateQuerySharing(agentId, item.id, querySharing);
      } else {
        // Shared: the item becomes a Space knowledge base this Agent links, so other Agents
        // can find and link it too.
        knowledgeStore.shareItem(agentId, item.id, sharing, querySharing);
      }
    }
    toast.success(buildMode === "private"
      ? "Đã cập nhật quyền truy cập và truy xuất."
      : items.length > 1 ? `Đã chia sẻ ${items.length} mục thành kho tri thức trong Space.` : "Đã chia sẻ thành kho tri thức trong Space.");
    onClose();
  };

  const save = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    if (downgrading || retrievalNarrowing) { setShowRevokeConfirm(true); return; }
    applySave();
  };

  return (
    <>
      <Dialog open onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Quyền truy cập & truy xuất</DialogTitle>
            {single ? <DialogDescription>{single.name}</DialogDescription> : <DialogDescription>{items.length} mục đã chọn</DialogDescription>}
          </DialogHeader>

          <div className="space-y-6 py-1">
            <AccessScopeSection
              mode={buildMode}
              people={buildPeople}
              onModeChange={setBuildMode}
              onPeopleChange={setBuildPeople}
              submitAttempted={submitAttempted}
              ownerRow={{ name: CURRENT_USER.name, email: CURRENT_USER.email }}
              agentOnly
            />

            <div className="border-t border-border pt-5">
              <QueryScopeSection
                value={querySharing}
                onChange={setQuerySharing}
                submitAttempted={submitAttempted}
                ownerRow={{ name: CURRENT_USER.name, email: CURRENT_USER.email }}
              />
            </div>
          </div>

          <DialogFooter>
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
            <button onClick={save} className="btn-primary h-9">Lưu</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{!downgrading ? "Thu hẹp quyền truy xuất?" : buildMode === "private" ? "Tắt chia sẻ?" : "Thu hẹp quyền truy cập?"}</AlertDialogTitle>
            <AlertDialogDescription>{!downgrading
              ? "Agent sẽ ngừng trả lời cho người ngoài các phòng ban đã chọn."
              : buildMode === "private"
                ? "Chỉ Agent này dùng được nội dung này nữa."
                : "Người không có trong danh sách sẽ không dùng được nội dung này nữa."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setShowRevokeConfirm(false); applySave(); }}>{downgrading && buildMode === "private" ? "Tắt chia sẻ" : "Thu hẹp quyền"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
