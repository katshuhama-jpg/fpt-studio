import type { OutputField } from "./types";

const TYPE_LABEL: Record<OutputField["type"], string> = { text: "Văn bản", number: "Số", boolean: "Đúng/Sai", table: "Bảng" };

/** Read-only list of a step's structured outputs - what Condition rules downstream can use. */
export default function OutputFieldsList({ fields, title = "Đầu ra có cấu trúc" }: { fields: OutputField[]; title?: string }) {
  return (
    <div className="pt-4 mt-4 border-t border-border">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Chỉ trả văn bản - Condition sau bước này phải dùng LLM để đọc.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {fields.map(f => (
            <li key={f.key} className="flex items-center gap-2 text-xs">
              <code className="font-mono px-1.5 py-0.5 rounded bg-surface-muted">{f.key}</code>
              <span className="text-muted-foreground truncate flex-1">{f.label}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{TYPE_LABEL[f.type]}</span>
            </li>
          ))}
        </ul>
      )}
      {fields.length > 0 && <p className="text-[11px] text-muted-foreground mt-2">Condition ở tuyến ra chọn được các trường này làm biến của rule.</p>}
    </div>
  );
}
