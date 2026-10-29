import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, StarIcon } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { channelLabel, fmtMinutes, resolvedChannels, stepMinutes, type Reminder } from "./reminderStore";

type IconData = Parameters<typeof HugeiconsIcon>[0]["icon"];
const Icon = ({ icon, size = 14, className = "" }: { icon: IconData; size?: number; className?: string }) =>
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;

const Agent = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-start">
    <div className="h-6 w-6 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold mr-2 mt-0.5">A</div>
    <div className="max-w-[82%] rounded-2xl rounded-bl-sm border bg-muted px-3 py-2 text-xs leading-relaxed">{children}</div>
  </div>
);
const User = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-end">
    <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-xs leading-relaxed text-primary-foreground">{children}</div>
  </div>
);
/** The silence between the agent's last message and a nudge. */
const Gap = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 py-1" aria-label={`Im lặng ${label}`}>
    <span className="h-px flex-1 bg-border" />
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon icon={Clock01Icon} size={12} /> im lặng {label}</span>
    <span className="h-px flex-1 bg-border" />
  </div>
);

/** The rating block the platform appends when a step has CSAT on. */
const Csat = () => (
  <div className="mt-2 rounded-lg border bg-card p-2">
    <p className="text-[11px] text-muted-foreground">Bạn thấy cuộc trò chuyện này thế nào?</p>
    <div className="mt-1.5 flex gap-1" role="img" aria-label="Thang đánh giá 5 sao">
      {[1, 2, 3, 4, 5].map(i => <Icon key={i} icon={StarIcon} size={16} className="text-warning" />)}
    </div>
  </div>
);

const plain = (t: string) => t.replace(/\{\{ref:[^|}]*\|?([^}]*)\}\}/g, "$1").replace(/\s+/g, " ").trim();

/** Màn 5 — how the nudges land for the end user, per channel. */
export default function ReminderPreviewDialog({ agentId, reminder, onClose }: {
  agentId: string; reminder: Reminder; onClose: () => void;
}) {
  const channels = resolvedChannels(agentId, reminder.channels);
  const [channel, setChannel] = useState(channels[0] ?? "web");

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Xem trước phía người dùng</DialogTitle>
          <DialogDescription>{reminder.name} — mô phỏng, không gửi tin thật.</DialogDescription>
        </DialogHeader>

        {channels.length > 1 && (
          <div>
            <label htmlFor="prev-channel" className="text-xs font-medium">Kênh</label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger id="prev-channel" className="mt-1.5 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{channels.map(c => <SelectItem key={c} value={c}>{channelLabel(c)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        {channels.length === 1 && <p className="text-xs text-muted-foreground">Kênh: {channelLabel(channels[0])}</p>}
        {channels.length === 0 && <p className="text-xs text-warning">Reminder chưa có kênh nào đang hoạt động.</p>}

        <div className="max-h-[52vh] space-y-2.5 overflow-y-auto rounded-lg border bg-background p-3">
          <Agent>Anh/chị để lại số điện thoại giúp em để bên em gọi lại tư vấn ạ?</Agent>
          <User>…</User>
          {reminder.steps.map((s, i) => (
            <div key={s.id} className="space-y-2.5">
              <Gap label={fmtMinutes(stepMinutes(s))} />
              <Agent>
                {plain(s.instruction) || <span className="text-muted-foreground">(chưa có Instruction)</span>}
                {s.csat && <Csat />}
              </Agent>
              {i === 0 && <p className="text-center text-[11px] text-muted-foreground">Người dùng vẫn chưa trả lời</p>}
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Mỗi lượt chờ chỉ gửi tối đa 3 tin nhắc, tính trên mọi reminder đang bật của Agent.
        </p>
      </DialogContent>
    </Dialog>
  );
}
