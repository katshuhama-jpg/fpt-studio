import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon, Notification01Icon, MoreHorizontalIcon, PencilEdit01Icon, Copy01Icon, Delete02Icon, StarIcon, Alert02Icon, ViewIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReminderSheet from "./ReminderSheet";
import { channelLabel, emptyReminder, fmtMinutes, needsUpdate, reminderStore, stepMinutes, type Reminder, type ReminderSettings } from "./reminderStore";

type IconData = Parameters<typeof HugeiconsIcon>[0]["icon"];
const Icon = ({ icon, size = 16, className = "" }: { icon: IconData; size?: number; className?: string }) =>
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;

/** "30 phút → 3 giờ" — each step's wait, star on the ones that ask for CSAT. */
function StepsSummary({ r }: { r: Reminder }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums">
      {r.steps.map((s, i) => {
        return (
          <span key={s.id} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground" aria-hidden="true">→</span>}
            {fmtMinutes(stepMinutes(s))}
            {s.csat && <span title="Có CSAT rating"><Icon icon={StarIcon} size={13} className="text-warning" /></span>}
          </span>
        );
      })}
    </span>
  );
}

function Channels({ r }: { r: Reminder }) {
  if (r.channels === "all") return <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium">Tất cả kênh</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {r.channels.map(id => <span key={id} className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium">{channelLabel(id)}</span>)}
    </span>
  );
}

type SheetState = { mode: "create" | "edit"; reminder: Reminder } | null;

/** Build › Cài đặt nâng cao › Inactive reminder. */
export default function InactiveReminderTab({ agentId, readOnly }: { agentId: string; readOnly?: boolean }) {
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const list = reminderStore.list(agentId);
  const settings = reminderStore.settings(agentId);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toDelete, setToDelete] = useState<Reminder | null>(null);

  const setSettings = (s: ReminderSettings) => { reminderStore.setSettings(agentId, s); refresh(); };
  const openCreate = () => setSheet({ mode: "create", reminder: emptyReminder() });

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Inactive reminder</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Tự động nhắc người dùng khi họ ngừng phản hồi trong lúc Agent đang chờ.</p>
        </div>
        {!readOnly && list.length > 0 && (
          <Button type="button" size="sm" onClick={openCreate} className="shrink-0"><Icon icon={Add01Icon} /> Thêm reminder</Button>
        )}
      </div>

      {/* Settings */}
      <div className="rounded-lg border bg-card divide-y mb-4">
        <div className="flex items-start justify-between gap-4 px-4 py-3.5">
          <div>
            <p className="text-sm font-medium">Bật Inactive reminder</p>
            <p className="text-xs text-muted-foreground mt-0.5">Khi tắt, không lời nhắc nào được gửi. Bạn vẫn tạo và chỉnh sửa reminder được.</p>
          </div>
          <Switch checked={settings.enabled} disabled={readOnly} onCheckedChange={v => { setSettings({ ...settings, enabled: v }); toast.success(v ? "Đã bật Inactive reminder." : "Đã tắt Inactive reminder."); }} aria-label="Bật Inactive reminder" className="shrink-0" />
        </div>
        <div className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Quiet hours</p>
              <p className="text-xs text-muted-foreground mt-0.5">Không gửi lời nhắc trong khung giờ này.</p>
            </div>
            <Switch checked={settings.quiet.on} disabled={readOnly} onCheckedChange={v => setSettings({ ...settings, quiet: { ...settings.quiet, on: v } })} aria-label="Quiet hours" className="shrink-0" />
          </div>
          {settings.quiet.on && (
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">Từ
                  <Input type="time" value={settings.quiet.from} disabled={readOnly} onChange={e => setSettings({ ...settings, quiet: { ...settings.quiet, from: e.target.value } })} className="w-32 tabular-nums text-foreground" aria-label="Quiet hours từ" />
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">Đến
                  <Input type="time" value={settings.quiet.to} disabled={readOnly} onChange={e => setSettings({ ...settings, quiet: { ...settings.quiet, to: e.target.value } })} className="w-32 tabular-nums text-foreground" aria-label="Quiet hours đến" />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Tính theo múi giờ người dùng, nếu không có thì dùng múi giờ của Agent (GMT+7).</p>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className={settings.enabled ? "" : "opacity-60 transition-opacity hover:opacity-100 focus-within:opacity-100"}>
        {list.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground mb-3"><Icon icon={Notification01Icon} size={20} /></div>
            <p className="text-sm text-muted-foreground max-w-sm">Chưa có reminder nào. Tạo reminder để nhắc người dùng khi họ im lặng.</p>
            {!readOnly && <Button type="button" size="sm" className="mt-4" onClick={openCreate}><Icon icon={Add01Icon} /> Thêm reminder</Button>}
          </div>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="text-left font-medium px-4 py-2.5">Tên</th>
                  <th scope="col" className="text-left font-medium px-4 py-2.5">Kênh</th>
                  <th scope="col" className="text-left font-medium px-4 py-2.5">Lần nhắc</th>
                  <th scope="col" className="text-left font-medium px-4 py-2.5 w-24">Trạng thái</th>
                  <th scope="col" className="px-4 py-2.5 w-12"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map(r => {
                  const stale = needsUpdate(agentId, r);
                  return (
                    <tr key={r.id} className="align-middle hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <button type="button" className="text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm" onClick={() => setSheet({ mode: "edit", reminder: r })}>{r.name}</button>
                        {stale && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-sm border border-warning/50 bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning align-middle" title="Có skill đính kèm đã bị xóa.">
                            <Icon icon={Alert02Icon} size={12} /> Cần cập nhật
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3"><Channels r={r} /></td>
                      <td className="px-4 py-3"><StepsSummary r={r} /></td>
                      <td className="px-4 py-3">
                        <Switch checked={r.enabled} disabled={readOnly} aria-label={`Trạng thái ${r.name}`}
                          onCheckedChange={v => { reminderStore.setEnabled(agentId, r.id, v); refresh(); toast.success(v ? `Đã bật "${r.name}".` : `Đã tắt "${r.name}".`); }} />
                      </td>
                      <td className="px-2 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Thao tác cho ${r.name}`}><Icon icon={MoreHorizontalIcon} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {readOnly ? (
                              <DropdownMenuItem onSelect={() => setSheet({ mode: "edit", reminder: r })}><Icon icon={ViewIcon} /> Xem</DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onSelect={() => setSheet({ mode: "edit", reminder: r })}><Icon icon={PencilEdit01Icon} /> Chỉnh sửa</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setSheet({ mode: "create", reminder: reminderStore.duplicate(r) })}><Icon icon={Copy01Icon} /> Nhân bản</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setToDelete(r)}><Icon icon={Delete02Icon} /> Xóa</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sheet && (
        <ReminderSheet
          key={sheet.reminder.id}
          agentId={agentId}
          initial={sheet.reminder}
          mode={sheet.mode}
          readOnly={readOnly}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); refresh(); }}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={o => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa reminder "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Các lời nhắc đang chờ gửi sẽ bị hủy.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (toDelete) { reminderStore.remove(agentId, toDelete.id); toast.success(`Đã xóa "${toDelete.name}".`); } setToDelete(null); refresh(); }}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
