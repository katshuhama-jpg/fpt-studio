import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { knowledgeUrlStore, type KnowledgeUrl } from "./knowledgeUrlStore";
import { knowledgeSettingsStore, describeSchedule, type ScheduleConfig } from "./knowledgeSettingsStore";
import ScheduleBuilder from "./ScheduleBuilder";

export default function UrlScheduleOverrideModal({ kbId, url, onClose }: { kbId: string; url: KnowledgeUrl; onClose: () => void }) {
  const kbSchedule = knowledgeSettingsStore.get(kbId).schedule;
  const [useOverride, setUseOverride] = useState(!!url.scheduleOverride?.enabled);
  const [schedule, setSchedule] = useState<ScheduleConfig>(url.scheduleOverride?.schedule ?? kbSchedule);

  const save = () => {
    knowledgeUrlStore.setScheduleOverride(url.id, useOverride ? { enabled: true, schedule } : undefined);
    toast.success("Đã lưu lịch đồng bộ.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Lịch đồng bộ riêng</DialogTitle>
          <DialogDescription className="font-mono text-xs truncate">{url.url}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div
            onClick={() => setUseOverride(false)}
            className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-base ${!useOverride ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"}`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${!useOverride ? "border-primary" : "border-border"}`}>
              {!useOverride && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">Theo lịch chung của kho</div>
              <div className="text-xs text-muted-foreground mt-0.5">{describeSchedule(kbSchedule)}</div>
            </div>
          </div>

          <div
            onClick={() => setUseOverride(true)}
            className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-base ${useOverride ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"}`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${useOverride ? "border-primary" : "border-border"}`}>
              {useOverride && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Lịch riêng cho URL này</div>
              {useOverride && <div className="mt-3"><ScheduleBuilder value={schedule} onChange={setSchedule} /></div>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={save} className="btn-primary h-9">Lưu</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
