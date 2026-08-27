import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const REASON_MAX = 500;

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
            The connection settings and its history will be permanently removed. Agents using this external agent will stop working.
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

/** Reject — Submitted for Approval → Rejected, requires a reason (max 500 chars) that gets
 * written to History and shown back to the creator as a banner on the detail page. Saving an
 * edit from Rejected is what moves it back to Draft for resubmission. */
export function RejectExternalAgentDialog({ name, open, onOpenChange, onConfirm }: {
  name: string; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();

  return (
    <AlertDialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) setReason(""); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject "{name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            It will be marked Rejected with your note. The creator can edit the connection and resubmit it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <label className="text-xs font-medium mb-1.5 block" htmlFor="reject-reason">Reason for rejection *</label>
          <Textarea
            id="reject-reason"
            autoFocus
            rows={3}
            maxLength={REASON_MAX}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="What needs to change before this can be approved?"
          />
          <div className="flex items-center justify-between mt-1">
            {trimmed.length === 0 && <span className="text-[11px] text-muted-foreground">Required.</span>}
            <span className="text-[11px] text-muted-foreground ml-auto">{reason.length}/{REASON_MAX}</span>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={trimmed.length === 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 disabled:pointer-events-none"
            onClick={() => { onConfirm(trimmed); setReason(""); }}
          >
            Reject
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Unpublish-from-all-channels confirmation — shown when Publish is clicked with every
 * channel unchecked while the agent is currently Published (Published → Approved). */
export function UnpublishExternalAgentDialog({ name, open, onOpenChange, onConfirm }: {
  name: string; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unpublish from all channels?</AlertDialogTitle>
          <AlertDialogDescription>
            "{name}" will stop receiving requests from every channel it's currently published to. You can publish it again at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Unpublish</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
