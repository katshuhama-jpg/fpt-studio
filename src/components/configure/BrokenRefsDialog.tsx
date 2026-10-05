import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefChip } from "./refChip";
import type { BrokenRef } from "./instructionRefs";
import { parseToken } from "./instructionRefs";

/** Shown when Publish is pressed while Instructions still reference resources that are gone or
 * not allowed. It never blocks: "Vẫn publish" goes ahead, "Xem" jumps to the first bad chip. */
export default function BrokenRefsDialog({ agentId, broken, onView, onPublishAnyway, onCancel }: {
  agentId: string;
  broken: BrokenRef[];
  onView: () => void;
  onPublishAnyway: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={v => { if (!v) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Instructions có {broken.length} tham chiếu lỗi</AlertDialogTitle>
          <AlertDialogDescription>
            Agent sẽ không dùng được các tài nguyên dưới đây khi chạy. Bạn có thể xem và sửa, hoặc vẫn publish.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="max-h-60 overflow-y-auto space-y-2">
          {broken.map((b, i) => {
            const ref = parseToken(b.ref.token);
            return (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                {ref ? <RefChip agentId={agentId} reference={ref} /> : <span>{b.ref.label}</span>}
                <span className="text-xs text-muted-foreground text-right">{b.reason}</span>
              </li>
            );
          })}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Hủy</AlertDialogCancel>
          <AlertDialogCancel onClick={onView}>Xem</AlertDialogCancel>
          <AlertDialogAction onClick={onPublishAnyway}>Vẫn publish</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
