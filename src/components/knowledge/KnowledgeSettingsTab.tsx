import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { knowledgeSettingsStore, type ScheduleConfig } from "./knowledgeSettingsStore";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeUrlStore } from "./knowledgeUrlStore";
import { knowledgeFaqStore } from "./knowledgeFaqStore";
import type { KnowledgeBase } from "./knowledgeBaseStore";
import ScheduleBuilder from "./ScheduleBuilder";
import DeleteKnowledgeBaseDialog from "./DeleteKnowledgeBaseDialog";

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
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={() => { onConfirm(); setTyped(""); }} disabled={!matches} className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-medium transition-base disabled:opacity-40 disabled:pointer-events-none">Xác nhận và xóa</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function KnowledgeSettingsTab({ kb, viewOnly, onChanged, onDeleted }: {
  kb: KnowledgeBase; viewOnly: boolean; onChanged: () => void; onDeleted: () => void;
}) {
  const [saved, setSaved] = useState(() => knowledgeSettingsStore.get(kb.id));
  const [draft, setDraft] = useState(saved);

  const [showClearContent, setShowClearContent] = useState(false);
  const [showDeleteKb, setShowDeleteKb] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const saveAll = () => {
    knowledgeSettingsStore.update(kb.id, draft);
    setSaved(draft);
    toast.success("Đã lưu cài đặt kho tri thức.");
    onChanged();
  };
  const discard = () => setDraft(saved);

  const urlsWithOverride = knowledgeUrlStore.list(kb.id).filter(u => u.scheduleOverride?.enabled);

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8 pb-24">
      <div className="max-w-2xl space-y-6">
        <section className="rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold">Lịch đồng bộ tự động</h2>
            <Toggle enabled={draft.scheduleEnabled} disabled={viewOnly} onChange={() => setDraft(d => ({ ...d, scheduleEnabled: !d.scheduleEnabled }))} />
          </div>
          <p className="text-xs text-muted-foreground mb-4">Tự động đồng bộ theo lịch</p>
          {draft.scheduleEnabled && (
            <div className="pt-2 border-t border-border">
              <ScheduleBuilder value={draft.schedule} onChange={(schedule: ScheduleConfig) => setDraft(d => ({ ...d, schedule }))} />
            </div>
          )}
          {urlsWithOverride.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              <span className="font-medium text-foreground">{urlsWithOverride.length}</span> URL có lịch riêng — quản lý trong tab Website.
            </p>
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
              <p className="text-xs text-muted-foreground mt-0.5">Tự động tải các tệp đính kèm tìm thấy trong URL và thêm vào mục Tài liệu.</p>
              {draft.autoDownloadAttachments && (
                <div className="mt-2">
                  <label className="text-xs font-medium mb-1 block">Thư mục lưu tệp đính kèm</label>
                  <select value={draft.attachmentFolderId ?? ""} onChange={e => setDraft(d => ({ ...d, attachmentFolderId: e.target.value || null }))} className="h-8 px-2 rounded-lg border border-border bg-white text-xs outline-none focus:border-primary transition-base">
                    <option value="">Danh sách tài liệu chung</option>
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

        {!viewOnly && (
          <section className="rounded-xl border border-destructive/30 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-destructive">Vùng nguy hiểm</h2>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Xóa toàn bộ nội dung kho tri thức</p>
                <p className="text-xs text-muted-foreground mt-0.5">Xóa vĩnh viễn mọi tài liệu, URL, FAQ và chunk — kho tri thức vẫn tồn tại nhưng sẽ trống.</p>
              </div>
              <button onClick={() => setShowClearContent(true)} className="h-9 px-4 rounded-lg border border-destructive/30 text-destructive hover:bg-[hsl(var(--destructive-soft))] text-sm font-medium transition-base shrink-0">Xóa nội dung</button>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Xóa kho tri thức</p>
                <p className="text-xs text-muted-foreground mt-0.5">Xóa vĩnh viễn kho tri thức này và toàn bộ nội dung bên trong.</p>
              </div>
              <button onClick={() => setShowDeleteKb(true)} className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-medium transition-base shrink-0">Xóa kho tri thức</button>
            </div>
          </section>
        )}
      </div>

      {dirty && !viewOnly && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-white px-4 sm:px-8 py-3 flex items-center justify-between gap-4 shadow-elev">
          <span className="text-sm text-muted-foreground">Bạn có thay đổi chưa lưu.</span>
          <div className="flex items-center gap-2">
            <button onClick={discard} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hoàn tác</button>
            <button onClick={saveAll} className="btn-primary h-9">Lưu thay đổi</button>
          </div>
        </div>
      )}

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
          onChanged();
        }}
      />
      {showDeleteKb && <DeleteKnowledgeBaseDialog open={showDeleteKb} kb={kb} onClose={() => setShowDeleteKb(false)} onDeleted={onDeleted} />}
    </div>
  );
}
