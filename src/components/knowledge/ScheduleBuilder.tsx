import { describeSchedule, type ScheduleConfig, type ScheduleFrequency } from "./knowledgeSettingsStore";

const FREQ_OPTIONS: { value: ScheduleFrequency; label: string }[] = [
  { value: "daily", label: "Hàng ngày" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "monthly", label: "Hàng tháng" },
];
const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, "0");
  const m = ((i % 4) * 15).toString().padStart(2, "0");
  return `${h}:${m}`;
});

/** Shared frequency/time builder — used by both the Settings tab's global schedule and the
 * per-URL schedule override modal, so the two never drift into different pickers. */
export default function ScheduleBuilder({ value, onChange }: { value: ScheduleConfig; onChange: (next: ScheduleConfig) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Tần suất</label>
        <div className="inline-flex items-center bg-surface-muted rounded-lg p-1">
          {FREQ_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange({ ...value, frequency: o.value })}
              className={`px-3 h-8 rounded-md text-sm font-medium transition-base ${value.frequency === o.value ? "bg-white shadow-soft text-foreground" : "text-muted-foreground"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {value.frequency === "weekly" && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Vào các ngày</label>
          <div className="flex gap-1.5">
            {WEEKDAY_LABELS.map((label, day) => {
              const active = (value.daysOfWeek ?? [1]).includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const cur = new Set(value.daysOfWeek ?? [1]);
                    active ? cur.delete(day) : cur.add(day);
                    onChange({ ...value, daysOfWeek: cur.size > 0 ? [...cur].sort() : [day] });
                  }}
                  className={`w-9 h-9 rounded-lg text-xs font-medium border transition-base ${active ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-muted-foreground hover:bg-surface-muted"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {value.frequency === "monthly" && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Vào ngày</label>
          <select
            value={value.dayOfMonth ?? 1}
            onChange={e => onChange({ ...value, dayOfMonth: e.target.value === "last" ? "last" : Number(e.target.value) })}
            className="h-9 px-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary transition-base"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>Ngày {d}</option>)}
            <option value="last">Ngày cuối tháng</option>
          </select>
        </div>
      )}

      <div>
        <label className="text-sm font-medium mb-1.5 block">Vào lúc</label>
        <select value={value.time} onChange={e => onChange({ ...value, time: e.target.value })} className="h-9 px-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary transition-base">
          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <p className="text-xs text-muted-foreground">Múi giờ: (GMT+7) Hồ Chí Minh</p>
      <p className="text-xs text-foreground bg-surface-muted rounded-lg px-3 py-2">{describeSchedule(value)}</p>
    </div>
  );
}
