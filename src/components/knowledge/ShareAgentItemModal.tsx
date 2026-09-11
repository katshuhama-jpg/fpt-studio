import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  CURRENT_USER, DEFAULT_QUERY_SHARING,
  type Sharing, type SharingMode, type QuerySharing, type QueryScopeMode,
} from "./knowledgeBaseStore";
import { useOrg } from "@/pages/organization/orgStore";
import { collectUnitsWithDepth } from "@/pages/organization/orgData";
import MemberPicker from "./MemberPicker";
import { knowledgeStore, type KnowledgeItem } from "./knowledgeStore";

const BUILD_ACCESS_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Cả Console", helper: "Mọi builder đều dùng được." },
  { value: "specific", label: "Người cụ thể", helper: "Chỉ người bạn chọn." },
];

const QUERY_SCOPE_OPTIONS: { value: QueryScopeMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi", helper: "Chỉ khi bạn tự chat thử." },
  { value: "all_org", label: "Cả tổ chức", helper: "Trả lời mọi người trong tổ chức." },
  { value: "department", label: "Theo phòng ban", helper: "Chỉ người trong phòng ban đã chọn." },
  { value: "specific", label: "Người cụ thể", helper: "Chỉ đúng người bạn chọn." },
];

function RadioCard({ selected, onSelect, label, helper, children }: {
  selected: boolean; onSelect: () => void; label: string; helper?: string; children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        onClick={onSelect}
        className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-base ${
          selected ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"
        }`}
      >
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selected ? "border-primary" : "border-border"}`}>
          {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          {helper && <div className="text-xs text-muted-foreground mt-0.5">{helper}</div>}
        </div>
      </div>
      {selected && children && <div className="mt-2 pl-3.5">{children}</div>}
    </div>
  );
}

/** "Chọn phòng ban" picker for QuerySharing's department mode — a simple checklist over the org
 * tree's units (flattened, indented by depth), since this prototype has no separate
 * department/team entity distinct from OrgUnit. */
function DepartmentPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const { tree } = useOrg();
  const units = useMemo(() => collectUnitsWithDepth(tree), [tree]);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);

  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-white divide-y divide-border">
      {units.map(({ unit, depth }) => {
        const checked = value.includes(unit.id);
        return (
          <button
            key={unit.id}
            type="button"
            onClick={() => toggle(unit.id)}
            style={{ paddingLeft: `${12 + (depth - 1) * 16}px` }}
            className="w-full flex items-center gap-2.5 pr-3 py-2 text-left hover:bg-surface-muted transition-base"
          >
            <div className={`w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center ${checked ? "bg-primary border-primary" : "border-border"}`}>
              {checked && <Check size={11} className="text-primary-foreground" />}
            </div>
            <span className="text-sm truncate">{unit.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Merged "Chia sẻ" dialog for an Agent's own Knowledge item (doc/url/FAQ in the "Cá nhân"
 * bucket) — replaces what used to be two separate row actions ("Chia sẻ" and "Chuyển thành kho
 * tri thức chung") with a single popup covering two independent permission questions:
 *
 * 1. `Sharing`/`SharingMode` ("Quyền xây Agent") — same model a Console KB uses:
 *    which OTHER BUILDERS can see/reuse this item in Console when building their own Agents.
 * 2. `QuerySharing`/`QueryScopeMode` ("Phạm vi trả lời") — a new, independent
 *    axis controlling which END USERS an already-published Agent may draw on this item for when
 *    answering a live chat. A "Chỉ mình tôi" item can still be answered broadly, and a
 *    "Tất cả người dùng Console" item can still be answer-restricted — the two questions don't
 *    imply each other.
 *
 * There's no more "promote to a newly-named Console KB" step: the item stays exactly where it
 * is, and both permissions are just metadata on it, matching how `sharing` already worked before
 * this merge. */
export default function ShareAgentItemModal({ agentId, items, onClose }: {
  agentId: string; items: KnowledgeItem[]; onClose: () => void;
}) {
  const single = items.length === 1 ? items[0] : undefined;
  const initialSharing: Sharing = single?.sharing ?? { mode: "private", people: [] };
  const initialQuerySharing: QuerySharing = single?.querySharing ?? DEFAULT_QUERY_SHARING;

  const [buildMode, setBuildMode] = useState<SharingMode>(initialSharing.mode);
  const [buildPeople, setBuildPeople] = useState(initialSharing.people);
  const [queryMode, setQueryMode] = useState<QueryScopeMode>(initialQuerySharing.mode);
  const [queryDepartmentIds, setQueryDepartmentIds] = useState(initialQuerySharing.departmentIds);
  const [queryPeople, setQueryPeople] = useState(initialQuerySharing.people);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const canSubmit =
    (buildMode !== "specific" || buildPeople.length > 0) &&
    (queryMode !== "specific" || queryPeople.length > 0) &&
    (queryMode !== "department" || queryDepartmentIds.length > 0);

  // Downgrading Console-wide build access away from "all" is the one change worth an explicit
  // confirm — it can silently cut off other builders mid-project. The new query-scope axis has
  // no equivalent history to downgrade from (it's brand new), so it never triggers this.
  const downgrading = initialSharing.mode === "all" && buildMode !== "all";

  const applySave = () => {
    const sharing: Sharing = { mode: buildMode, people: buildMode === "specific" ? buildPeople : [] };
    const querySharing: QuerySharing = {
      mode: queryMode,
      departmentIds: queryMode === "department" ? queryDepartmentIds : [],
      people: queryMode === "specific" ? queryPeople : [],
    };
    for (const item of items) {
      knowledgeStore.updateSharing(agentId, item.id, sharing);
      knowledgeStore.updateQuerySharing(agentId, item.id, querySharing);
    }
    toast.success("Đã cập nhật quyền chia sẻ.");
    onClose();
  };

  const save = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    if (downgrading) { setShowRevokeConfirm(true); return; }
    applySave();
  };

  return (
    <>
      <Dialog open onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Chia sẻ & quyền truy cập</DialogTitle>
            {single ? <DialogDescription>{single.name}</DialogDescription> : <DialogDescription>{items.length} mục đã chọn</DialogDescription>}
          </DialogHeader>

          <div className="space-y-6 py-1">
            <div>
              <label className="text-sm font-medium block">Quyền xây Agent</label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">Ai được dùng tài liệu này để xây Agent trong Console.</p>
              <div className="space-y-2">
                {BUILD_ACCESS_OPTIONS.map(opt => (
                  <RadioCard key={opt.value} selected={buildMode === opt.value} onSelect={() => setBuildMode(opt.value)} label={opt.label} helper={opt.helper}>
                    {opt.value === "specific" && (
                      <>
                        <MemberPicker value={buildPeople} onChange={setBuildPeople} ownerRow={{ name: CURRENT_USER.name, email: CURRENT_USER.email }} />
                        {submitAttempted && buildPeople.length === 0 && <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người để chia sẻ.</p>}
                      </>
                    )}
                  </RadioCard>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <label className="text-sm font-medium block">Phạm vi trả lời</label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">Agent đã publish dùng tài liệu này để trả lời ai.</p>
              <div className="space-y-2">
                {QUERY_SCOPE_OPTIONS.map(opt => (
                  <RadioCard key={opt.value} selected={queryMode === opt.value} onSelect={() => setQueryMode(opt.value)} label={opt.label} helper={opt.helper}>
                    {opt.value === "department" && (
                      <>
                        <DepartmentPicker value={queryDepartmentIds} onChange={setQueryDepartmentIds} />
                        {submitAttempted && queryDepartmentIds.length === 0 && <p className="text-xs text-destructive mt-1.5">Chọn ít nhất một phòng ban.</p>}
                      </>
                    )}
                    {opt.value === "specific" && (
                      <>
                        <MemberPicker value={queryPeople} onChange={setQueryPeople} ownerRow={{ name: CURRENT_USER.name, email: CURRENT_USER.email }} />
                        {submitAttempted && queryPeople.length === 0 && <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người.</p>}
                      </>
                    )}
                  </RadioCard>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
            <button onClick={save} disabled={!canSubmit} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Lưu</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thu hồi quyền truy cập?</AlertDialogTitle>
            <AlertDialogDescription>Những người khác đang dùng nội dung này để xây Agent sẽ không còn thấy được nữa.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setShowRevokeConfirm(false); applySave(); }}>Thu hồi quyền</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
