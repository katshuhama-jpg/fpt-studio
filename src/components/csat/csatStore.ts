// "Cấu hình CSAT" (TOVA-5953) — one rating config per Agent, shared by every reminder that has
// CSAT rating on. Saved to the draft (takes effect after Publish). sessionStorage-backed, no backend.
import { loadMap, saveMap } from "@/lib/sessionPersist";

export interface CsatConfig {
  /** Công tắc trong popup. Tắt thì Lần nhắc CSAT gửi không kèm đánh giá. */
  enabled: boolean;
  buttonTitle: string;
  webviewTitle: string;
  webviewDescription: string;
  /** Placeholder của ô nhận xét trong webview. */
  commentPlaceholder: string;
  thankYou: string;
  expired: string;
}
export type CsatField = Exclude<keyof CsatConfig, "enabled">;

/** Lần đầu mở popup: các trường điền sẵn mặc định và công tắc đang bật. */
export const DEFAULT_CSAT: CsatConfig = {
  enabled: true,
  buttonTitle: "Rate this conversation",
  webviewTitle: "How would you rate your experience?",
  webviewDescription: "Your conversation has been resolved. Let us know how it went!",
  commentPlaceholder: "Share more about your experience...",
  thankYou: "Thank you for your valuable feedback!",
  expired: "Rating period expired!",
};

/** BR-01 — giới hạn ký tự; mọi trường đều bắt buộc. */
export const CSAT_LIMITS: Record<CsatField, number> = {
  buttonTitle: 30,
  webviewTitle: 100,
  webviewDescription: 245,
  commentPlaceholder: 100,
  thankYou: 245,
  expired: 200,
};

export function validateCsat(c: CsatConfig): Partial<Record<CsatField, string>> {
  const errs: Partial<Record<CsatField, string>> = {};
  (Object.keys(CSAT_LIMITS) as CsatField[]).forEach(k => {
    const v = c[k].trim();
    if (!v) errs[k] = "Trường này là bắt buộc";
    else if (c[k].length > CSAT_LIMITS[k]) errs[k] = `Tối đa ${CSAT_LIMITS[k]} ký tự`;
  });
  return errs;
}

const KEY = "csat_config_v1";
const SEEDED = "csat_config_seeded_v1";
const map = loadMap<string, CsatConfig>(KEY);
const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version++; listeners.forEach(fn => fn()); };

/** Demo: "cskh" đã cấu hình (reminder "Chốt đơn" có CSAT); mọi Agent khác bắt đầu ở "Chưa cấu hình". */
function seed(agentId: string) {
  try {
    if (sessionStorage.getItem(`${SEEDED}:${agentId}`)) return;
    sessionStorage.setItem(`${SEEDED}:${agentId}`, "1");
  } catch { return; }
  if (agentId === "cskh" && !map.has(agentId)) { map.set(agentId, DEFAULT_CSAT); saveMap(KEY, map); }
}

export const csatStore = {
  /** BR-02 — Đã cấu hình = popup đã được Lưu thành công ít nhất một lần. */
  isConfigured(agentId: string): boolean { seed(agentId); return map.has(agentId); },
  get(agentId: string): CsatConfig { seed(agentId); const v = map.get(agentId); return v ? { ...DEFAULT_CSAT, ...v } : DEFAULT_CSAT; },
  save(agentId: string, c: CsatConfig) { map.set(agentId, c); saveMap(KEY, map); emit(); },
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  version: () => version,
};
