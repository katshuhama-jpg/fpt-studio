import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { CustomerSupportIcon, Alert02Icon, ArrowRight01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSpaceActor } from "@/components/governance/spaceDelete";
import { CONTACT_CENTERS, HANDOFF_CHANNELS, handoffStore, type CcConnection } from "./handoffStore";

type IconData = Parameters<typeof HugeiconsIcon>[0]["icon"];
const Icon = ({ icon, size = 16, className = "" }: { icon: IconData; size?: number; className?: string }) =>
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;

function ErrorBanner({ conn, onRetry }: { conn: CcConnection; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2 text-sm">
        <Icon icon={Alert02Icon} className="mt-0.5 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Mất kết nối EOS Contact Center · {conn.errorReason}</p>
          <p className="text-muted-foreground">Đang tạm dừng chuyển cho nhân viên. Khách vẫn được Nhân sự số phản hồi và không hội thoại nào bị mất.</p>
        </div>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onRetry} className="shrink-0">Thử lại</Button>
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
      <ul className="mt-3 space-y-1.5">
        {r.reasons.map(x => (
          <li key={x.label} className="flex items-center gap-3 text-sm">
            <span className="flex-1 min-w-0 truncate text-muted-foreground">{x.label}</span>
            <span className="w-32 h-1.5 rounded-full bg-muted overflow-hidden"><span className="block h-full bg-primary" style={{ width: `${x.pct}%` }} /></span>
            <span className="w-10 text-right tabular-nums">{x.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Chuyển cho nhân viên" on Kênh triển khai › Kênh ngoài. The EOS Contact Center link comes from
 * the signed-in user's EOS account (no separate connect step); the Builder only picks which
 * external channels hand conversations over (BR-03, BR-07, BR-08, BR-09). */
export default function HandoffSection({ agentId, onOpenCapabilities }: { agentId: string; onOpenCapabilities?: () => void }) {
  const actor = useSpaceActor();
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const conn = handoffStore.connection(agentId);
  const capability = handoffStore.capabilityOn(agentId);
  const active = handoffStore.activeChannels(agentId);
  const healthy = conn?.status === "connected";
  const otherCCs = CONTACT_CENTERS.filter(c => c.id !== "eos");

  return (
    <div className="mt-8">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">Chuyển cho nhân viên</h2>
        <p className="text-sm text-muted-foreground">Chuyển hội thoại từ kênh ngoài sang nhân viên CSKH trên Contact Center khi Nhân sự số không xử lý tiếp được, kèm lịch sử và thông tin khách.</p>
      </div>

      <div className="space-y-3">
        {!capability && (
          <div className="flex flex-col gap-2 rounded-md bg-muted px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">Năng lực "Chuyển cho nhân viên" đang tắt ở Dựng agent. Bật năng lực để chuyển hội thoại hoạt động.</span>
            {onOpenCapabilities && <Button type="button" variant="outline" size="sm" onClick={onOpenCapabilities} className="shrink-0">Mở Năng lực <Icon icon={ArrowRight01Icon} /></Button>}
          </div>
        )}

        {!conn ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed px-4 py-4">
            <Icon icon={InformationCircleIcon} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium">Chưa bật kênh nào</p>
              <p className="text-muted-foreground">Tài khoản của bạn chưa có EOS Contact Center. Khi đăng nhập bằng tài khoản có EOS, kết nối được tự động liên kết và bạn bật được kênh tại đây.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b">
              <div className="w-8 h-8 rounded-md border bg-background flex items-center justify-center shrink-0 text-muted-foreground">
                <Icon icon={CustomerSupportIcon} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium flex flex-wrap items-center gap-2">
                  EOS Contact Center
                  {healthy
                    ? <span className="inline-flex items-center rounded-full border border-success/40 bg-success/5 px-2 py-0.5 text-xs font-medium text-success">Đã liên kết</span>
                    : <span className="inline-flex items-center rounded-full border border-destructive/40 px-2 py-0.5 text-xs font-medium text-destructive">Lỗi kết nối</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">Theo tài khoản EOS của bạn · {conn.org} · {conn.account}</p>
              </div>
              {healthy && (
                <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground shrink-0" onClick={() => { handoffStore.simulateError(agentId); refresh(); }}>
                  Mô phỏng lỗi 401
                </Button>
              )}
            </div>

            <div className="p-4 space-y-4">
              {!healthy && <ErrorBanner conn={conn} onRetry={() => { handoffStore.retry(agentId); toast.success("Đã kết nối lại EOS Contact Center."); refresh(); }} />}

              {active.length === 0 && (
                <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                  <Icon icon={InformationCircleIcon} size={14} className="mt-0.5 shrink-0" />
                  Chưa bật kênh nào. Bật kênh bên dưới để chuyển hội thoại cho nhân viên.
                </p>
              )}

              <ul className="rounded-lg border divide-y">
                {HANDOFF_CHANNELS.map(ch => {
                  const on = handoffStore.channelOn(agentId, ch.id);
                  const n = handoffStore.withStaff(agentId, ch.id);
                  const sub = ch.kind === "internal" ? "Kênh nội bộ, không hỗ trợ chuyển cho nhân viên."
                    : ch.kind === "unavailable" ? "Chưa khả dụng"
                    : on ? `Hộp thư đích: ${handoffStore.inboxName(agentId, ch.id)} · ${n} hội thoại đang ở với nhân viên`
                    : "Chưa bật";
                  const lockReason = !actor.isAdmin ? "Chỉ quản trị viên được bật/tắt." : !capability ? "Bật năng lực ở Dựng agent trước." : !healthy ? "Kết nối EOS đang lỗi." : undefined;
                  return (
                    <li key={ch.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${ch.kind === "external" ? "" : "text-muted-foreground"}`}>{ch.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{sub}</p>
                      </div>
                      {ch.kind === "external" && (
                        <span title={lockReason}>
                          <Switch
                            checked={on}
                            disabled={!!lockReason && !on}
                            onCheckedChange={v => {
                              if (v && lockReason) return;
                              handoffStore.setChannel(agentId, ch.id, v);
                              toast.success(v ? `Đã bật chuyển cho nhân viên trên ${ch.name}.` : `Đã tắt chuyển cho nhân viên trên ${ch.name}.`);
                              refresh();
                            }}
                            aria-label={`Chuyển cho nhân viên trên ${ch.name}`}
                          />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">Thay đổi có hiệu lực ngay. Mỗi kênh chỉ chuyển sang tối đa một Contact Center.</p>

              {active.length > 0 && <Report agentId={agentId} />}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Contact Center khác:</span>
          {otherCCs.map(cc => <span key={cc.id}>{cc.name} · {cc.sub}</span>)}
        </div>
      </div>
    </div>
  );
}
