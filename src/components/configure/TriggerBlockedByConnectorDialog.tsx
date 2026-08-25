import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Shared "can't add a trigger" explanation — shown wherever an agent's per-user connection
 * blocks adding/duplicating a trigger, so the copy and the escape hatch (switch the connector
 * to shared) can't drift between the Triggers page and the compact right-rail Triggers box. */
export default function TriggerBlockedByConnectorDialog({ open, onOpenChange, connectorName, onSwitchToShared }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectorName: string;
  onSwitchToShared: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Can't add a trigger to this agent</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2.5 text-sm text-muted-foreground text-left">
              <p>
                This agent uses a per-user connection ({connectorName}). Triggers run in the background when
                nobody is signed in, so there is no personal account for the agent to borrow.
              </p>
              <p>
                To let the agent run automatically for the whole organization, switch the connection to a
                shared organization connection. To keep per-user connections, each person can set up their own
                triggers on the copy they install in Workspace.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Got it</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onOpenChange(false); onSwitchToShared(); }}>
            Switch to a shared connection
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
