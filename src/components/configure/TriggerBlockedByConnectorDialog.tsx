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
          <AlertDialogTitle>Không thêm được trigger</AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            Agent đang dùng kết nối riêng ({connectorName}) — trigger chạy nền, không có ai đăng nhập để dùng kết
            nối này. Đổi sang kết nối dùng chung để thêm trigger.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Đã hiểu</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onOpenChange(false); onSwitchToShared(); }}>
            Đổi sang kết nối dùng chung
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
