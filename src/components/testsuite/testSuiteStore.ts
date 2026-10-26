// Test (Evaluate › Test Suites / Lịch sử chạy) — prototype store for the "Generate Testcase" flow.
// Test Suite → testcase (Q&A or Kịch bản) → Test Run (simulated against the Agent) → Tester review.
// sessionStorage-backed, no backend; runs are advanced by a timer so the progress screen is live.
import { useSyncExternalStore } from "react";

export type CaseKind = "qna" | "scenario";
export const KIND_LABEL: Record<CaseKind, string> = { qna: "Q&A", scenario: "Kịch bản" };

export interface Turn { id: string; question: string; expected: string }
interface CaseBase { id: string; topic: string; reference: string; createdAt: number }
export interface QnaCase extends CaseBase { kind: "qna"; question: string; expected: string }
export interface ScenarioCase extends CaseBase { kind: "scenario"; name: string; turns: Turn[] }
export type TestCase = QnaCase | ScenarioCase;

export interface Suite { id: string; agentId: string; name: string; description: string; cases: TestCase[]; createdAt: number }

export type Verdict = "pass" | "fail";
export interface TurnResult { actual: string; ai: Verdict; verdict?: Verdict }
export interface CaseResult {
  state: "queued" | "running" | "done" | "error";
  /** Kịch bản: turns answered so far. */
  turnsDone: number;
  actual?: string;
  ai?: Verdict;
  /** Tester override (Điều chỉnh); undefined = follows AI. */
  verdict?: Verdict;
  confirmed: boolean;
  note: string;
  turns?: TurnResult[];
}
/** running → stopped (Đã dừng) | pending (Chờ xác nhận) → done (Hoàn tất). */
export type RunStatus = "running" | "stopped" | "pending" | "done";
export const RUN_STATUS_LABEL: Record<RunStatus, string> = { running: "Đang chạy", stopped: "Đã dừng", pending: "Chờ xác nhận", done: "Hoàn tất" };
export interface Run {
  id: string; agentId: string; suiteId: string; number: number;
  startedAt: number; by: string; status: RunStatus;
  /** Snapshot of the cases at start — later edits apply from the next run. */
  cases: TestCase[];
  results: Record<string, CaseResult>;
}

/* ───────────── helpers ───────────── */

let seq = 0;
export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

export const caseSummary = (c: TestCase) => (c.kind === "qna" ? c.question : `${c.name ? `${c.name} · ` : ""}Kịch bản ${c.turns.length} lượt`);
export const countKinds = (cases: TestCase[]) => ({
  qna: cases.filter(c => c.kind === "qna").length,
  scenario: cases.filter(c => c.kind === "scenario").length,
});

/** Tester's verdict wins; Kịch bản passes only when every turn passes (pending backend rule). */
export function turnVerdict(t: TurnResult): Verdict { return t.verdict ?? t.ai; }
export function caseVerdict(r: CaseResult | undefined): Verdict | "error" | undefined {
  if (!r) return undefined;
  if (r.state === "error") return "error";
  if (r.state !== "done") return undefined;
  if (r.verdict) return r.verdict;
  if (r.turns) return r.turns.every(t => turnVerdict(t) === "pass") ? "pass" : "fail";
  return r.ai;
}
export const SCENARIO_RULE = "Pass khi tất cả các lượt đều Pass.";

export function runStats(run: Run) {
  let pass = 0, fail = 0, error = 0, done = 0;
  for (const c of run.cases) {
    const v = caseVerdict(run.results[c.id]);
    if (v === "pass") pass++; else if (v === "fail") fail++; else if (v === "error") error++;
    if (v) done++;
  }
  const total = run.cases.length;
  return { total, pass, fail, error, done, pct: total ? Math.round((pass / total) * 100) : 0 };
}
export type Tone = "good" | "mid" | "bad";
/** Fixed thresholds: ≥ 80 xanh, 50–79 vàng, < 50 đỏ. */
export const toneOf = (pct: number): Tone => (pct >= 80 ? "good" : pct >= 50 ? "mid" : "bad");

export function fmtTime(t: number) {
  return new Date(t).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ───────────── persistence + subscription ───────────── */

const KEY = "test_suites_v1";
interface State { suites: Suite[]; runs: Run[]; seeded: string[] }
function load(): State {
  try { const raw = sessionStorage.getItem(KEY); if (raw) return JSON.parse(raw) as State; } catch { /* ignore */ }
  return { suites: [], runs: [], seeded: [] };
}
let state: State = load();
let version = 0;
const listeners = new Set<() => void>();
function commit(next: State) {
  state = next;
  version++;
  try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach(l => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
/** Re-render on any store change. */
export function useTestStore() { return useSyncExternalStore(subscribe, () => version, () => version); }

/* ───────────── seed ───────────── */

const qna = (question: string, expected: string, topic: string, reference = ""): QnaCase =>
  ({ id: uid("tc"), kind: "qna", question, expected, topic, reference, createdAt: Date.now() });
const scenario = (name: string, topic: string, turns: [string, string][], reference = ""): ScenarioCase =>
  ({ id: uid("tc"), kind: "scenario", name, topic, reference, createdAt: Date.now(), turns: turns.map(([question, expected]) => ({ id: uid("turn"), question, expected })) });

function seedSuites(agentId: string): Suite[] {
  const now = Date.now();
  return [
    {
      id: uid("suite"), agentId, name: "CSKH – Câu hỏi thường gặp", description: "Các câu hỏi phổ biến về phí, hạn mức, giờ làm việc và kênh hỗ trợ.", createdAt: now - 9 * 86_400_000,
      cases: [
        qna("Phí duy trì tài khoản thanh toán là bao nhiêu?", "Miễn phí nếu số dư bình quân từ 2 triệu đồng; dưới mức này thu 11.000đ/tháng.", "Phí dịch vụ", "Biểu phí 2026.pdf"),
        qna("Hạn mức chuyển khoản online tối đa một ngày?", "500 triệu đồng/ngày với Smart OTP, 100 triệu đồng/ngày với SMS OTP.", "Hạn mức", "Quy định hạn mức.docx"),
        qna("Chi nhánh làm việc thứ Bảy không?", "Có, các chi nhánh trung tâm làm việc sáng thứ Bảy từ 8h đến 11h30.", "Giờ làm việc"),
        qna("Làm sao khoá thẻ khi bị mất?", "Khoá ngay trên app mục Thẻ › Khoá thẻ hoặc gọi hotline 1900 xxxx 24/7.", "Thẻ", "Hướng dẫn thẻ.pdf"),
        qna("Quên mật khẩu đăng nhập app thì làm gì?", "Chọn Quên mật khẩu, nhập số điện thoại đăng ký và mã OTP để đặt lại.", "Tài khoản"),
        qna("Lãi suất tiết kiệm 12 tháng hiện tại?", "5,2%/năm cho kỳ hạn 12 tháng gửi tại quầy, 5,4%/năm gửi online.", "Lãi suất", "Biểu lãi suất T10.pdf"),
        qna("Có hỗ trợ mở tài khoản cho người nước ngoài không?", "Có, cần hộ chiếu còn hạn và thị thực/thẻ tạm trú còn hiệu lực tối thiểu 6 tháng.", "Tài khoản"),
        qna("Thời gian xử lý khiếu nại giao dịch?", "Tối đa 15 ngày làm việc kể từ khi nhận đủ hồ sơ.", "Khiếu nại"),
        scenario("Đổi hạn mức thẻ", "Thẻ", [
          ["Tôi muốn tăng hạn mức thẻ tín dụng.", "Hỏi khách loại thẻ và hạn mức mong muốn."],
          ["Thẻ Visa Platinum, lên 100 triệu.", "Xác nhận yêu cầu và nêu hồ sơ thu nhập cần bổ sung."],
          ["Tôi gửi sao kê lương được không?", "Đồng ý, hướng dẫn tải sao kê 3 tháng gần nhất lên app."],
        ]),
        scenario("Hỏi phí rồi đổi ý", "Phí dịch vụ", [
          ["Phí rút tiền ATM khác ngân hàng?", "3.300đ/lần."],
          ["À tôi hỏi phí rút cùng ngân hàng cơ.", "Miễn phí, nhớ ngữ cảnh khách đổi câu hỏi."],
        ]),
      ],
    },
    {
      id: uid("suite"), agentId, name: "Đăng ký tài khoản", description: "Luồng mở tài khoản online qua eKYC.", createdAt: now - 5 * 86_400_000,
      cases: [
        qna("Mở tài khoản online cần giấy tờ gì?", "CCCD gắn chip còn hạn và số điện thoại chính chủ.", "eKYC"),
        qna("eKYC bị lỗi nhận diện khuôn mặt thì sao?", "Thử lại nơi đủ sáng, bỏ kính/khẩu trang; sau 3 lần lỗi hướng dẫn ra quầy.", "eKYC"),
        qna("Bao lâu thì tài khoản được kích hoạt?", "Ngay sau khi hoàn tất eKYC, tối đa 5 phút.", "eKYC"),
        qna("Có chọn được số tài khoản đẹp không?", "Có, chọn ở bước 3, số đẹp có thể tính phí theo biểu phí.", "Tài khoản"),
        scenario("Bỏ dở rồi quay lại", "eKYC", [
          ["Tôi đang đăng ký dở thì thoát app.", "Trấn an, hướng dẫn mở lại app để tiếp tục từ bước đã lưu."],
          ["Mở lại thì phải chụp CCCD lại không?", "Không cần nếu đã qua bước chụp CCCD trong 24 giờ."],
        ]),
        scenario("Sai số điện thoại", "Tài khoản", [
          ["Tôi nhập nhầm số điện thoại khi đăng ký.", "Hỏi khách đã nhận OTP chưa."],
          ["Chưa nhận.", "Hướng dẫn quay lại bước 1 để sửa số điện thoại."],
          ["Sửa xong rồi vẫn không nhận OTP.", "Xin số mới để kiểm tra, đề nghị chuyển nhân viên nếu vẫn lỗi."],
        ]),
      ],
    },
    {
      id: uid("suite"), agentId, name: "Ngoài phạm vi", description: "Câu hỏi Agent phải từ chối lịch sự hoặc chuyển hướng.", createdAt: now - 2 * 86_400_000,
      cases: [
        qna("Nên mua cổ phiếu nào lúc này?", "Từ chối tư vấn đầu tư, gợi ý liên hệ chuyên viên tư vấn tài chính.", "Ngoài phạm vi"),
        qna("Kể chuyện cười đi.", "Từ chối nhẹ nhàng và quay lại các dịch vụ ngân hàng.", "Ngoài phạm vi"),
      ],
    },
  ];
}

const ANSWER_VARIANTS = [
  (e: string) => e,
  (e: string) => `Dạ, ${e.charAt(0).toLowerCase()}${e.slice(1)} Anh/chị cần hỗ trợ thêm gì không ạ?`,
  () => "Xin lỗi, hiện tôi chưa có thông tin về nội dung này. Anh/chị vui lòng liên hệ hotline để được hỗ trợ.",
];
/** Deterministic fake run of one testcase; ~1 in 12 is a system error. */
function simulate(c: TestCase, salt: string): CaseResult {
  const h = hash(c.id + salt);
  if (h % 12 === 5) return { state: "error", turnsDone: 0, confirmed: false, note: "" };
  if (c.kind === "qna") {
    const v = h % 4 === 0 ? 2 : h % 3;
    return { state: "done", turnsDone: 1, actual: ANSWER_VARIANTS[v](c.expected), ai: v === 2 ? "fail" : "pass", confirmed: false, note: "" };
  }
  const turns = c.turns.map((t, i) => {
    const v = (h >> i) % 5 === 0 ? 2 : 0;
    return { actual: ANSWER_VARIANTS[v](t.expected), ai: (v === 2 ? "fail" : "pass") as Verdict };
  });
  return { state: "done", turnsDone: turns.length, confirmed: false, note: "", turns };
}

function seedRuns(suites: Suite[], by: string): Run[] {
  const [faq, signup] = suites;
  const mk = (s: Suite, number: number, ago: number, status: RunStatus, confirmAll: boolean): Run => {
    const salt = `${s.id}-${number}`;
    const results: Record<string, CaseResult> = {};
    for (const c of s.cases) {
      const r = simulate(c, salt);
      results[c.id] = confirmAll && r.state === "done" ? { ...r, confirmed: true } : r;
    }
    return { id: uid("run"), agentId: s.agentId, suiteId: s.id, number, startedAt: Date.now() - ago, by, status, cases: s.cases, results };
  };
  return [
    mk(signup, 1, 26 * 3_600_000, "pending", false),
    mk(faq, 2, 3 * 3_600_000, "pending", false),
    mk(faq, 1, 3 * 86_400_000, "done", true),
  ];
}

function ensure(agentId: string) {
  if (state.seeded.includes(agentId)) return;
  const suites = seedSuites(agentId);
  commit({ suites: [...state.suites, ...suites], runs: [...state.runs, ...seedRuns(suites, "Trần Nam")], seeded: [...state.seeded, agentId] });
}

/* ───────────── run engine (timer) ───────────── */

const TICK_MS = 650;
let timer: ReturnType<typeof setInterval> | null = null;
function tick() {
  const running = state.runs.filter(r => r.status === "running");
  if (!running.length) { if (timer) clearInterval(timer); timer = null; return; }
  commit({ ...state, runs: state.runs.map(r => (r.status === "running" ? advance(r) : r)) });
}
function advance(run: Run): Run {
  const results = { ...run.results };
  const next = run.cases.find(c => ["queued", "running"].includes(results[c.id]?.state ?? "done"));
  if (!next) {
    return { ...run, status: allConfirmed({ ...run, results }) ? "done" : "pending" };
  }
  const cur = results[next.id];
  if (cur.state === "queued") {
    results[next.id] = { ...cur, state: "running", turnsDone: 0 };
  } else {
    const final = simulate(next, `${run.id}`);
    const turnCount = next.kind === "scenario" ? next.turns.length : 1;
    if (final.state === "done" && next.kind === "scenario" && cur.turnsDone + 1 < turnCount) {
      results[next.id] = { ...cur, turnsDone: cur.turnsDone + 1 };
    } else {
      results[next.id] = { ...final, note: cur.note };
    }
  }
  return { ...run, results };
}
function ensureTimer() { if (!timer && state.runs.some(r => r.status === "running")) timer = setInterval(tick, TICK_MS); }
const allConfirmed = (run: Run) => run.cases.every(c => { const r = run.results[c.id]; return r && (r.state === "error" || (r.state === "done" && r.confirmed)); });

/* ───────────── public API ───────────── */

export const testStore = {
  ensure,
  suites(agentId: string): Suite[] { ensure(agentId); ensureTimer(); return state.suites.filter(s => s.agentId === agentId).sort((a, b) => b.createdAt - a.createdAt); },
  suite(id: string | null | undefined): Suite | undefined { return id ? state.suites.find(s => s.id === id) : undefined; },
  runs(agentId: string, suiteId?: string): Run[] {
    ensure(agentId); ensureTimer();
    return state.runs.filter(r => r.agentId === agentId && (!suiteId || r.suiteId === suiteId)).sort((a, b) => b.startedAt - a.startedAt);
  },
  run(id: string | null | undefined): Run | undefined { return id ? state.runs.find(r => r.id === id) : undefined; },
  lastRun(suiteId: string): Run | undefined { return state.runs.filter(r => r.suiteId === suiteId && r.status !== "running").sort((a, b) => b.startedAt - a.startedAt)[0]; },
  activeRun(suiteId: string): Run | undefined { return state.runs.find(r => r.suiteId === suiteId && r.status === "running"); },
  pendingCount(agentId: string): number { return this.runs(agentId).filter(r => r.status === "pending").length; },
  /** Latest finished verdict per testcase (for the suite detail table). */
  lastVerdict(suiteId: string, caseId: string): Verdict | "error" | undefined {
    for (const r of state.runs.filter(x => x.suiteId === suiteId && x.status !== "running").sort((a, b) => b.startedAt - a.startedAt)) {
      const v = caseVerdict(r.results[caseId]);
      if (v) return v;
    }
    return undefined;
  },

  createSuite(agentId: string, name: string, description: string): Suite {
    const s: Suite = { id: uid("suite"), agentId, name: name.trim(), description: description.trim(), cases: [], createdAt: Date.now() };
    commit({ ...state, suites: [s, ...state.suites] });
    return s;
  },
  renameSuite(id: string, name: string, description?: string) {
    commit({ ...state, suites: state.suites.map(s => (s.id === id ? { ...s, name: name.trim(), description: description ?? s.description } : s)) });
  },
  deleteSuite(id: string) {
    commit({ ...state, suites: state.suites.filter(s => s.id !== id), runs: state.runs.filter(r => r.suiteId !== id) });
  },
  nameTaken(agentId: string, name: string, exceptId?: string) {
    const n = name.trim().toLowerCase();
    return state.suites.some(s => s.agentId === agentId && s.id !== exceptId && s.name.trim().toLowerCase() === n);
  },
  addCases(suiteId: string, cases: TestCase[]) {
    commit({ ...state, suites: state.suites.map(s => (s.id === suiteId ? { ...s, cases: [...s.cases, ...cases] } : s)) });
  },
  updateCase(suiteId: string, c: TestCase) {
    commit({ ...state, suites: state.suites.map(s => (s.id === suiteId ? { ...s, cases: s.cases.map(x => (x.id === c.id ? c : x)) } : s)) });
  },
  /** Latest finished run that has a result for this testcase. */
  lastResult(suiteId: string, caseId: string): { run: Run; result: CaseResult } | undefined {
    for (const r of state.runs.filter(x => x.suiteId === suiteId && x.status !== "running").sort((a, b) => b.startedAt - a.startedAt)) {
      const result = r.results[caseId];
      if (result && (result.state === "done" || result.state === "error")) return { run: r, result };
    }
    return undefined;
  },
  removeCase(suiteId: string, caseId: string) {
    commit({ ...state, suites: state.suites.map(s => (s.id === suiteId ? { ...s, cases: s.cases.filter(c => c.id !== caseId) } : s)) });
  },

  /** onlyFailed: re-run just the Fail/Error cases of the latest finished run. */
  startRun(suiteId: string, by: string, onlyFailed = false): Run | undefined {
    const s = this.suite(suiteId);
    if (!s || !s.cases.length) return undefined;
    let cases = s.cases;
    if (onlyFailed) {
      const last = this.lastRun(suiteId);
      if (last) cases = s.cases.filter(c => { const v = caseVerdict(last.results[c.id]); return v === "fail" || v === "error"; });
    }
    if (!cases.length) return undefined;
    const number = state.runs.filter(r => r.suiteId === suiteId).reduce((m, r) => Math.max(m, r.number), 0) + 1;
    const run: Run = {
      id: uid("run"), agentId: s.agentId, suiteId, number, startedAt: Date.now(), by, status: "running", cases,
      results: Object.fromEntries(cases.map(c => [c.id, { state: "queued", turnsDone: 0, confirmed: false, note: "" } as CaseResult])),
    };
    commit({ ...state, runs: [run, ...state.runs] });
    ensureTimer();
    return run;
  },
  stopRun(runId: string) {
    commit({ ...state, runs: state.runs.map(r => {
      if (r.id !== runId || r.status !== "running") return r;
      const results = Object.fromEntries(Object.entries(r.results).filter(([, v]) => v.state === "done" || v.state === "error"));
      return { ...r, status: "stopped", cases: r.cases.filter(c => results[c.id]), results };
    }) });
  },
  /** ↻ Chạy lại testcase này (system error). */
  rerunCase(runId: string, caseId: string) {
    const run = this.run(runId);
    const c = run?.cases.find(x => x.id === caseId);
    if (!run || !c) return;
    let r = simulate(c, `${runId}-retry`);
    for (let i = 0; r.state === "error" && i < 20; i++) r = simulate(c, `${runId}-retry-${i}`);
    this.patchResult(runId, caseId, cur => ({ ...r, note: cur.note }));
  },
  patchResult(runId: string, caseId: string, fn: (r: CaseResult) => CaseResult) {
    commit({ ...state, runs: state.runs.map(run => {
      if (run.id !== runId) return run;
      const results = { ...run.results, [caseId]: fn(run.results[caseId]) };
      const next = { ...run, results };
      if (run.status === "pending" || run.status === "done") next.status = allConfirmed(next) ? "done" : "pending";
      return next;
    }) });
  },
  confirmAll(runId: string) {
    const run = this.run(runId);
    if (!run) return;
    for (const c of run.cases) {
      const r = run.results[c.id];
      if (r?.state === "done" && !r.confirmed) this.patchResult(runId, c.id, x => ({ ...x, confirmed: true }));
    }
  },

  /** Test hook. */
  _reset() { if (timer) clearInterval(timer); timer = null; commit({ suites: [], runs: [], seeded: [] }); },
  _tick() { tick(); },
};

/* ───────────── simulated AI generation ───────────── */

const QNA_POOL: [string, string, string][] = [
  ["Phí chuyển khoản liên ngân hàng là bao nhiêu?", "Miễn phí chuyển khoản online 24/7 trên app.", "Phí dịch vụ"],
  ["Thẻ ATM hết hạn thì đổi ở đâu?", "Đăng ký đổi thẻ trên app hoặc tại chi nhánh gần nhất, nhận thẻ sau 5–7 ngày.", "Thẻ"],
  ["Làm sao cập nhật CCCD mới?", "Vào Cài đặt › Thông tin cá nhân › Cập nhật CCCD và chụp 2 mặt thẻ.", "Tài khoản"],
  ["Tôi có thể vay tín chấp tối đa bao nhiêu?", "Tối đa 10 lần thu nhập hàng tháng, không quá 500 triệu đồng.", "Khoản vay"],
  ["Giao dịch bị trừ tiền nhưng người nhận chưa nhận?", "Ghi nhận mã giao dịch, kiểm tra trạng thái; tiền sẽ hoàn trong 1–3 ngày nếu lỗi.", "Khiếu nại"],
  ["Smart OTP là gì?", "Phương thức xác thực trên app thay SMS, an toàn và hạn mức cao hơn.", "Bảo mật"],
  ["Có thể tất toán sổ tiết kiệm online không?", "Có, với sổ mở online; sổ mở tại quầy cần ra chi nhánh.", "Tiết kiệm"],
  ["Tổng đài hỗ trợ làm việc mấy giờ?", "Hotline hỗ trợ 24/7, kể cả ngày lễ.", "Kênh hỗ trợ"],
  ["Làm sao đăng ký nhận lương qua tài khoản?", "Cung cấp số tài khoản cho bộ phận nhân sự công ty, không cần đăng ký thêm.", "Tài khoản"],
  ["Tôi bị lộ mã OTP thì phải làm gì?", "Khoá ngay dịch vụ ngân hàng điện tử trên app hoặc gọi hotline, đổi mật khẩu.", "Bảo mật"],
  ["Phí thường niên thẻ tín dụng?", "Miễn năm đầu, từ năm 2 thu 299.000đ, miễn nếu chi tiêu đủ 50 triệu/năm.", "Thẻ"],
  ["Mở thẻ tín dụng cần điều kiện gì?", "Từ 18 tuổi, thu nhập từ 5 triệu/tháng, có CCCD còn hạn.", "Thẻ"],
];
const SCENARIO_POOL: { name: string; topic: string; turns: [string, string][] }[] = [
  { name: "Hỏi lãi suất rồi mở sổ", topic: "Tiết kiệm", turns: [["Lãi suất 6 tháng bao nhiêu?", "Nêu lãi suất 6 tháng hiện hành."], ["Vậy mở sổ 50 triệu online được không?", "Hướng dẫn mở sổ online, nhớ kỳ hạn 6 tháng."], ["Đến hạn có tự gia hạn không?", "Giải thích tuỳ chọn tự tái tục."]] },
  { name: "Khiếu nại giao dịch lỗi", topic: "Khiếu nại", turns: [["Tôi chuyển tiền bị trừ mà người nhận chưa nhận.", "Hỏi mã giao dịch và thời gian."], ["Mã FT123, lúc 9h sáng.", "Xác nhận đã ghi nhận, nêu thời gian xử lý."]] },
  { name: "Đổi ý loại thẻ", topic: "Thẻ", turns: [["Tôi muốn mở thẻ ghi nợ.", "Hỏi nhu cầu sử dụng."], ["Thôi cho tôi thẻ tín dụng.", "Chuyển sang điều kiện thẻ tín dụng, không lặp lại thông tin thẻ ghi nợ."]] },
  { name: "Khoá thẻ khẩn cấp", topic: "Bảo mật", turns: [["Tôi mất ví, có thẻ trong đó.", "Hướng dẫn khoá thẻ ngay."], ["Khoá rồi, giờ làm lại thẻ thế nào?", "Hướng dẫn phát hành lại thẻ."]] },
];

export interface DraftCase { case: TestCase; accepted: boolean | null; updatedAt?: number }

/** Pretend the AI read the request (and attachment) and proposed testcases. */
export async function aiGenerate(kind: CaseKind, count: number | "auto", existing: number, fileName?: string, delay = 1400): Promise<TestCase[]> {
  await new Promise(r => setTimeout(r, delay));
  const n = count === "auto" ? (kind === "qna" ? (fileName ? 8 : 6) : 3) : count;
  const ref = fileName ?? "";
  return Array.from({ length: n }, (_, i) => {
    const k = existing + i;
    if (kind === "qna") {
      const [q, a, topic] = QNA_POOL[k % QNA_POOL.length];
      return qna(k >= QNA_POOL.length ? `${q} (biến thể ${Math.floor(k / QNA_POOL.length) + 1})` : q, a, topic, ref);
    }
    const s = SCENARIO_POOL[k % SCENARIO_POOL.length];
    return scenario(k >= SCENARIO_POOL.length ? `${s.name} ${Math.floor(k / SCENARIO_POOL.length) + 1}` : s.name, s.topic, s.turns, ref);
  });
}
/** "Refine with AI" on selected cards: tighten the expected answers. */
export async function aiRefine(cases: TestCase[], instruction: string, delay = 1000): Promise<TestCase[]> {
  await new Promise(r => setTimeout(r, delay));
  const tail = instruction.trim() ? ` (${instruction.trim().slice(0, 40)})` : "";
  return cases.map(c => c.kind === "qna"
    ? { ...c, expected: `${c.expected.replace(/\s*\(.*\)$/, "")}${tail}` }
    : { ...c, turns: c.turns.map(t => ({ ...t, expected: `${t.expected.replace(/\s*\(.*\)$/, "")}${tail}` })) });
}

export function toMarkdown(cases: TestCase[]): string {
  return cases.map((c, i) => c.kind === "qna"
    ? `### ${i + 1}. Q&A — ${c.topic || "Chưa có topic"}\n**Câu hỏi:** ${c.question}\n\n**Câu trả lời mong đợi:** ${c.expected}${c.reference ? `\n\n_Tham chiếu: ${c.reference}_` : ""}`
    : `### ${i + 1}. Kịch bản — ${c.name} (${c.turns.length} lượt)\n${c.turns.map((t, j) => `${j + 1}. **Hỏi:** ${t.question}\n   **Mong đợi:** ${t.expected}`).join("\n")}`).join("\n\n---\n\n");
}

export const newQna = (): QnaCase => qna("", "", "");
export const newScenario = (): ScenarioCase => scenario("", "", [["", ""], ["", ""]]);
export const newTurn = (): Turn => ({ id: uid("turn"), question: "", expected: "" });
