import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PencilLine, Upload, ChevronRight } from "lucide-react";

/** "Tạo kỹ năng" entry point — field-for-field port of Console's own choice dialog: two big
 * option rows, "Viết hướng dẫn kỹ năng" (the existing manual CreateSkillModal form) and
 * "Tải lên kỹ năng" (UploadSkillModal, new). Shown wherever the app previously jumped straight
 * from a single "Create Skill" button into the manual form — Console Skills (Home) and the
 * Agent's Skills tab both do that; the Instructions "Kết nối" widget already exposes the same
 * two choices as separate menu items instead, so it wires straight into the two modals without
 * this extra step. */
export default function CreateSkillChoiceModal({ onClose, onChooseManual, onChooseUpload }: {
  onClose: () => void;
  onChooseManual: () => void;
  onChooseUpload: () => void;
}) {
  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Tạo kỹ năng</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Chọn cách bạn muốn thêm kỹ năng mới.</p>

        <div className="space-y-2.5 py-1">
          <button
            onClick={onChooseManual}
            className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-left transition-base"
          >
            <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0"><PencilLine size={15} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Viết hướng dẫn kỹ năng</span>
              <span className="block text-xs text-muted-foreground mt-0.5">Soạn kỹ năng trực tiếp — mô tả bằng AI hoặc điền form thủ công.</span>
            </span>
            <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
          </button>

          <button
            onClick={onChooseUpload}
            className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-left transition-base"
          >
            <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0"><Upload size={15} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Tải lên kỹ năng</span>
              <span className="block text-xs text-muted-foreground mt-0.5">Tải lên file .md, .zip hoặc .skill đã định nghĩa sẵn kỹ năng.</span>
            </span>
            <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
