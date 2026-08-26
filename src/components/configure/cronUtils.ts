// Shared standard 5-field cron validation/description — used by TriggerFormDialog (live
// validation + preview) and triggerStore (deriving whether a saved trigger needs setup).

function validateCronField(field: string, min: number, max: number): boolean {
  if (field === "*") return true;
  const parts = field.split(",");
  if (parts.some(p => p === "")) return false;
  for (const part of parts) {
    const stepMatch = part.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
    if (stepMatch) {
      const step = Number(stepMatch[2]);
      if (step <= 0) return false;
      if (stepMatch[1] !== "*") {
        const m = stepMatch[1].match(/^(\d+)(?:-(\d+))?$/);
        if (!m) return false;
        const a = Number(m[1]);
        const b = m[2] !== undefined ? Number(m[2]) : max;
        if (a < min || a > max || b < min || b > max || a > b) return false;
      }
      continue;
    }
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return false;
    const a = Number(m[1]);
    const b = m[2] !== undefined ? Number(m[2]) : a;
    if (a < min || a > max || b < min || b > max || a > b) return false;
  }
  return true;
}

export function expandCronField(field: string, min: number, max: number): number[] {
  if (field === "*") {
    const out: number[] = [];
    for (let i = min; i <= max; i++) out.push(i);
    return out;
  }
  const result = new Set<number>();
  for (const part of field.split(",")) {
    const stepMatch = part.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
    if (stepMatch) {
      const step = Number(stepMatch[2]);
      let a = min, b = max;
      if (stepMatch[1] !== "*") {
        const m = stepMatch[1].match(/^(\d+)(?:-(\d+))?$/)!;
        a = Number(m[1]);
        b = m[2] !== undefined ? Number(m[2]) : max;
      }
      for (let i = a; i <= b; i += step) result.add(i);
      continue;
    }
    const m = part.match(/^(\d+)(?:-(\d+))?$/)!;
    const a = Number(m[1]);
    const b = m[2] !== undefined ? Number(m[2]) : a;
    for (let i = a; i <= b; i++) result.add(i);
  }
  return [...result].sort((x, y) => x - y);
}

export interface CronCheck { valid: boolean; tooFrequent: boolean; }

export function checkCronExpression(expr: string): CronCheck {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return { valid: false, tooFrequent: false };
  const [minute, hour, dom, month, dow] = fields;
  if (
    !validateCronField(minute, 0, 59) ||
    !validateCronField(hour, 0, 23) ||
    !validateCronField(dom, 1, 31) ||
    !validateCronField(month, 1, 12) ||
    !validateCronField(dow, 0, 7)
  ) return { valid: false, tooFrequent: false };

  const minutes = expandCronField(minute, 0, 59);
  let tooFrequent = false;
  if (minutes.length > 1) {
    let minGap = Infinity;
    for (let i = 0; i < minutes.length; i++) {
      const next = minutes[(i + 1) % minutes.length];
      const gap = i === minutes.length - 1 ? next + 60 - minutes[i] : next - minutes[i];
      minGap = Math.min(minGap, gap);
    }
    tooFrequent = minGap < 10;
  }
  return { valid: true, tooFrequent };
}

const DOW_NAMES_VN = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export function describeCronVN(expr: string): string {
  const [minute, hour, dom, month, dow] = expr.trim().split(/\s+/);
  const isSingle = (f: string) => /^\d+$/.test(f);
  const timePart = isSingle(minute) && isSingle(hour) ? `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}` : null;

  // A step pattern on the minute field with every other field wildcard ("*/15 * * * *") is a
  // plain "every N minutes" interval schedule, not a specific time of day.
  const minuteStepMatch = minute.match(/^(?:\*|0)\/(\d+)$/);
  if (minuteStepMatch && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return `Chạy mỗi ${minuteStepMatch[1]} phút`;
  }

  if (timePart) {
    if (dow !== "*" && dom === "*" && month === "*") {
      const rangeMatch = dow.match(/^(\d)-(\d)$/);
      const dayList = rangeMatch
        ? `các ngày trong tuần (${DOW_NAMES_VN[Number(rangeMatch[1]) % 7]} – ${DOW_NAMES_VN[Number(rangeMatch[2]) % 7]})`
        : expandCronField(dow, 0, 7).map(d => DOW_NAMES_VN[d % 7]).join(", ");
      return `Chạy lúc ${timePart} vào ${dayList}`;
    }
    if (dom !== "*" && dow === "*" && month === "*") return `Chạy ngày ${dom} hằng tháng lúc ${timePart}`;
    if (dom === "*" && dow === "*" && month === "*") return `Chạy hằng ngày lúc ${timePart}`;
    const parts: string[] = [];
    if (dom !== "*") parts.push(`ngày ${dom}`);
    if (dow !== "*") parts.push(`vào ${expandCronField(dow, 0, 7).map(d => DOW_NAMES_VN[d % 7]).join(", ")}`);
    if (month !== "*") parts.push(`(tháng ${month})`);
    return `Chạy lúc ${timePart} ${parts.join(" ")}`.trim();
  }
  return `Chạy theo lịch: phút ${minute}, giờ ${hour}, ngày ${dom}, tháng ${month}, thứ ${dow}`;
}
