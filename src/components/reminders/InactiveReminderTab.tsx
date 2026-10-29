import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon, Notification01Icon, MoreHorizontalIcon, PencilEdit01Icon, Copy01Icon, Delete02Icon, StarIcon,
  Alert02Icon, ViewIcon, InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReminderSheet from "./ReminderSheet";
import ReminderPreviewDialog from "./ReminderPreviewDialog";
import {
  MAX_REPLIES_PER_WAIT, channelLabel, emptyReminder, findOverlaps, fmtMinutes, hasPublishedChannels, lostAllChannels,
  needsUpdate, reminderStore, stepMinutes, type Reminder,
} from "./reminderStore";

type IconData = Parameters<typeof HugeiconsIcon>[0]["icon"];
const Icon = ({ icon, size = 16, className = "" }: { icon: IconData; size?: number; className?: string }) =>
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

/** "5 phút → 30 phút → 2 giờ" — each step's wait, star on the ones that ask for CSAT. */
function StepsSummary({ r, overlapNote }: { r: Reminder; overlapNote?: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums">
      {r.steps.map((s, i) => (
        <span key={s.id} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground" aria-hidden="true">→</span>}
          {fmtMinutes(stepMinutes(s))}
          {s.csat && <span title="Có CSAT rating"><Icon icon={StarIcon} size={13} className="text-warning" /></span>}
        </span>
      ))}
      {overlapNote && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Cảnh báo trùng thời gian" className="rounded-sm text-warning focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <Icon icon={Alert02Icon} size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{overlapNote}</TooltipContent>
        </Tooltip>
      )}
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
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toDelete, setToDelete] = useState<Reminder | null>(null);
  const [preview, setPreview] = useState<Reminder | null>(null);

  // A reminder whose channels were all unpublished can't run — switch it off once, on open.
  useEffect(() => {
    const n = reminderStore.syncLostChannels(agentId);
    if (n) refresh();
  }, [agentId]);

  const list = reminderStore.list(agentId);
  const settings = reminderStore.settings(agentId);
  const masterOn = settings.enabled;
  const canPublish = hasPublishedChannels(agentId);

  const openCreate = () => setSheet({ mode: "create", reminder: emptyReminder() });

  const overlapNoteFor = (r: Reminder) => {
    if (!r.enabled || !masterOn) return undefined;
    const hits = findOverlaps(agentId, r, list);
    if (!hits.length) return undefined;
    const h = hits[0];
    return `${h.exact ? "Trùng thời gian với" : "Có thể trùng thời gian với"} ${h.otherName} – Lần ${h.otherStep}.`;
  };

  const addButton = (
    <Button type="button" size="sm" onClick={openCreate} disabled={!canPublish} className="shrink-0">
      <Icon icon={Add01Icon} /> Thêm reminder
    </Button>
  );

  return (
    <div>
      <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Inactive reminder</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Tự động nhắc người dùng khi họ ngừng phản hồi trong lúc Agent đang chờ.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={masterOn}
              disabled={readOnly}
              aria-label="Bật Inactive reminder"
              onCheckedChange={v => {
                reminderStore.setSettings(agentId, { enabled: v });
                refresh();
                toast.success(v ? "Đã bật Inactive reminder." : "Đã tắt Inactive reminder.");
              }}
            />
            <span className="text-muted-foreground">{masterOn ? "Đang bật" : "Đang tắt"}</span>
          </label>
          {!readOnly && (canPublish ? addButton : (
            <Tooltip>
              <TooltipTrigger asChild><span tabIndex={0}>{addButton}</span></TooltipTrigger>
              <TooltipContent>Cần publish ít nhất 1 kênh để tạo reminder.</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <p className="mb-4 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Icon icon={InformationCircleIcon} size={13} className="mt-0.5 shrink-0" />
        <span>
          Mỗi lần nhắc phát sinh lượt gọi LLM và có thể gọi skill; các lượt này tính vào usage.
          Mỗi lượt chờ chỉ gửi tối đa {MAX_REPLIES_PER_WAIT} tin, tính trên mọi reminder.
        </span>
      </p>

      {!masterOn && list.length > 0 && (
        <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
          <Icon icon={Alert02Icon} size={16} className="mt-0.5 shrink-0 text-warning" />
          <span>Inactive reminder đang tắt. Mọi lời nhắc đang chờ đã dừng.</span>
        </div>
      )}

      {/* List */}
      <div className={!masterOn && list.length > 0 ? "opacity-60" : ""}>
        {list.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground mb-3"><Icon icon={Notification01Icon} size={20} /></div>
            <p className="text-sm text-muted-foreground max-w-sm">Chưa có reminder nào. Tạo reminder để nhắc người dùng khi họ im lặng.</p>
            {!readOnly && (
              canPublish
                ? <Button type="button" size="sm" className="mt-4" onClick={openCreate}><Icon icon={Add01Icon} /> Thêm reminder</Button>
                : <p className="mt-4 text-xs text-warning">Cần publish ít nhất 1 kênh để tạo reminder.</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="text-left font-medium px-4 py-2.5 w-28">Thời điểm tạo</th>
                  <th scope="col" className="text-left font-medium px-4 py-2.5">Tên reminder</th>
                  <th scope="col" className="text-left font-medium px-4 py-2.5">Kênh áp dụng</th>
                  <th scope="col" className="text-left font-medium px-4 py-2.5">Thời gian áp dụng</th>
                  <th scope="col" className="text-left font-medium px-4 py-2.5 w-24">Trạng thái</th>
                  <th scope="col" className="px-4 py-2.5 w-12"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map(r => {
                  const stale = needsUpdate(agentId, r);
                  const lost = lostAllChannels(agentId, r);
                  return (
                    <tr key={r.id} className="align-middle hover:bg-muted/30">
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmtDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button type="button" className="text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm" onClick={() => setSheet({ mode: "edit", reminder: r })}>{r.name}</button>
                        {stale && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-sm border border-warning/50 bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning align-middle" title="Có skill đính kèm đã bị xóa.">
                            <Icon icon={Alert02Icon} size={12} /> Cần cập nhật
                          </span>
                        )}
                        {lost && (
                          <p className="mt-1 flex items-start gap-1.5 text-[11px] text-warning">
                            <Icon icon={Alert02Icon} size={12} className="mt-0.5 shrink-0" />
                            <span>Reminder đã tắt vì không còn kênh áp dụng. Chọn lại kênh để bật lại.</span>
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3"><Channels r={r} /></td>
                      <td className="px-4 py-3"><StepsSummary r={r} overlapNote={overlapNoteFor(r)} /></td>
                      <td className="px-4 py-3">
                        <Switch checked={r.enabled} disabled={readOnly || !masterOn || lost} aria-label={`Trạng thái ${r.name}`}
                          onCheckedChange={v => { reminderStore.setEnabled(agentId, r.id, v); refresh(); toast.success(v ? `Đã bật "${r.name}".` : `Đã tắt "${r.name}".`); }} />
                      </td>
                      <td className="px-2 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Thao tác cho ${r.name}`}><Icon icon={MoreHorizontalIcon} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onSelect={() => setPreview(r)}><Icon icon={ViewIcon} /> Xem trước</DropdownMenuItem>
                            {readOnly ? (
                              <DropdownMenuItem onSelect={() => setSheet({ mode: "edit", reminder: r })}><Icon icon={ViewIcon} /> Xem</DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onSelect={() => setSheet({ mode: "edit", reminder: r })}><Icon icon={PencilEdit01Icon} /> Sửa</DropdownMenuItem>
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

      {preview && <ReminderPreviewDialog agentId={agentId} reminder={preview} onClose={() => setPreview(null)} />}

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
