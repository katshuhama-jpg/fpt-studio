import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

/** Delete confirmation — used from both the list row menu and the detail page's "⋯" menu,
 * so the copy and the destructive action can't drift between the two entry points. */
export function DeleteExternalAgentDialog({ name, open, onOpenChange, onConfirm }: {
  name: string; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            The connection settings will be permanently removed. Conversation history will be archived (no longer visible), and the Activity log is kept for reference.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Pause confirmation — Published → Paused, admin-only action. */
export function PauseExternalAgentDialog({ name, open, onOpenChange, onConfirm }: {
  name: string; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pause this external agent?</AlertDialogTitle>
          <AlertDialogDescription>
            "{name}" will stop responding to calls. Conversations currently using it will stop working until you resume it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Pause</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Reject confirmation — Pending approval → Rejected, simulating the current user as an FPT
 * admin (no real role check, per the BA/UX-review scope). Mirrors the Delete dialog's style,
 * with a required reason field that's stored and shown back to the AI Engineer. */
export function RejectExternalAgentDialog({ name, open, onOpenChange, onConfirm }: {
  name: string; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject "{name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Tell the AI Engineer why this connection isn't ready to publish. They'll see this reason and can fix it before submitting again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-1">
          <label className="text-sm font-medium mb-1.5 block" htmlFor="reject-reason">Reason <span className="text-destructive">*</span></label>
          <Textarea
            id="reject-reason"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain what needs to change before this can be approved."
            className="text-sm resize-none"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 disabled:pointer-events-none"
            onClick={() => onConfirm(reason.trim())}
          >
            Reject
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Rotate signing secret confirmation — the old secret stops verifying immediately, so the
 * agent must be updated with the new one before the next request or it'll reject everything. */
export function RotateSigningSecretDialog({ open, onOpenChange, onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rotate signing secret?</AlertDialogTitle>
          <AlertDialogDescription>
            Your agent will reject platform requests until you update it with the new secret. Existing conversations may fail.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Rotate</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Replace bearer token confirmation — shown from the Detail page's "Replace token" link before
 * jumping into the edit modal's token field. */
export function ReplaceTokenConfirmDialog({ open, onOpenChange, onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace bearer token?</AlertDialogTitle>
          <AlertDialogDescription>
            The platform will use the new token on the next request. If it is wrong, this agent will stop responding.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Replace</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
