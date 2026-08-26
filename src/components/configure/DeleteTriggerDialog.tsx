import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { triggerStore, type TriggerRecord } from "./triggerStore";
import { toast } from "sonner";

/** Shared "delete this trigger" confirmation — used by both the Triggers page
 * (TriggersTab) and the compact right-rail Triggers box (AgentBuilder's TriggersInner)
 * so the copy and the delete side-effect can't drift between the two entry points. */
export default function DeleteTriggerDialog({ agentId, target, onOpenChange, onDeleted }: {
  agentId: string;
  target: TriggerRecord | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá trigger "{target?.name}"?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <ul className="space-y-1.5 text-left list-disc pl-4">
              <li>Agent sẽ không còn tự chạy theo trigger này.</li>
              <li>Cấu hình webhook URL / lịch / điều kiện sự kiện sẽ bị xoá và không khôi phục được.</li>
              <li>Lịch sử chạy đã ghi nhận vẫn được giữ lại.</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (!target) return;
              const delName = target.name;
              triggerStore.remove(agentId, target.id);
              toast.success(`Đã xoá trigger "${delName}".`);
              onOpenChange(false);
              onDeleted?.();
            }}
          >
            Xoá trigger
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
