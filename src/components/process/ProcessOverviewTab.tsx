import { processCasesOf, CASE_STATUS, type CaseStatus } from "./ProcessCasesTab";

/**
 * Insights > Tổng quan của Nhân sự số Quy trình. Số liệu tính từ cùng danh sách hồ sơ mà
 * Insights > Hồ sơ hiển thị, nên hai màn luôn khớp nhau. Chưa publish thì chưa có hồ sơ thật.
 */
const BAR: Record<CaseStatus, string> = { completed: "#16a34a", waiting: "#f59e0b", running: "#203BDC", rejected: "#e11d48", cancelled: "#a1a1aa", failed: "#b91c1c" };

export default function ProcessOverviewTab({ agentId, published, onPublish, onOpenCases }: {
  agentId: string; published: boolean; onPublish?: () => void; onOpenCases: () => void;
}) {
  const cases = processCasesOf(agentId);
  if (!published && cases.length === 0) {
    return (
      <div className="max-w-[1080px] mx-auto px-8 py-8"><div className="rounded-xl border border-border bg-surface p-10 text-center">
        <div className="text-base font-semibold">Chưa có hồ sơ nào</div>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">Quy trình chưa được publish nên chưa ai mở được hồ sơ. Số liệu bắt đầu có khi người dùng gõ lệnh / trong Workspace. Lượt Chạy thử không được tính.</p>
        {onPublish && <button type="button" onClick={onPublish} className="btn-primary mt-5">Publish</button>}
      </div></div>
    );
  }
  const n = cases.length;
  const by = (s: CaseStatus) => cases.filter(c => c.status === s).length;
  const done = by("completed");
  const waiting = cases.filter(c => c.status === "waiting");
  const failed = cases.filter(c => c.status === "failed");
  const order: CaseStatus[] = ["completed", "waiting", "running", "rejected", "cancelled", "failed"];
  const kpis = [
    { label: "Hồ sơ đã mở", value: String(n), sub: "Từ khi publish" },
    { label: "Hoàn tất", value: n ? Math.round((done / n) * 100) + "%" : "-", sub: `${done}/${n} hồ sơ đóng ở Completed` },
    { label: "Đang chờ người", value: String(waiting.length), sub: "Việc đang nằm ở Action Center" },
    { label: "Dừng vì lỗi", value: String(failed.length), sub: failed.length ? "Cần chạy lại từ bước lỗi" : "Không có hồ sơ nào dừng" },
  ];
  return (
    <div className="space-y-6 max-w-[1080px] mx-auto px-8 py-8">
      <div>
        <h2 className="text-lg font-semibold">Tổng quan</h2>
        <p className="text-sm text-muted-foreground mt-1">Hồ sơ của Quy trình theo trạng thái, việc đang chờ ai và hồ sơ cần xử lý.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="mt-2 text-xl font-semibold font-display">{k.value}</div>
            <div className="mt-1.5 text-[11.5px] text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border p-5">
        <div className="text-sm font-semibold mb-3">Kết quả hồ sơ</div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-muted" aria-hidden>
          {order.map(s => by(s) > 0 && <div key={s} style={{ width: `${(by(s) / n) * 100}%`, background: BAR[s] }} />)}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-xs">
          {order.filter(s => by(s) > 0).map(s => (
            <span key={s} className="flex items-center gap-1.5"><span className={`px-1.5 py-0.5 rounded ${CASE_STATUS[s].cls}`}>{CASE_STATUS[s].label}</span><b className="font-semibold">{by(s)}</b></span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border p-5">
          <div className="text-sm font-semibold mb-3">Đang chờ người xử lý</div>
          {waiting.length === 0 ? <p className="text-sm text-muted-foreground">Không có hồ sơ nào đang chờ.</p> : (
            <ul className="space-y-2.5">
              {waiting.map(c => (
                <li key={c.code} className="text-sm"><b className="font-semibold">{c.code}</b> · {c.step}<div className="text-xs text-muted-foreground mt-0.5">Chờ {c.waitingFor} · cập nhật {c.updated}</div></li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border p-5">
          <div className="text-sm font-semibold mb-3">Dừng vì lỗi</div>
          {failed.length === 0 ? <p className="text-sm text-muted-foreground">Không có hồ sơ nào dừng vì lỗi.</p> : (
            <ul className="space-y-2.5">
              {failed.map(c => (
                <li key={c.code} className="text-sm"><b className="font-semibold">{c.code}</b> · {c.step}<div className="text-xs text-muted-foreground mt-0.5">{c.error}</div></li>
              ))}
            </ul>
          )}
          <button type="button" onClick={onOpenCases} className="mt-4 text-sm font-medium text-primary hover:underline">Xem tất cả hồ sơ</button>
        </div>
      </div>
    </div>
  );
}
