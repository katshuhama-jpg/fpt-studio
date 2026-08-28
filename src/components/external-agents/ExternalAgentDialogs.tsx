import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
