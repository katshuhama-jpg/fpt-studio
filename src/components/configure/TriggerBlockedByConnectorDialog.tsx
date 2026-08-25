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
          <AlertDialogTitle>Không thêm được trigger cho agent này</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2.5 text-sm text-muted-foreground text-left">
              <p>
                Agent đang dùng kết nối riêng của từng người ({connectorName}). Trigger chạy nền khi không có ai
                đăng nhập, nên không có tài khoản cá nhân nào để agent dùng.
              </p>
              <p>
                Nếu muốn agent chạy tự động cho cả tổ chức, hãy đổi kết nối sang Shared organization connection.
                Còn nếu muốn giữ kết nối riêng của từng người, mỗi người có thể tự đặt trigger cho bản agent họ
                cài trong Workspace.
              </p>
            </div>
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
