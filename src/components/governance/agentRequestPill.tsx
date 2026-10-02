// Top-bar status pill on an Agent's own page (Builder view) while its publish request is waiting
// for review. Opens a popover with the request's key facts and lets the requester pull it back
// ("Rút yêu cầu") without leaving the Agent — the Builder shouldn't have to go to the Admin's
// review page just to see or cancel their own request.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Undo2, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { governanceStore, AUDIENCE_LABEL, type GovRequest } from "./governanceStore";
import { formatDateTime } from "./governanceUi";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";

export function PendingRequestPill({ req, onChanged }: { req: GovRequest; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const isRequester = req.requesterId === CURRENT_USER.id;

  const withdraw = () => {
    governanceStore.withdraw(req.id, CURRENT_USER.id, CURRENT_USER.name, "Người gửi đã rút yêu cầu.");
    toast.success(`Đã rút yêu cầu ${req.version ?? ""}. Agent giữ nguyên trạng thái trước khi gửi.`);
    setConfirm(false);
    setOpen(false);
    onChanged();
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium shrink-0 transition-base hover:opacity-80 bg-warning/10 border-warning/25 text-warning"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            Đang chờ duyệt · {req.version}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Yêu cầu {req.version} đang chờ duyệt</p>
            <p className="text-xs text-muted-foreground mt-0.5">Org/Unit Admin sẽ duyệt trước khi Agent tới người dùng.</p>
          </div>
          <div className="px-4 py-3 space-y-2.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">Gửi lúc</span>
              <span className="flex items-center gap-1 tabular-nums"><Clock size={12} className="text-muted-foreground" />{formatDateTime(req.submittedAt)}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground shrink-0">Gửi tới</span>
              <span className="text-right">
                {AUDIENCE_LABEL[req.audience]}
                {req.scopeSummary && <span className="block text-xs text-muted-foreground">{req.scopeSummary}</span>}
              </span>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
            <Link
              to={`/governance/requests/${req.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              Xem chi tiết yêu cầu <ExternalLink size={11} />
            </Link>
            {isRequester && (
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className="h-8 px-3 rounded-lg border border-destructive/30 text-destructive bg-white hover:bg-destructive/5 text-xs font-medium flex items-center gap-1.5 transition-base"
              >
                <Undo2 size={13} /> Rút yêu cầu
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rút yêu cầu {req.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              Admin sẽ không còn thấy yêu cầu này để duyệt. Agent giữ nguyên trạng thái hiện tại - Bạn có thể gửi lại bất cứ lúc nào.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ yêu cầu</AlertDialogCancel>
            <AlertDialogAction onClick={withdraw} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Rút yêu cầu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
