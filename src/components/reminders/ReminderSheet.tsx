import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon, Delete02Icon, Add01Icon, SparklesIcon, InformationCircleIcon, Alert02Icon, Loading03Icon, Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import InstructionsEditor from "@/components/configure/InstructionsEditor";
import { RefChip } from "@/components/configure/refChip";
import { parseToken } from "@/components/configure/instructionRefs";
import {
  MAX_STEPS, REMINDER_CHANNELS, channelLabel, emptyStep, fmtMinutes, generateTrigger, includes, reminderStore,
  stepMinutes, stepSkills, textFallbackChannels, totalMinutes, validateReminder,
  type DurationUnit, type Reminder, type ReminderStep,
} from "./reminderStore";

type IconData = Parameters<typeof HugeiconsIcon>[0]["icon"];
const Icon = ({ icon, size = 16, className = "" }: { icon: IconData; size?: number; className?: string }) =>
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;

const Err = ({ children }: { children?: string }) => (children ? <p className="text-xs text-destructive mt-1.5" role="alert">{children}</p> : null);
const Helper = ({ children }: { children: React.ReactNode }) => <p className="text-xs text-muted-foreground mt-1.5">{children}</p>;
const plain = (t: string) => t.replace(/\{\{ref:[^|}]*\|?([^}]*)\}\}/g, "$1").replace(/\s+/g, " ").trim();

function ChannelsSelect({ value, onChange, disabled }: { value: Reminder["channels"]; onChange: (v: Reminder["channels"]) => void; disabled?: boolean }) {
  const selected = value === "all" ? [] : value;
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <button type="button" id="rem-channels" data-field="channels" className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60">
          {value === "all"
            ? <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium">Tất cả kênh</span>
            : selected.length ? selected.map(id => <span key={id} className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium">{channelLabel(id)}</span>)
            : <span className="px-1 text-muted-foreground">Chọn kênh</span>}
          <Icon icon={ArrowDown01Icon} className="ml-auto shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1">
        <label className="flex cursor-pointer items-start gap-2.5 rounded-sm px-2 py-2 hover:bg-muted">
          <Checkbox checked={value === "all"} onCheckedChange={v => onChange(v ? "all" : [])} className="mt-0.5" />
          <span><span className="block text-sm font-medium">Tất cả kênh</span><span className="block text-xs text-muted-foreground">Bao gồm cả các kênh publish sau này</span></span>
        </label>
        <div className="my-1 h-px bg-border" />
        {REMINDER_CHANNELS.map(c => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
            <Checkbox checked={value !== "all" && selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
            {c.name}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

type GenState = { status: "idle" | "running" | "error" };

function StepCard({ agentId, step, index, open, onToggle, onChange, onRemove, readOnly, errors, show, touch, channels }: {
  agentId: string; step: ReminderStep; index: number; open: boolean; onToggle: () => void;
  onChange: (s: ReminderStep) => void; onRemove?: () => void; readOnly?: boolean;
  errors: Map<string, string>; show: (k: string) => boolean; touch: (k: string) => void; channels: Reminder["channels"];
}) {
  const k = (f: string) => `step.${step.id}.${f}`;
  const err = (f: string) => (show(k(f)) ? errors.get(k(f)) : undefined);
  const [gen, setGen] = useState<GenState>({ status: "idle" });
  const [replaceWith, setReplaceWith] = useState<string | null>(null);
  const skills = stepSkills(agentId, step.instruction);
  const instructionEmpty = !plain(step.instruction);
  const fallback = textFallbackChannels(channels);
  const hasError = [...errors.keys()].some(x => x.startsWith(`step.${step.id}.`) && show(x));

  const runGenerate = async () => {
    setGen({ status: "running" });
    try {
      const text = await generateTrigger(step.instruction);
      setGen({ status: "idle" });
      if (step.trigger.trim()) setReplaceWith(text); else onChange({ ...step, trigger: text });
    } catch {
      setGen({ status: "error" });
    }
  };
  const genTip = instructionEmpty ? "Viết Instruction trước." : gen.status === "running" ? "Đang tạo…" : "Tạo từ nội dung Instruction.";
  const summary = `${stepMinutes(step) ? fmtMinutes(stepMinutes(step)) : "Chưa đặt thời gian"}${plain(step.instruction) ? ` · ${plain(step.instruction).slice(0, 48)}${plain(step.instruction).length > 48 ? "…" : ""}` : ""}`;

  return (
    <div data-step={step.id} className={`rounded-lg border bg-card ${hasError ? "border-destructive/50" : ""}`}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <Icon icon={ArrowDown01Icon} className={`shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className="text-sm font-semibold shrink-0">Reminder {index + 1}</span>
          {!open && <span className="truncate text-sm text-muted-foreground">{summary}</span>}
          {!open && hasError && <Icon icon={Alert02Icon} size={14} className="shrink-0 text-destructive" />}
        </button>
        {onRemove && !readOnly && (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Xóa Reminder ${index + 1}`} onClick={onRemove}>
            <Icon icon={Delete02Icon} />
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-5 border-t px-4 py-4">
          {/* 1. Duration */}
          <div>
            <label htmlFor={`${step.id}-amount`} className="text-sm font-medium">Duration <span className="text-destructive">*</span></label>
            <div className="mt-1.5 flex gap-2">
              <Input id={`${step.id}-amount`} type="number" min={1} inputMode="numeric" value={step.amount} disabled={readOnly} data-field={k("duration")}
                onChange={e => onChange({ ...step, amount: e.target.value === "" ? "" : Number(e.target.value) })} onBlur={() => touch(k("duration"))}
                className="w-28 tabular-nums" aria-invalid={!!err("duration")} />
              <Select value={step.unit} onValueChange={v => onChange({ ...step, unit: v as DurationUnit })} disabled={readOnly}>
                <SelectTrigger className="w-28" aria-label="Đơn vị"><SelectValue /></SelectTrigger>
                <SelectContent ><SelectItem value="minute">phút</SelectItem><SelectItem value="hour">giờ</SelectItem></SelectContent>
              </Select>
            </div>
            <Helper>{index === 0 ? "Tính từ tin nhắn cuối của Agent đang chờ người dùng phản hồi." : "Tính từ lần nhắc trước."}</Helper>
            <Err>{err("duration")}</Err>
          </div>

          {/* 2. Instruction */}
          <div>
            <p className="text-sm font-medium">Instruction <span className="text-destructive">*</span></p>
            <p className="text-xs text-muted-foreground">Agent cần làm gì?</p>
            <InstructionsEditor
              agentId={agentId}
              value={step.instruction}
              onChange={v => onChange({ ...step, instruction: v })}
              onBlur={() => touch(k("instruction"))}
              trigger="@"
              scope="skills"
              readOnly={readOnly}
              ariaLabel={`Instruction của Reminder ${index + 1}`}
              fieldKey={k("instruction")}
              placeholder="Mô tả việc Agent cần làm ở lần nhắc này. Gõ @ để dùng skill."
              className={`mt-1.5 min-h-[72px] w-full rounded-md border px-3 py-2 text-sm leading-relaxed focus:ring-[3px] focus:ring-ring/50 ${err("instruction") ? "border-destructive" : ""}`}
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>Allowed skills:</span>
              {skills.length === 0 ? <span>Chưa có</span> : skills.map(s => {
                const ref = parseToken(s.token);
                return ref ? <span key={s.token} className={s.status === "ok" ? "" : "[&_.truncate]:line-through"}><RefChip agentId={agentId} reference={ref} /></span> : null;
              })}
            </div>
            <Err>{err("instruction")}</Err>
          </div>

          {/* 3. Trigger */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <label htmlFor={`${step.id}-trigger`} className="text-sm font-medium">Trigger <span className="text-destructive">*</span></label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Về Trigger" className="text-muted-foreground hover:text-foreground"><Icon icon={InformationCircleIcon} size={14} /></button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">Agent kiểm tra điều kiện này khi hết thời gian chờ. Nếu không thỏa, lời nhắc không được gửi và các lần nhắc sau của reminder này cũng dừng.</TooltipContent>
                </Tooltip>
              </div>
              {!readOnly && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={instructionEmpty ? 0 : -1}>
                      <Button type="button" variant="outline" size="sm" disabled={instructionEmpty || gen.status === "running"} onClick={runGenerate}>
                        <Icon icon={gen.status === "running" ? Loading03Icon : SparklesIcon} className={gen.status === "running" ? "animate-spin" : ""} />
                        {gen.status === "running" ? "Đang tạo…" : "Tạo tự động"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{genTip}</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Khi nào gửi lời nhắc này?</p>
            <Textarea id={`${step.id}-trigger`} value={step.trigger} readOnly={readOnly || gen.status === "running"} data-field={k("trigger")}
              onChange={e => onChange({ ...step, trigger: e.target.value })} onBlur={() => touch(k("trigger"))} rows={3}
              placeholder="Mô tả tình huống cần gửi lời nhắc. Điều kiện được kiểm tra khi hết thời gian chờ."
              className={`mt-1.5 ${gen.status === "running" ? "opacity-60" : ""}`} aria-invalid={!!err("trigger")} />
            {gen.status === "error" && <p className="text-xs text-destructive mt-1.5" role="alert">Chưa tạo được. Vui lòng thử lại hoặc tự nhập.</p>}
            <Err>{err("trigger")}</Err>
          </div>

          {/* 4. CSAT */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">CSAT rating</p>
              <Helper>Gửi kèm yêu cầu đánh giá mức độ hài lòng trong lời nhắc này.</Helper>
              {step.csat && fallback.length > 0 && <p className="text-xs text-muted-foreground mt-1">Hiển thị dạng văn bản trên {fallback.join(", ")}.</p>}
            </div>
            <Switch checked={step.csat} onCheckedChange={v => onChange({ ...step, csat: v })} disabled={readOnly} aria-label={`CSAT rating của Reminder ${index + 1}`} className="shrink-0" />
          </div>
        </div>
      )}

      <AlertDialog open={replaceWith !== null} onOpenChange={o => { if (!o) setReplaceWith(null); }}>
        <AlertDialogContent >
          <AlertDialogHeader>
            <AlertDialogTitle>Thay thế điều kiện hiện tại?</AlertDialogTitle>
            <AlertDialogDescription>Nội dung Trigger đang có sẽ được thay bằng điều kiện vừa tạo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (replaceWith) onChange({ ...step, trigger: replaceWith }); setReplaceWith(null); }}>Thay thế</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Right sheet "Thêm reminder" / "Chỉnh sửa reminder". */
export default function ReminderSheet({ agentId, initial, mode, readOnly, onClose, onSaved }: {
  agentId: string; initial: Reminder; mode: "create" | "edit"; readOnly?: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Reminder>(initial);
  const [openStep, setOpenStep] = useState<string>(initial.steps[0]?.id ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const initialJson = useMemo(() => JSON.stringify(initial), [initial]);
  const dirty = JSON.stringify(draft) !== initialJson;

  const errors = validateReminder(agentId, draft, reminderStore.list(agentId));
  const show = (k: string) => submitted || touched.has(k);
  const touch = (k: string) => setTouched(t => (t.has(k) ? t : new Set(t).add(k)));
  const total = totalMinutes(draft.steps);
  const totalErr = errors.total;

  const setStep = (s: ReminderStep) => setDraft(d => ({ ...d, steps: d.steps.map(x => (x.id === s.id ? s : x)) }));
  const addStep = () => { const s = emptyStep(); setDraft(d => ({ ...d, steps: [...d.steps, s] })); setOpenStep(s.id); };
  const removeStep = (id: string) => setDraft(d => ({ ...d, steps: d.steps.filter(x => x.id !== id) }));

  const requestClose = () => { if (dirty && !readOnly) setConfirmDiscard(true); else onClose(); };

  const save = () => {
    setSubmitted(true);
    if (errors.fields.size || totalErr) {
      const first = [...errors.fields.keys()][0];
      if (first?.startsWith("step.")) {
        const stepId = first.split(".")[1];
        setOpenStep(stepId);
        window.setTimeout(() => bodyRef.current?.querySelector(`[data-step="${stepId}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 60);
      } else if (first) {
        bodyRef.current?.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return;
    }
    reminderStore.save(agentId, { ...draft, name: draft.name.trim() });
    toast.success(mode === "create" ? "Đã thêm reminder." : "Đã lưu reminder.");
    onSaved();
  };

  const showMessenger = includes(draft.channels, "messenger");
  const showApi = includes(draft.channels, "api");
  const nameErr = show("name") ? errors.fields.get("name") : undefined;
  const channelsErr = show("channels") ? errors.fields.get("channels") : undefined;

  return (
    <>
      <Sheet open onOpenChange={o => { if (!o) requestClose(); }}>
        <SheetContent side="right" className="w-full sm:max-w-[560px] p-0 flex flex-col gap-0">
          <SheetHeader className="px-6 pt-5 pb-4 border-b text-left">
            <SheetTitle>{readOnly ? "Xem reminder" : mode === "create" ? "Thêm reminder" : "Chỉnh sửa reminder"}</SheetTitle>
            <SheetDescription className="sr-only">Cấu hình các lần nhắc khi người dùng ngừng phản hồi.</SheetDescription>
          </SheetHeader>

          <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
            {(showMessenger || showApi) && (
              <div className="space-y-2">
                {showMessenger && (
                  <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
                    <Icon icon={Alert02Icon} className="mt-0.5 shrink-0 text-warning" /> Lời nhắc sau 24 giờ có thể không gửi được trên Messenger.
                  </p>
                )}
                {showApi && (
                  <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
                    <Icon icon={Alert02Icon} className="mt-0.5 shrink-0 text-warning" /> Kênh API sẽ không nhận lời nhắc cho đến khi đăng ký sự kiện <code className="font-mono text-xs">agent.reminder.sent</code>.
                  </p>
                )}
              </div>
            )}

            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Thông tin chung</h3>
              <div>
                <label htmlFor="rem-name" className="text-sm font-medium">Reminder name <span className="text-destructive">*</span></label>
                <Input id="rem-name" autoFocus={!readOnly} value={draft.name} maxLength={100} disabled={readOnly} data-field="name"
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} onBlur={() => touch("name")}
                  placeholder="VD: Nhắc xin số điện thoại" className="mt-1.5" aria-invalid={!!nameErr} />
                <Err>{nameErr}</Err>
              </div>
              <div>
                <label htmlFor="rem-channels" className="text-sm font-medium">Channels <span className="text-destructive">*</span></label>
                <div className="mt-1.5"><ChannelsSelect value={draft.channels} disabled={readOnly} onChange={v => { setDraft(d => ({ ...d, channels: v })); touch("channels"); }} /></div>
                <Helper>Tên và kênh áp dụng cho tất cả lần nhắc của reminder này.</Helper>
                <Err>{channelsErr}</Err>
              </div>
            </section>

            <section className="space-y-3">
              {draft.steps.map((s, i) => (
                <StepCard
                  key={s.id}
                  agentId={agentId}
                  step={s}
                  index={i}
                  open={openStep === s.id}
                  onToggle={() => setOpenStep(o => (o === s.id ? "" : s.id))}
                  onChange={setStep}
                  onRemove={i > 0 ? () => removeStep(s.id) : undefined}
                  readOnly={readOnly}
                  errors={errors.fields}
                  show={show}
                  touch={touch}
                  channels={draft.channels}
                />
              ))}
              {!readOnly && draft.steps.length < MAX_STEPS && (
                <Button type="button" variant="outline" className="w-full border-dashed" onClick={addStep}>
                  <Icon icon={Add01Icon} /> Thêm lần nhắc <span className="tabular-nums text-muted-foreground">{draft.steps.length}/{MAX_STEPS}</span>
                </Button>
              )}
            </section>
          </div>

          <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
            <div className="min-w-0">
              <p className={`text-sm tabular-nums ${totalErr ? "text-destructive font-medium" : "text-muted-foreground"}`}>Tổng thời gian: {total ? fmtMinutes(total) : "0 phút"}</p>
              {totalErr && <p className="text-xs text-destructive" role="alert">{totalErr}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              {readOnly ? (
                <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={requestClose}>Hủy</Button>
                  <Button type="button" onClick={save}><Icon icon={Tick02Icon} /> Lưu</Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent >
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ các thay đổi chưa lưu?</AlertDialogTitle>
            <AlertDialogDescription>Những gì bạn vừa nhập cho reminder này sẽ mất.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục sửa</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setConfirmDiscard(false); onClose(); }}>Bỏ thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
