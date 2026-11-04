import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Alert02Icon, InformationCircleIcon, Notification01Icon, Clock01Icon, FloppyDiskIcon } from "@hugeicons/core-free-icons";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import InactiveReminderTab from "@/components/reminders/InactiveReminderTab";
import { HOUR_OPTIONS, MINUTE_OPTIONS, fmtShort, reminderStore, subscribeReminders } from "@/components/reminders/reminderStore";
import {
  DAY_OPTIONS, conversationTimeoutStore, hhmm, reminderSteps, timeoutMinutes, validateTimeout,
  type ConversationTimeout, type TimelineStep,
} from "./conversationTimeoutStore";

type IconData = Parameters<typeof HugeiconsIcon>[0]["icon"];
const Icon = ({ icon, size = 16, className = "" }: { icon: IconData; size?: number; className?: string }) =>
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;

let reminderVersion = 0;
const subscribe = (fn: () => void) => subscribeReminders(() => { reminderVersion++; fn(); });
const useReminderVersion = () => useSyncExternalStore(subscribe, () => reminderVersion);

const conflictText = (n: number, min: number) =>
  `Có ${n} bước nhắc nhở có thời gian ≥ thời gian chờ (${hhmm(min)}). Các bước này sẽ không được gửi. Hãy điều chỉnh thời gian chờ hoặc thời gian nhắc nhở.`;

/** Horizontal preview: Tin chờ (0') → Nhắc #n → Kết thúc hội thoại. */
function Timeline({ steps, timeoutMin }: { steps: TimelineStep[]; timeoutMin?: number }) {
  const max = Math.max(timeoutMin ?? 0, ...steps.map(s => s.minutes), 1);
  const pos = (m: number) => `${4 + (m / max) * 92}%`;
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="mb-1 text-sm font-medium">Xem trước dòng thời gian</p>
      <p className="mb-6 text-xs text-muted-foreground">Tính từ tin chờ của Agent, khi khách không phản hồi.</p>
      <div className="relative mx-2 h-16" role="list" aria-label="Dòng thời gian hội thoại">
        <div className="absolute left-0 right-0 top-[9px] h-0.5 bg-border" aria-hidden="true" />
        <div role="listitem" className="absolute top-0 -translate-x-1/2 text-center" style={{ left: pos(0) }}>
          <span className="mx-auto block h-5 w-5 rounded-full border-2 border-primary bg-background" />
          <span className="mt-1.5 block whitespace-nowrap text-[11px] text-muted-foreground">Tin chờ (0')</span>
        </div>
        {steps.map((s, i) => (
          <Tooltip key={s.key}>
            <TooltipTrigger asChild>
              <div role="listitem" tabIndex={0} className="absolute top-[3px] -translate-x-1/2 text-center focus-visible:outline-none" style={{ left: pos(s.minutes) }}
                aria-label={`Nhắc #${i + 1} ${fmtShort(s.minutes)}${s.blocked ? ", sẽ không được gửi" : ""}`}>
                <span className={`mx-auto block h-3.5 w-3.5 rounded-full ring-2 ring-background ${s.blocked ? "bg-muted-foreground/40" : "bg-primary"}`} />
                <span className={`mt-2 block whitespace-nowrap text-[11px] tabular-nums ${s.blocked ? "text-muted-foreground line-through" : ""} ${i % 2 ? "translate-y-3" : ""}`}>Nhắc #{i + 1} · {fmtShort(s.minutes)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{s.blocked ? "Sẽ không được gửi" : `${s.reminderName} – Lần ${s.step}`}</TooltipContent>
          </Tooltip>
        ))}
        {timeoutMin !== undefined && (
          <div role="listitem" className="absolute top-0 -translate-x-1/2 text-center" style={{ left: pos(timeoutMin) }}>
            <span className="mx-auto block h-5 w-5 rounded-full bg-destructive ring-2 ring-background" />
            <span className="mt-1.5 block whitespace-nowrap text-[11px] font-medium text-destructive tabular-nums">Kết thúc hội thoại ({hhmm(timeoutMin)})</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Build › Cài đặt nâng cao › Cài đặt hội thoại: (1) Conversation timeout, (2) Inactive reminder (collapsed), timeline. */
export default function ConversationSettings({ agentId, agentName, readOnly }: { agentId: string; agentName?: string; readOnly?: boolean }) {
  useReminderVersion();
  const [saved, setSaved] = useState<ConversationTimeout>(() => conversationTimeoutStore.get(agentId));
  const [draft, setDraft] = useState<ConversationTimeout>(saved);
  const [remOpen, setRemOpen] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const remRef = useRef<HTMLDivElement>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const total = timeoutMinutes(draft);
  const errors = validateTimeout(draft);
  const showErr = (k: "duration") => errors[k];
  const timeoutMin = draft.enabled ? total : undefined;
  const steps = reminderSteps(agentId, timeoutMin);
  const blocked = steps.filter(s => s.blocked);
  const activeReminders = reminderStore.list(agentId).filter(r => r.enabled).length;
  const showTimeline = draft.enabled || steps.length > 0;
  const set = (p: Partial<ConversationTimeout>) => setDraft(d => ({ ...d, ...p }));

  const viewReminders = () => {
    setRemOpen(true);
    setHighlight(true);
    window.setTimeout(() => remRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    window.setTimeout(() => setHighlight(false), 4000);
  };
  const commit = () => {
    conversationTimeoutStore.save(agentId, draft);
    setSaved(draft);
    toast.success("Đã lưu cài đặt hội thoại vào bản nháp.");
  };
  const save = () => {
    if (errors.duration) return;
    if (draft.enabled && blocked.length) { setConfirm(true); return; }
    commit();
  };
  const remSummary = useMemo(() => activeReminders ? `${activeReminders} reminder đang bật` : "Chưa có reminder nào đang bật", [activeReminders]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Cài đặt hội thoại</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Cách Agent xử lý khi khách ngừng phản hồi. Hai khối hoạt động độc lập.</p>
      </div>

      {/* (1) Conversation timeout */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon icon={Clock01Icon} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Kết thúc hội thoại tự động</p>
            <p className="text-sm text-muted-foreground">Tự động kết thúc hội thoại khi khách không phản hồi sau một khoảng thời gian. Tin nhắn tiếp theo của khách sẽ bắt đầu một hội thoại mới.</p>
            {!draft.enabled && conversationTimeoutStore.hasSaved(agentId) && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">Đang tắt · Giá trị đã lưu: {hhmm(timeoutMinutes(saved))}. Bật lại để dùng tiếp.</p>
            )}
          </div>
          <Switch checked={draft.enabled} disabled={readOnly} onCheckedChange={v => set({ enabled: v })} aria-label="Bật kết thúc hội thoại tự động" className="mt-1 shrink-0" />
        </div>

        {draft.enabled && (
          <div className="space-y-5 border-t px-4 py-4">
            <div>
              <p id="ct-dur" className="text-sm font-medium">Thời gian chờ <span className="text-destructive">*</span></p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2" role="group" aria-labelledby="ct-dur">
                <Select value={String(draft.days)} onValueChange={v => set({ days: Number(v) })} disabled={readOnly}>
                  <SelectTrigger className={`w-20 tabular-nums ${showErr("duration") ? "border-destructive" : ""}`} aria-label="Ngày" aria-invalid={!!showErr("duration")}><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">{DAY_OPTIONS.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">ngày</span>
                <Select value={String(draft.hours)} onValueChange={v => set({ hours: Number(v) })} disabled={readOnly}>
                  <SelectTrigger className={`ml-2 w-20 tabular-nums ${showErr("duration") ? "border-destructive" : ""}`} aria-label="Giờ" aria-invalid={!!showErr("duration")}><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">{HOUR_OPTIONS.map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">giờ</span>
                <Select value={String(draft.minutes)} onValueChange={v => set({ minutes: Number(v) })} disabled={readOnly}>
                  <SelectTrigger className={`ml-2 w-20 tabular-nums ${showErr("duration") ? "border-destructive" : ""}`} aria-label="Phút" aria-invalid={!!showErr("duration")}><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">{MINUTE_OPTIONS.map(m => <SelectItem key={m} value={String(m)}>{String(m).padStart(2, "0")}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">phút</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Tính từ tin nhắn chờ cuối cùng của Agent. Tin nhắc nhở không làm reset thời gian này. Tối thiểu 5 phút.</p>
              {showErr("duration") && <p className="mt-1.5 text-xs text-destructive" role="alert">{showErr("duration")}</p>}
              {!errors.duration && blocked.length > 0 && (
                <div role="status" className="mt-2.5 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
                  <Icon icon={Alert02Icon} className="mt-0.5 shrink-0 text-warning" />
                  <p>
                    {conflictText(blocked.length, total)}{" "}
                    <button type="button" onClick={viewReminders} className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm">Xem nhắc nhở</button>
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t px-4 py-3">
          <p className="flex flex-1 items-center gap-1.5 text-xs text-muted-foreground">
            <Icon icon={InformationCircleIcon} size={14} className="shrink-0" />Áp dụng cho tất cả kênh tích hợp. Không áp dụng cho Workspace.
          </p>
          {!readOnly && (
            <>
              <span className="text-xs text-muted-foreground">Thay đổi chỉ có hiệu lực sau khi Publish Agent.</span>
              <Button type="button" size="sm" disabled={!dirty} onClick={save}><Icon icon={FloppyDiskIcon} /> Lưu</Button>
            </>
          )}
        </div>
      </div>

      {/* (2) Inactive reminder — collapsed by default */}
      <div ref={remRef} className={`scroll-mt-4 rounded-lg border bg-card transition-shadow ${highlight ? "ring-2 ring-warning/60" : ""}`}>
        <button type="button" onClick={() => setRemOpen(o => !o)} aria-expanded={remOpen}
          className="flex w-full items-start gap-3 rounded-lg px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon icon={Notification01Icon} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Nhắc nhở khi khách không phản hồi</span>
            <span className="block text-sm text-muted-foreground">Tự động nhắc khách khi họ ngừng phản hồi trong lúc Agent đang chờ. · {remSummary}</span>
            {draft.enabled && blocked.length > 0 && <span className="mt-1 block text-xs text-warning">{blocked.length} bước sẽ không được gửi vì ≥ thời gian kết thúc hội thoại.</span>}
          </span>
          <Icon icon={ArrowDown01Icon} className={`mt-1.5 shrink-0 text-muted-foreground transition-transform ${remOpen ? "rotate-180" : ""}`} />
        </button>
        {remOpen && (
          <div className="border-t px-4 py-4">
            <InactiveReminderTab agentId={agentId} agentName={agentName} readOnly={readOnly} embedded blockedFrom={timeoutMin} highlightBlocked={highlight} />
          </div>
        )}
      </div>

      {showTimeline && <Timeline steps={steps} timeoutMin={timeoutMin !== undefined && !errors.duration ? timeoutMin : undefined} />}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu khi còn nhắc nhở không được gửi?</AlertDialogTitle>
            <AlertDialogDescription>{conflictText(blocked.length, total)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={viewReminders}>Quay lại sửa</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirm(false); commit(); }}>Vẫn lưu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
