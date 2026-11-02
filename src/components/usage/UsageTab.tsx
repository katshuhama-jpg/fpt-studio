import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Search, Pencil, FlaskConical, Info } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { currentPersona } from "@/lib/demoPersona";
import {
  CREDIT_PRICE, CREDIT_STEP, DEFAULT_FALLBACK, FALLBACK_MAX, fmtDate, fmtDateFull, fmtNum, usageStore, useUsage,
  type CreditScenario, type PurchaseRequest, type StorageScenario, type UsageSnapshot,
} from "@/lib/usageStore";
import { UsageBanners } from "./UsageBanner";

/* ---------------- Small parts ---------------- */

function barTone(pct: number) {
  if (pct >= 0.95) return "bg-destructive";
  if (pct >= 0.8) return "bg-warning";
  return "bg-primary";
}

function Meter({ label, value, sub, subTone, pct, emphasis }: { label: string; value: string; sub?: string; subTone?: "warning" | "danger"; pct: number | null; emphasis?: boolean }) {
  const subCls = subTone === "danger" ? "text-[hsl(var(--destructive-strong))] font-medium" : subTone === "warning" ? "text-[hsl(var(--warning-strong))] font-medium" : "text-muted-foreground";
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className={`text-sm ${emphasis ? "font-semibold" : "font-medium"}`}>{label}</span>
        <span className="text-sm tabular-nums">{value}</span>
      </div>
      {pct !== null && (
        <div className="h-2 rounded-full bg-surface-muted overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${barTone(pct)}`} style={{ width: `${Math.min(100, Math.max(pct > 0 ? 1.5 : 0, pct * 100))}%` }} />
        </div>
      )}
      {sub && <p className={`text-xs ${subCls}`}>{sub}</p>}
    </div>
  );
}

const STATUS_CHIP: Record<PurchaseRequest["status"], { cls: string; label: string }> = {
  pending: { cls: "chip chip-warning", label: "Chờ liên hệ" },
  activated: { cls: "chip chip-success", label: "Đã kích hoạt" },
  cancelled: { cls: "chip chip-muted", label: "Đã hủy" },
};

/* ---------------- Purchase dialog ---------------- */

type BuyKind = "credit" | "storage";

function PurchaseDialog({ kind, u, onClose }: { kind: BuyKind | null; u: UsageSnapshot; onClose: () => void }) {
  const persona = currentPersona();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState(persona.name);
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!kind) return;
    setAmount(kind === "credit" ? "100000" : "50"); setNote(""); setName(persona.name); setPhone(""); setTouched(false);
  }, [kind, persona.name]);

  const n = Number(amount.replace(/\D/g, ""));
  const amountErr = kind === "credit"
    ? (!amount ? "Nhập số credit muốn mua." : n < CREDIT_STEP ? "Mua tối thiểu 10.000 credit." : n % CREDIT_STEP ? "Số credit phải là bội số của 10.000." : n > 10_000_000 ? "Mỗi yêu cầu tối đa 10.000.000 credit." : null)
    : (!amount ? "Nhập số GB muốn thêm." : n < 10 ? "Thêm tối thiểu 10 GB." : n % 10 ? "Số GB phải là bội số của 10." : n > 10_000 ? "Mỗi yêu cầu tối đa 10.000 GB." : null);
  const nameErr = !name.trim() ? "Nhập tên người liên hệ." : name.trim().length > 100 ? "Tên tối đa 100 ký tự." : null;
  const phoneErr = !phone.trim() ? "Nhập số điện thoại để Sales liên hệ." : !/^0\d{9}$/.test(phone.trim()) ? "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0." : null;
  const noteErr = note.length > 500 ? "Ghi chú tối đa 500 ký tự." : null;
  const invalid = !!(amountErr || nameErr || phoneErr || noteErr);
  const contract = u.quota.viaContract;
  const who = contract ? "Account Manager" : "Sales";

  const submit = () => {
    setTouched(true);
    if (invalid || !kind) return;
    usageStore.submitRequest({ kind, amount: n, note: note.trim(), contactName: name.trim(), contactPhone: phone.trim() });
    toast.success(`Đã gửi yêu cầu. ${who} sẽ liên hệ với bạn trong 4 giờ làm việc.`);
    onClose();
  };

  const err = (m: string | null) => touched && m ? <p className="text-xs text-destructive mt-1">{m}</p> : null;

  return (
    <Dialog open={!!kind} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{kind === "credit" ? "Mua thêm credit" : "Nâng dung lượng knowledge"}</DialogTitle>
          <DialogDescription>
            {kind === "credit"
              ? `Gửi yêu cầu, ${who} sẽ liên hệ xác nhận và kích hoạt credit cho Space. Credit mua thêm dùng sau credit gói, hạn 12 tháng.`
              : `Gửi yêu cầu, ${who} sẽ liên hệ báo giá và nâng dung lượng cho Space.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <label htmlFor="buy-amount" className="text-sm font-medium mb-1.5 block">{kind === "credit" ? "Số credit" : "Dung lượng thêm (GB)"} <span className="text-destructive">*</span></label>
            <input id="buy-amount" inputMode="numeric" value={n ? fmtNum(n) : amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ""))} className="ds-input tabular-nums" />
            {err(amountErr)}
            {kind === "credit" && !amountErr && (
              <p className="text-xs text-muted-foreground mt-1">
                {contract ? "Giá theo hợp đồng của Space." : <>Tạm tính <span className="font-semibold text-foreground tabular-nums">{fmtNum(n * CREDIT_PRICE)} ₫</span> ({CREDIT_PRICE} ₫ / credit, chưa gồm VAT).</>}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="buy-name" className="text-sm font-medium mb-1.5 block">Người liên hệ <span className="text-destructive">*</span></label>
              <input id="buy-name" value={name} onChange={e => setName(e.target.value)} maxLength={120} className="ds-input" />
              {err(nameErr)}
            </div>
            <div>
              <label htmlFor="buy-phone" className="text-sm font-medium mb-1.5 block">Số điện thoại <span className="text-destructive">*</span></label>
              <input id="buy-phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))} placeholder="0912345678" className="ds-input tabular-nums" />
              {err(phoneErr)}
            </div>
          </div>
          <div>
            <label htmlFor="buy-note" className="text-sm font-medium mb-1.5 block">Ghi chú</label>
            <textarea id="buy-note" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Ví dụ: Cần kích hoạt trước thứ Hai" className="ds-textarea resize-none" />
            <div className="flex justify-between">{err(noteErr) ?? <span />}<span className="text-xs text-muted-foreground tabular-nums mt-1">{note.length}/500</span></div>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
          <button type="button" onClick={submit} disabled={touched && invalid} className="btn-primary disabled:opacity-40 disabled:pointer-events-none">Gửi yêu cầu</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Fallback message ---------------- */

function FallbackCard({ u }: { u: UsageSnapshot }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(u.fallback);
  useEffect(() => { if (!editing) setText(u.fallback); }, [u.fallback, editing]);
  const tooLong = text.length > FALLBACK_MAX;
  const save = () => {
    if (tooLong) return;
    usageStore.setFallback(text);
    setEditing(false);
    toast.success(text.trim() ? "Đã lưu câu trả lời khi hết credit." : "Đã dùng lại câu trả lời mặc định.");
  };
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 space-y-3" aria-labelledby="fallback-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="fallback-title" className="text-base font-semibold">Câu trả lời khi hết credit</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Khi Space hết credit, khách hàng nhắn tới Nhân sự số trên mọi kênh sẽ nhận câu này. Câu trả lời này không tốn credit.</p>
        </div>
        {!editing && <button type="button" onClick={() => setEditing(true)} className="btn-secondary h-8 px-3 shrink-0"><Pencil size={13} aria-hidden /> Sửa</button>}
      </div>
      {editing ? (
        <div className="space-y-2">
          <label htmlFor="fallback-text" className="sr-only">Câu trả lời khi hết credit</label>
          <textarea id="fallback-text" rows={3} value={text} onChange={e => setText(e.target.value)} placeholder={DEFAULT_FALLBACK} className="ds-textarea resize-none" autoFocus />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className={`text-xs ${tooLong ? "text-destructive" : "text-muted-foreground"}`}>
              {tooLong ? `Câu trả lời tối đa ${FALLBACK_MAX} ký tự.` : "Để trống để dùng câu mặc định."} <span className="tabular-nums">{text.length}/{FALLBACK_MAX}</span>
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditing(false); setText(u.fallback); }} className="btn-secondary h-8 px-3">Hủy</button>
              <button type="button" onClick={save} disabled={tooLong} className="btn-primary h-8 px-3 disabled:opacity-40 disabled:pointer-events-none">Lưu</button>
            </div>
          </div>
        </div>
      ) : (
        <blockquote className="rounded-xl bg-surface-muted px-4 py-3 text-sm">{u.fallback}</blockquote>
      )}
    </section>
  );
}

/* ---------------- Daily chart ---------------- */

function DailyChart({ u }: { u: UsageSnapshot }) {
  const max = Math.max(...u.daily.map(d => d.used), 1);
  const todayIdx = u.daily.findIndex(d => d.forecast) - 1;
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 space-y-3" aria-labelledby="daily-title">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 id="daily-title" className="text-base font-semibold">Credit dùng mỗi ngày</h3>
        <span className="text-xs text-muted-foreground">Trung bình 7 ngày gần nhất: <span className="tabular-nums font-medium text-foreground">{fmtNum(u.avg7)}</span> credit / ngày</span>
      </div>
      <div className="flex items-end gap-[3px] h-32" aria-hidden>
        {u.daily.map((d, i) => (
          <div key={i} className="flex-1 h-full flex items-end" title={`${fmtDate(d.date)}: ${fmtNum(d.used)} credit${d.forecast ? " (dự báo)" : ""}`}>
            {d.used > 0 && <div className={`w-full rounded-t-[3px] ${d.forecast ? "border border-dashed border-primary/50 bg-primary/5" : i === todayIdx ? "bg-primary" : "bg-primary/70"}`}
              style={{ height: `${Math.max(3, (d.used / max) * 100)}%` }} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{fmtDate(u.period.start)}</span><span>Hôm nay {fmtDate(u.period.today)}</span><span>Làm mới {fmtDate(u.period.renew)}</span>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary/70" aria-hidden />Đã dùng</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm border border-dashed border-primary/60" aria-hidden />Dự báo theo mức dùng 7 ngày gần nhất</span>
      </div>
    </section>
  );
}

/* ---------------- Members table ---------------- */

function MembersTable({ u }: { u: UsageSnapshot }) {
  const [q, setQ] = useState("");
  const [desc, setDesc] = useState(true);
  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return u.members.filter(m => !k || m.name.toLowerCase().includes(k)).sort((a, b) => desc ? b.used - a.used : a.used - b.used);
  }, [u.members, q, desc]);
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 space-y-3" aria-labelledby="members-title">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 id="members-title" className="text-base font-semibold">Credit theo member</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Gồm credit member dùng trong Console và credit của Nhân sự số do member sở hữu.</p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <label htmlFor="member-search" className="sr-only">Tìm member</label>
          <input id="member-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm member" className="ds-input pl-8" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="kb-table-header text-left py-2 pr-3">Member</th>
              <th className="kb-table-header text-right py-2 px-3" aria-sort={desc ? "descending" : "ascending"}>
                <button type="button" onClick={() => setDesc(d => !d)} className="inline-flex items-center gap-1 hover:text-foreground focus-ring rounded">
                  Credit đã dùng {desc ? <ArrowDown size={12} aria-hidden /> : <ArrowUp size={12} aria-hidden />}
                </button>
              </th>
              <th className="kb-table-header text-left py-2 px-3 w-[28%]">% của Space</th>
              <th className="kb-table-header text-right py-2 pl-3">Nhân sự số</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(m => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-primary-soft text-primary text-[11px] font-semibold flex items-center justify-center" aria-hidden>{m.initials}</span>{m.name}</span>
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(m.used)}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden"><div className="h-full bg-primary/70 rounded-full" style={{ width: `${m.share * 100}%` }} /></div><span className="tabular-nums text-xs text-muted-foreground w-8 text-right">{Math.round(m.share * 100)}%</span></div>
                </td>
                <td className="py-2.5 pl-3 text-right tabular-nums">{m.agents}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Không tìm thấy member "{q}". Thử tên khác.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------- Requests ---------------- */

function RequestsCard({ u }: { u: UsageSnapshot }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  if (!u.requests.length) return null;
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 space-y-3" aria-labelledby="req-title">
      <h3 id="req-title" className="text-base font-semibold">Yêu cầu mua thêm</h3>
      <ul className="divide-y divide-border">
        {u.requests.map(r => {
          const chip = STATUS_CHIP[r.status];
          return (
            <li key={r.id} className="py-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-medium">{r.kind === "credit" ? `${fmtNum(r.amount)} credit` : `${fmtNum(r.amount)} GB dung lượng`}</div>
                <div className="text-xs text-muted-foreground">Gửi {fmtDateFull(r.createdAt)} · Liên hệ {r.contactName}, {r.contactPhone}{r.note ? ` · ${r.note}` : ""}</div>
              </div>
              <span className={chip.cls}>{chip.label}</span>
              {r.status === "pending" && (
                <>
                  <button type="button" onClick={() => setConfirmId(r.id)} className="btn-ghost h-8">Hủy yêu cầu</button>
                  <button type="button" onClick={() => { usageStore.activateRequest(r.id); toast.success(r.kind === "credit" ? "Đã kích hoạt credit. Nhân sự số hoạt động lại bình thường." : "Đã nâng dung lượng knowledge."); }}
                    className="btn-secondary h-8 px-3 border-dashed" title="Chỉ có trong prototype: thay cho việc Sales kích hoạt">
                    <FlaskConical size={13} aria-hidden /> Demo: Sales kích hoạt
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <Dialog open={!!confirmId} onOpenChange={v => { if (!v) setConfirmId(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Hủy yêu cầu mua thêm?</DialogTitle>
            <DialogDescription>Sales sẽ không liên hệ cho yêu cầu này nữa. Bạn có thể gửi yêu cầu mới bất cứ lúc nào.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setConfirmId(null)} className="btn-secondary">Giữ yêu cầu</button>
            <button type="button" onClick={() => { if (confirmId) usageStore.cancelRequest(confirmId); setConfirmId(null); toast.success("Đã hủy yêu cầu."); }} className="btn-primary bg-destructive hover:!bg-destructive/90">Hủy yêu cầu</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ---------------- Demo controls ---------------- */

const CREDIT_OPTS: { v: CreditScenario; label: string }[] = [
  { v: "normal", label: "Bình thường (41%)" }, { v: "warn80", label: "Đã dùng 81%" }, { v: "forecast", label: "Sắp hết (87%)" },
  { v: "warn95", label: "Đã dùng 96%" }, { v: "exhausted", label: "Hết credit" },
];
const STORAGE_OPTS: { v: StorageScenario; label: string }[] = [
  { v: "normal", label: "Bình thường" }, { v: "near", label: "Gần đầy (86%)" }, { v: "full", label: "Đã đầy" },
];

function DemoControls({ u }: { u: UsageSnapshot }) {
  return (
    <section className="rounded-2xl border border-dashed border-border-strong p-4 space-y-3" aria-label="Điều khiển demo">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><FlaskConical size={13} aria-hidden /> Chỉ có trong prototype - chọn trạng thái để demo</div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm w-24">Credit</span>
        {CREDIT_OPTS.map(o => (
          <button key={o.v} type="button" onClick={() => usageStore.setScenario({ credit: o.v })} aria-pressed={u.scenario.credit === o.v}
            className={`h-8 px-3 rounded-lg text-xs font-medium border transition-base ${u.scenario.credit === o.v ? "bg-primary-soft border-primary/30 text-primary" : "border-border hover:bg-surface-muted"}`}>{o.label}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm w-24">Dung lượng</span>
        {STORAGE_OPTS.map(o => (
          <button key={o.v} type="button" onClick={() => usageStore.setScenario({ storage: o.v })} aria-pressed={u.scenario.storage === o.v}
            className={`h-8 px-3 rounded-lg text-xs font-medium border transition-base ${u.scenario.storage === o.v ? "bg-primary-soft border-primary/30 text-primary" : "border-border hover:bg-surface-muted"}`}>{o.label}</button>
        ))}
        <span className="flex-1" />
        <button type="button" onClick={() => usageStore.reset()} className="btn-ghost h-8 text-xs">Đặt lại dữ liệu demo</button>
      </div>
    </section>
  );
}

/* ---------------- Member view (FR-04) ---------------- */

function MemberView({ u }: { u: UsageSnapshot }) {
  const { userId } = useMyPermissions();
  const me = u.members.find(m => m.id === userId) ?? { used: 0, agents: 0 };
  return (
    <>
      <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h3 className="text-base font-semibold">Mức dùng của bạn</h3>
          <span className="text-xs text-muted-foreground">Kỳ {fmtDate(u.period.start)} - {fmtDate(u.period.end)}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-muted px-4 py-3"><div className="text-xs text-muted-foreground">Credit bạn đã dùng</div><div className="text-xl font-semibold tabular-nums">{fmtNum(me.used)}</div></div>
          <div className="rounded-xl bg-surface-muted px-4 py-3"><div className="text-xs text-muted-foreground">Nhân sự số bạn sở hữu</div><div className="text-xl font-semibold tabular-nums">{me.agents}</div></div>
        </div>
        <Meter label="Dung lượng knowledge của Space" value={`${fmtNum(u.storage.usedGB)} / ${fmtNum(u.storage.totalGB)} GB`} pct={u.storage.pct} />
        <p className="text-xs text-muted-foreground flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5" aria-hidden />Admin của Space quản lý credit và mua thêm khi cần.</p>
      </section>
    </>
  );
}

/* ---------------- Tab ---------------- */

export default function UsageTab() {
  const u = useUsage();
  const { can } = useMyPermissions();
  const isAdmin = can("requests.review-agents");
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [buy, setBuy] = useState<BuyKind | null>(null);

  useEffect(() => {
    const b = params.get("buy");
    if (b !== "credit" && b !== "storage") return;
    if (isAdmin && (b === "storage" ? !u.pendingStorage : !u.pendingCredit && u.quota.canBuy)) setBuy(b);
    params.delete("buy"); setParams(params, { replace: true });
  }, [params, setParams, isAdmin, u.pendingCredit, u.pendingStorage, u.quota.canBuy]);

  const forecastSub = u.exhausted
    ? { text: "Đã hết credit. Nhân sự số đang tạm dừng.", tone: "danger" as const }
    : u.planRemaining <= 0
      ? { text: "Đã hết credit gói. Space đang dùng credit mua thêm.", tone: undefined }
      : u.forecastDate && u.forecastDate < u.period.renew
        ? { text: `Dự kiến hết vào ${fmtDate(u.forecastDate)}, trước ngày làm mới ${fmtDate(u.period.renew)}.`, tone: (u.pct >= 0.95 ? "danger" : "warning") as "danger" | "warning" }
        : { text: `Đủ dùng tới hết kỳ. Làm mới vào ${fmtDate(u.period.renew)}.`, tone: undefined };

  const topUpValue = !u.quota.canBuy ? "Không áp dụng" : u.lotsRemaining ? `Còn ${fmtNum(u.lotsRemaining)}` : "0";
  const topUpSub = !u.quota.canBuy ? "Gói Free chưa mua thêm credit được."
    : u.nearestLotExpiry ? `Lô gần hết hạn nhất: ${fmtDateFull(u.nearestLotExpiry)}. Dùng sau khi hết credit gói.`
    : u.quota.viaContract ? "Mua thêm theo hợp đồng, dùng sau khi hết credit gói." : `Dùng sau khi hết credit gói, hạn 12 tháng. Giá ${CREDIT_PRICE} ₫ / credit.`;

  return (
    <div className="px-6 sm:px-8 pt-8 pb-12 w-full max-w-[880px] mx-auto space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight">Hạn mức sử dụng</h2>
        <p className="text-sm text-muted-foreground mt-1">{u.tenant.name} · Kỳ {fmtDate(u.period.start)} - {fmtDate(u.period.end)}</p>
      </div>

      <UsageBanners showStorage inline />

      {!isAdmin ? <MemberView u={u} /> : (
        <>
          <section className="rounded-2xl border border-border bg-surface p-5 space-y-5" aria-labelledby="plan-title">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 id="plan-title" className="text-base font-semibold flex items-center gap-2">Gói {u.plan}</h3>
              <button type="button" onClick={() => navigate("/plans?tab=plans")} className="text-sm font-medium text-primary hover:underline focus-ring rounded">Xem các gói</button>
            </div>
            <Meter emphasis label="Credit gói cho cả Space" value={`${fmtNum(u.planUsed)} / ${fmtNum(u.quota.credit)}`} pct={u.pct} sub={forecastSub.text} subTone={forecastSub.tone} />
            <Meter label="Credit mua thêm" value={topUpValue} pct={null} sub={topUpSub} />
            <Meter label="Dung lượng knowledge" value={`${fmtNum(u.storage.usedGB)} / ${fmtNum(u.storage.totalGB)} GB`} pct={u.storage.pct}
              sub={u.storage.full ? "Đã đầy. Chưa tải thêm tài liệu được." : u.storage.note} subTone={u.storage.full ? "danger" : u.storage.near ? "warning" : undefined} />
            <Meter label="Người dùng" value={u.quota.usersIncluded ? `${fmtNum(u.quota.usersActive)} / ${fmtNum(u.quota.usersIncluded)}` : `${fmtNum(u.quota.usersActive)} người dùng`}
              pct={u.quota.usersIncluded ? u.quota.usersActive / u.quota.usersIncluded : null} sub={u.quota.usersIncluded ? undefined : "Theo hợp đồng"} />

            <div className="border-t border-border pt-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground">Credit khả dụng</div>
                <div className="text-xl font-semibold tabular-nums">{fmtNum(u.available)}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {u.storage.near && (u.pendingStorage
                  ? <span className="chip chip-warning">Đã gửi yêu cầu nâng dung lượng</span>
                  : <button type="button" onClick={() => setBuy("storage")} className="btn-secondary">Nâng dung lượng</button>)}
                {!u.quota.canBuy
                  ? <button type="button" onClick={() => navigate("/plans?tab=plans")} className="btn-primary">Xem các gói</button>
                  : u.pendingCredit
                    ? <span className="chip chip-warning">Đã gửi yêu cầu mua {fmtNum(u.pendingCredit.amount)} credit · Chờ liên hệ</span>
                    : <button type="button" onClick={() => setBuy("credit")} className="btn-primary">Mua thêm credit</button>}
              </div>
            </div>
          </section>

          <RequestsCard u={u} />
          <DailyChart u={u} />
          <MembersTable u={u} />
          <FallbackCard u={u} />
        </>
      )}

      <DemoControls u={u} />
      <PurchaseDialog kind={buy} u={u} onClose={() => setBuy(null)} />
    </div>
  );
}
