import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { knowledgeSettingsStore, shortCadence, type ScheduleConfig } from "./knowledgeSettingsStore";
import { knowledgeUrlStore } from "./knowledgeUrlStore";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import ScheduleBuilder from "./ScheduleBuilder";

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={enabled}
      className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        enabled ? "bg-primary border-primary" : "bg-surface-muted border-border"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

/** Right-side drawer for the Website tab's "Cài đặt đồng bộ" button — relocated from the
 * former Kho-tri-thức-level "Cài đặt" tab, since these settings only ever affect crawled URLs. */
export default function SyncSettingsDrawer({ kbId, viewOnly, onClose, onSaved }: {
  kbId: string; viewOnly: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [saved, setSaved] = useState(() => knowledgeSettingsStore.get(kbId));
  const [draft, setDraft] = useState(saved);
  const [showOverrides, setShowOverrides] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const folders = knowledgeDocumentStore.listFolders(kbId);
  const urlsWithOverride = knowledgeUrlStore.list(kbId).filter(u => u.scheduleOverride?.enabled);

  const attemptClose = () => {
    if (dirty && !viewOnly) { setShowDiscardConfirm(true); return; }
    onClose();
  };

  const saveAll = () => {
    knowledgeSettingsStore.update(kbId, draft);
    setSaved(draft);
    toast.success("Đã lưu cài đặt đồng bộ.");
    onSaved();
    onClose();
  };

  return (
    <>
      <Sheet open onOpenChange={v => !v && attemptClose()}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Cài đặt đồng bộ</SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground -mt-2 mb-2">Áp dụng cho các URL trong kho tri thức này.</p>

          <div className="flex-1 overflow-y-auto space-y-5 pb-24">
            <section className="rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold">Lịch đồng bộ</h2>
                <Toggle enabled={draft.scheduleEnabled} disabled={viewOnly} onChange={() => setDraft(d => ({ ...d, scheduleEnabled: !d.scheduleEnabled }))} />
              </div>
              <p className="text-xs text-muted-foreground mb-4">Tự động đồng bộ theo lịch</p>
              {draft.scheduleEnabled && (
                <div className="pt-2 border-t border-border">
                  <ScheduleBuilder value={draft.schedule} onChange={(schedule: ScheduleConfig) => setDraft(d => ({ ...d, schedule }))} />
                </div>
              )}
              {urlsWithOverride.length > 0 && (
                <div className="mt-4">
                  <button onClick={() => setShowOverrides(v => !v)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    Xem URL có lịch riêng ({urlsWithOverride.length})
                    <ChevronDown size={12} className={`transition-base ${showOverrides ? "rotate-180" : ""}`} />
                  </button>
                  {showOverrides && (
                    <div className="mt-2 space-y-2">
                      {urlsWithOverride.map(u => (
                        <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{u.title ?? u.name}</p>
                            {u.scheduleOverride && <p className="text-[11px] text-muted-foreground">{shortCadence(u.scheduleOverride.schedule)}</p>}
                          </div>
                          {!viewOnly && (
                            <button
                              onClick={() => { knowledgeUrlStore.setScheduleOverride(u.id, undefined); onSaved(); setShowOverrides(v => urlsWithOverride.length > 1 ? v : false); }}
                              className="text-xs font-semibold text-primary hover:underline shrink-0"
                            >
                              Đưa về lịch chung
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border p-5 space-y-5">
              <h2 className="text-sm font-semibold">Tùy chọn đồng bộ</h2>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Tự động đồng bộ nội dung từ URL hiện có</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tự động cập nhật nội dung của các URL đã thêm khi phát hiện thay đổi.</p>
                  {draft.syncExistingUrls && <p className="text-xs text-warning mt-1.5">Các chunk bạn đã chỉnh sửa thủ công được giữ nguyên và không bị ghi đè.</p>}
                </div>
                <Toggle enabled={draft.syncExistingUrls} disabled={viewOnly} onChange={() => setDraft(d => ({ ...d, syncExistingUrls: !d.syncExistingUrls }))} />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Tự động thêm URL mới từ sitemap</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tự động thêm các URL mới xuất hiện trong sitemap đã cấu hình.</p>
                </div>
                <Toggle enabled={draft.autoAddFromSitemap} disabled={viewOnly} onChange={() => setDraft(d => ({ ...d, autoAddFromSitemap: !d.autoAddFromSitemap }))} />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">Tự động tải tệp đính kèm vào kho tri thức</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tệp đính kèm tìm thấy trong URL sẽ được tải về và thêm vào tab Tài liệu.</p>
                  {draft.autoDownloadAttachments && (
                    <div className="mt-2">
                      <label className="text-xs font-medium mb-1 block">Thư mục lưu tệp đính kèm</label>
                      <select
                        value={draft.attachmentFolderId ?? ""}
                        onChange={e => setDraft(d => ({ ...d, attachmentFolderId: e.target.value || null }))}
                        className="h-8 px-2 rounded-lg border border-border bg-white text-xs outline-none focus:border-primary transition-base"
                      >
                        <option value="">Danh sách tài liệu chung</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <Toggle enabled={draft.autoDownloadAttachments} disabled={viewOnly} onChange={() => setDraft(d => ({ ...d, autoDownloadAttachments: !d.autoDownloadAttachments }))} />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Tạo phiên bản mới sau mỗi lần đồng bộ</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Lưu lại phiên bản trước để bạn có thể khôi phục nếu nội dung mới không đúng.</p>
                </div>
                <Toggle enabled={draft.createVersionOnSync} disabled={viewOnly} onChange={() => setDraft(d => ({ ...d, createVersionOnSync: !d.createVersionOnSync }))} />
              </div>
            </section>
          </div>

          {!viewOnly && (
            <div className="absolute bottom-0 left-0 right-0 -mx-6 -mb-6 border-t border-border bg-white px-6 py-3 flex items-center justify-end gap-2 shadow-elev">
              <button onClick={attemptClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
              <button onClick={saveAll} disabled={!dirty} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Lưu thay đổi</button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ thay đổi?</AlertDialogTitle>
            <AlertDialogDescription>Thông tin bạn vừa chỉnh sẽ không được lưu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDiscardConfirm(false); onClose(); }}>Bỏ thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
