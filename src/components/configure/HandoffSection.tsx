import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CustomerSupportIcon, Alert02Icon, InformationCircleIcon, ArrowRight01Icon, Loading03Icon, LinkSquare02Icon,
} from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSpaceActor } from "@/components/governance/spaceDelete";
import { CONTACT_CENTERS, HANDOFF_CHANNELS, channelName, handoffStore, type CcConnection } from "./handoffStore";

type IconData = Parameters<typeof HugeiconsIcon>[0]["icon"];
const Icon = ({ icon, size = 16, className = "" }: { icon: IconData; size?: number; className?: string }) =>
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;

const ADMIN_ONLY = "Chỉ quản trị viên được kết nối hoặc ngắt kết nối Contact Center.";
const fmtDate = (t: number) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

function ConnectDialog({ agentId, initialOrg, onClose, onConnected }: {
  agentId: string; initialOrg?: string; onClose: () => void; onConnected: () => void;
}) {
  const actor = useSpaceActor();
  const [org, setOrg] = useState(initialOrg ?? "");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = () => {
    if (!org.trim()) { setError("Vui lòng nhập tổ chức EOS."); return; }
    setBusy(true);
    window.setTimeout(() => {
      const r = handoffStore.connect(agentId, "eos", org, token, actor.name);
      setBusy(false);
      if (r.ok === false) { setError(r.error); return; }
      toast.success(`Đã kết nối với ${org.trim()}.`);
      onConnected();
    }, 700);
  };
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[460px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Kết nối EOS Contact Center</DialogTitle>
          <DialogDescription>Xác thực với EOS để chuyển hội thoại từ các kênh ngoài sang nhân viên CSKH.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); submit(); }} noValidate>
          <div className="space-y-2">
            <label htmlFor="eos-org" className="text-sm font-medium">Tổ chức trên EOS</label>
            <Input id="eos-org" autoFocus value={org} onChange={e => { setOrg(e.target.value); setError(undefined); }} placeholder="cskh-abc.eos.vn" className="font-mono" />
          </div>
          <div className="space-y-2">
            <label htmlFor="eos-token" className="text-sm font-medium">Mã truy cập</label>
            <Input id="eos-token" type="password" autoComplete="new-password" value={token} onChange={e => { setToken(e.target.value); setError(undefined); }} placeholder="Do quản trị viên EOS cấp" className="font-mono" />
            <p className="text-xs text-muted-foreground">Mã chỉ ghi, được lưu mã hóa và không hiển thị lại.</p>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Icon icon={InformationCircleIcon} size={14} className="mt-px shrink-0" />
            Bản mô phỏng: cách xác thực chính thức với EOS đang chờ xác nhận.
          </p>
          <DialogFooter className="gap-2 sm:gap-2 sm:space-x-0">
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={busy}>{busy && <Icon icon={Loading03Icon} className="animate-spin" />} Kết nối</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ErrorBanner({ conn, onReconnect, canAdmin }: { conn: CcConnection; onReconnect: () => void; canAdmin: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2 text-sm">
        <Icon icon={Alert02Icon} className="mt-0.5 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Mất kết nối EOS Contact Center · {conn.errorReason}</p>
          <p className="text-muted-foreground">Đang tạm dừng chuyển cho nhân viên. Khách vẫn được Nhân sự số phản hồi và không hội thoại nào bị mất.</p>
        </div>
      </div>
      <Button type="button" size="sm" onClick={onReconnect} disabled={!canAdmin} title={canAdmin ? undefined : ADMIN_ONLY} className="shrink-0">Kết nối lại</Button>
    </div>
  );
}

function Report({ agentId }: { agentId: string }) {
  const r = handoffStore.report(agentId);
  const stats: [string, number][] = [["Lượt chuyển", r.total], ["Đã giải quyết", r.resolved], ["Trả về Nhân sự số", r.returned], ["Chuyển lỗi", r.failed]];
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Báo cáo chuyển cho nhân viên · 7 ngày qua</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-lg border divide-x divide-y sm:divide-y-0">
        {stats.map(([label, n]) => (
          <div key={label} className="px-3 py-2.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{n}</p>
          </div>
        ))}
      </div>
      {r.reasons.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {r.reasons.map(x => (
            <li key={x.label} className="flex items-center gap-3 text-sm">
              <span className="flex-1 min-w-0 truncate text-muted-foreground">{x.label}</span>
              <span className="w-32 h-1.5 rounded-full bg-muted overflow-hidden"><span className="block h-full bg-primary" style={{ width: `${x.pct}%` }} /></span>
              <span className="w-10 text-right tabular-nums">{x.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ManageDialog({ agentId, onClose, onReconnect, onChanged, onOpenCapabilities }: {
  agentId: string; onClose: () => void; onReconnect: () => void; onChanged: () => void; onOpenCapabilities?: () => void;
}) {
  const actor = useSpaceActor();
  const [confirmOff, setConfirmOff] = useState(false);
  const [, setTick] = useState(0);
  const bump = () => { setTick(t => t + 1); onChanged(); };
  const conn = handoffStore.connection(agentId);
  if (!conn) return null;
  const capability = handoffStore.capabilityOn(agentId);
  const healthy = conn.status === "connected";

  return (
    <>
      <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              EOS Contact Center
              {healthy
                ? <span className="inline-flex items-center rounded-full border border-success/40 bg-success/5 px-2.5 py-0.5 text-xs font-medium text-success">Đã kết nối</span>
                : <span className="inline-flex items-center rounded-full border border-destructive/40 px-2.5 py-0.5 text-xs font-medium text-destructive">Lỗi kết nối</span>}
            </DialogTitle>
            <DialogDescription>
              Đã kết nối với <span className="font-medium text-foreground">{conn.org}</span> · bởi {conn.connectedBy} · ngày {fmtDate(conn.connectedAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {!healthy && <ErrorBanner conn={conn} onReconnect={onReconnect} canAdmin={actor.isAdmin} />}
            {!capability && (
              <div className="flex flex-col gap-2 rounded-md bg-muted px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">Năng lực "Chuyển cho nhân viên" đang tắt ở Dựng agent nên chưa bật được kênh nào.</span>
                {onOpenCapabilities && <Button type="button" variant="outline" size="sm" onClick={onOpenCapabilities} className="shrink-0">Mở Năng lực</Button>}
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium mb-2">Kênh chuyển cho nhân viên</h3>
              <ul className="rounded-lg border divide-y">
                {HANDOFF_CHANNELS.map(ch => {
                  const on = handoffStore.channelOn(agentId, ch.id);
                  const n = handoffStore.withStaff(agentId, ch.id);
                  const sub = ch.kind === "internal" ? "Kênh nội bộ, không hỗ trợ chuyển cho nhân viên."
                    : ch.kind === "unavailable" ? "Chưa khả dụng"
                    : on ? `Hộp thư đích: ${handoffStore.inboxName(agentId, ch.id)} · ${n} hội thoại đang ở với nhân viên`
                    : "Chưa bật";
                  const disabledReason = !actor.isAdmin ? "Chỉ quản trị viên được bật/tắt." : !capability ? "Bật năng lực ở Dựng agent trước." : !healthy ? "Kết nối lại EOS trước." : undefined;
                  return (
                    <li key={ch.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${ch.kind === "external" ? "" : "text-muted-foreground"}`}>{ch.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{sub}</p>
                      </div>
                      {ch.kind === "external" && (
                        <span title={disabledReason}>
                          <Switch
                            checked={on}
                            disabled={!!disabledReason && !on}
                            onCheckedChange={v => {
                              if (v && disabledReason) return;
                              handoffStore.setChannel(agentId, ch.id, v);
                              toast.success(v ? `Đã bật chuyển cho nhân viên trên ${ch.name}.` : `Đã tắt chuyển cho nhân viên trên ${ch.name}.`);
                              bump();
                            }}
                            aria-label={`Chuyển cho nhân viên trên ${ch.name}`}
                          />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">Thay đổi có hiệu lực ngay. Mỗi kênh chỉ chuyển sang tối đa một Contact Center.</p>
            </div>

            <Report agentId={agentId} />
          </div>

          <DialogFooter className="gap-2 sm:gap-2 sm:space-x-0 sm:justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="text-destructive hover:text-destructive" disabled={!actor.isAdmin} title={actor.isAdmin ? undefined : ADMIN_ONLY} onClick={() => setConfirmOff(true)}>Ngắt kết nối</Button>
              {healthy && (
                <Button type="button" variant="ghost" size="sm" className="self-center text-xs text-muted-foreground" onClick={() => { handoffStore.simulateError(agentId); bump(); }}>
                  Mô phỏng lỗi 401
                </Button>
              )}
            </div>
            <Button type="button" onClick={onClose}>Xong</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ngắt kết nối EOS Contact Center?</AlertDialogTitle>
            <AlertDialogDescription>Chuyển cho nhân viên sẽ dừng ngay trên mọi kênh. Muốn dùng lại phải kết nối và bật lại từng kênh.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { handoffStore.disconnect(agentId); toast.success("Đã ngắt kết nối EOS Contact Center."); onChanged(); onClose(); }}>
              Ngắt kết nối
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** "Chuyển cho nhân viên" block on Kênh triển khai: Contact Center tiles, connection state and
 * per-channel handoff (BRD BR-02, BR-03, BR-07, BR-08, BR-09, BR-10). */
export default function HandoffSection({ agentId, onOpenCapabilities }: { agentId: string; onOpenCapabilities?: () => void }) {
  const actor = useSpaceActor();
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [dialog, setDialog] = useState<null | "connect" | "manage">(null);
  const conn = handoffStore.connection(agentId);
  const capability = handoffStore.capabilityOn(agentId);
  const active = handoffStore.activeChannels(agentId);

  return (
    <div className="mt-8">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">Chuyển cho nhân viên</h2>
        <p className="text-sm text-muted-foreground">Chuyển hội thoại từ kênh ngoài sang nhân viên CSKH trên Contact Center khi Nhân sự số không xử lý tiếp được, kèm lịch sử và thông tin khách.</p>
      </div>

      <div className="space-y-3">
        {conn?.status === "error" && <ErrorBanner conn={conn} onReconnect={() => setDialog("connect")} canAdmin={actor.isAdmin} />}
        {!capability && (
          <div className="flex flex-col gap-2 rounded-md bg-muted px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">Năng lực "Chuyển cho nhân viên" đang tắt ở Dựng agent. Bật năng lực để chuyển hội thoại hoạt động.</span>
            {onOpenCapabilities && <Button type="button" variant="outline" size="sm" onClick={onOpenCapabilities} className="shrink-0">Mở Năng lực <Icon icon={ArrowRight01Icon} /></Button>}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {CONTACT_CENTERS.map(cc => {
            const isEos = cc.id === "eos";
            const connected = isEos && !!conn;
            const status = !isEos ? cc.sub
              : !conn ? "Chưa kết nối"
              : conn.status === "error" ? "Lỗi kết nối"
              : `Đã kết nối · ${conn.org}`;
            return (
              <div key={cc.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3.5 ${cc.available ? "bg-card" : "bg-muted/40 opacity-70"}`}>
                <div className="w-8 h-8 rounded-md border bg-background flex items-center justify-center shrink-0 text-muted-foreground">
                  <Icon icon={CustomerSupportIcon} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{cc.name}</p>
                  <p className={`text-xs truncate ${conn?.status === "error" && isEos ? "text-destructive" : connected ? "text-success" : "text-muted-foreground"}`}>{status}</p>
                </div>
                {isEos && (
                  connected
                    ? <Button type="button" variant="outline" size="sm" onClick={() => setDialog("manage")}>Quản lý</Button>
                    : <Button type="button" size="sm" disabled={!actor.isAdmin} title={actor.isAdmin ? undefined : ADMIN_ONLY} onClick={() => setDialog("connect")}><Icon icon={LinkSquare02Icon} /> Kết nối</Button>
                )}
              </div>
            );
          })}
        </div>

        {conn && (
          <p className="text-sm text-muted-foreground">
            {active.length
              ? <>Đang chuyển trên: <span className="text-foreground">{active.map(channelName).join(", ")}</span> · {active.reduce((s, c) => s + handoffStore.withStaff(agentId, c), 0)} hội thoại đang ở với nhân viên</>
              : "Chưa bật chuyển cho nhân viên trên kênh nào. Mở Quản lý để bật theo từng kênh."}
          </p>
        )}
      </div>

      {dialog === "connect" && (
        <ConnectDialog agentId={agentId} initialOrg={conn?.org} onClose={() => setDialog(null)} onConnected={() => { refresh(); setDialog("manage"); }} />
      )}
      {dialog === "manage" && (
        <ManageDialog agentId={agentId} onClose={() => { setDialog(null); refresh(); }} onReconnect={() => setDialog("connect")} onChanged={refresh} onOpenCapabilities={onOpenCapabilities} />
      )}
    </div>
  );
}
