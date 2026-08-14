import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowLeftRight, Copy, UserX, X, CheckCircle2, Clock } from "lucide-react";
import { Card, PageHeader } from "./shared";
import { findUnit, findMember, findPath } from "./orgData";
import { useOrg } from "./orgStore";
import { Conflict, useConflicts } from "./conflictsStore";

const TYPE_META: Record<Conflict["type"], { label: string; icon: any }> = {
  member_unit_mismatch: { label: "Thành viên lệch unit", icon: ArrowLeftRight },
  duplicate_unit_name: { label: "Trùng tên unit", icon: Copy },
  member_removed_source: { label: "Thành viên đã rời hệ thống nguồn", icon: UserX },
};

function unitPathLabel(tree: ReturnType<typeof useOrg>["tree"], unitId: string): string {
  const path = findPath(tree, unitId);
  if (!path) return unitId;
  return path.map(u => u.name).join(" › ");
}

/* ─── Two-column "Auto Sync vs Agent Studio" comparison block ──────────── */
function CompareRow({ leftLabel, leftValue, rightLabel, rightValue }: { leftLabel: string; leftValue: string; rightLabel: string; rightValue: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg border border-border bg-surface-muted/60 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{leftLabel}</div>
        <div className="text-sm font-medium">{leftValue}</div>
      </div>
      <div className="rounded-lg border border-primary/30 bg-primary-soft/40 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1">{rightLabel}</div>
        <div className="text-sm font-medium">{rightValue}</div>
      </div>
    </div>
  );
}

/* ─── Resolve modal — content and the two resolution actions vary by conflict type ─── */
function ResolveModal({ conflict, onClose }: { conflict: Conflict; onClose: () => void }) {
  const { tree, moveMember, createUnit, setMemberInactive } = useOrg();
  const { resolveConflict } = useConflicts();
  const meta = TYPE_META[conflict.type];

  const apply = (resolution: string, sideEffect?: () => void) => {
    sideEffect?.();
    resolveConflict(conflict.id, resolution);
    onClose();
  };

  let body: React.ReactNode = null;
  let actions: React.ReactNode = null;

  if (conflict.type === "member_unit_mismatch") {
    const member = findMember(tree, conflict.memberId);
    const currentUnit = findUnit(tree, conflict.currentUnitId);
    const syncedUnit = findUnit(tree, conflict.syncedUnitId);
    body = (
      <>
        <p className="text-sm text-muted-foreground mb-4">
          Thành viên <span className="font-semibold text-foreground">{member?.name ?? conflict.memberId}</span> đang ở khác unit giữa dữ liệu thủ công và dữ liệu Auto Sync.
        </p>
        <CompareRow
          leftLabel="Hiện tại trong Agent Studio"
          leftValue={currentUnit ? unitPathLabel(tree, currentUnit.id) : "—"}
          rightLabel="Từ Auto Sync (FPT Identity)"
          rightValue={syncedUnit ? unitPathLabel(tree, syncedUnit.id) : "—"}
        />
      </>
    );
    actions = (
      <>
        <button
          type="button"
          onClick={() =>
            apply(`Đã chuyển ${member?.name ?? conflict.memberId} sang "${syncedUnit?.name ?? conflict.syncedUnitId}" theo Auto Sync.`, () =>
              moveMember(conflict.memberId, conflict.syncedUnitId)
            )
          }
          className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base"
        >
          Áp dụng theo Auto Sync
        </button>
        <button
          type="button"
          onClick={() =>
            apply(`Giữ ${member?.name ?? conflict.memberId} tại "${currentUnit?.name ?? conflict.currentUnitId}" theo quyết định thủ công — bỏ qua đề xuất Auto Sync lần này.`)
          }
          className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base"
        >
          Giữ theo thủ công
        </button>
      </>
    );
  } else if (conflict.type === "duplicate_unit_name") {
    const existingUnit = findUnit(tree, conflict.existingUnitId);
    const incomingParent = findUnit(tree, conflict.incomingParentUnitId);
    body = (
      <>
        <p className="text-sm text-muted-foreground mb-4">
          Auto Sync đề xuất một unit tên <span className="font-semibold text-foreground">"{conflict.incomingUnitName}"</span> — trùng tên với một unit đã có sẵn trong Agent Studio, nhưng ở nhánh tổ chức khác.
        </p>
        <CompareRow
          leftLabel="Đã có trong Agent Studio"
          leftValue={existingUnit ? unitPathLabel(tree, existingUnit.id) : "—"}
          rightLabel="Đề xuất từ Auto Sync"
          rightValue={incomingParent ? `${unitPathLabel(tree, incomingParent.id)} › ${conflict.incomingUnitName}` : conflict.incomingUnitName}
        />
      </>
    );
    actions = (
      <>
        <button
          type="button"
          onClick={() =>
            apply(
              `Đã tạo "${conflict.incomingUnitName}" như một unit riêng biệt dưới "${incomingParent?.name ?? conflict.incomingParentUnitId}" — không gộp với "${existingUnit?.name ?? conflict.existingUnitId}".`,
              () => createUnit(conflict.incomingParentUnitId, conflict.incomingUnitName)
            )
          }
          className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base"
        >
          Tạo unit riêng biệt
        </button>
        <button
          type="button"
          onClick={() =>
            apply(
              `Coi "${conflict.incomingUnitName}" (Auto Sync) và "${existingUnit?.name ?? conflict.existingUnitId}" là cùng một unit — không tạo unit mới; thành viên tương lai từ Auto Sync cho unit này sẽ được đưa vào "${existingUnit?.name ?? conflict.existingUnitId}".`
            )
          }
          className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base"
        >
          Đây là cùng một unit — không tạo mới
        </button>
      </>
    );
  } else {
    const member = findMember(tree, conflict.memberId);
    const currentUnit = member ? findPath(tree, conflict.memberId) : null; // not directly usable; kept simple below
    body = (
      <>
        <p className="text-sm text-muted-foreground mb-4">
          Auto Sync không còn thấy thành viên <span className="font-semibold text-foreground">{member?.name ?? conflict.memberId}</span> trong hệ thống nguồn (FPT Identity), nhưng người này vẫn đang <span className="font-semibold text-foreground">Active</span> trong Agent Studio.
        </p>
        <div className="rounded-lg border border-destructive/30 bg-destructive-soft/40 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-destructive mb-1">Trạng thái hiện tại</div>
          <div className="text-sm font-medium">Active — vẫn còn vai trò và quyền truy cập trong workspace</div>
        </div>
      </>
    );
    actions = (
      <>
        <button
          type="button"
          onClick={() =>
            apply(`Đã đánh dấu ${member?.name ?? conflict.memberId} là Inactive theo Auto Sync — vai trò/quyền được giữ lại để đối chiếu, không xóa dữ liệu.`, () =>
              setMemberInactive(conflict.memberId, true)
            )
          }
          className="h-9 px-4 rounded-xl bg-destructive text-white text-sm font-medium hover:opacity-90 transition-base"
        >
          Đánh dấu Inactive
        </button>
        <button
          type="button"
          onClick={() =>
            apply(`Giữ ${member?.name ?? conflict.memberId} ở trạng thái Active — có thể do lỗi đồng bộ tạm thời từ FPT Identity, sẽ theo dõi lần sync kế tiếp.`)
          }
          className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base"
        >
          Giữ Active (bỏ qua)
        </button>
      </>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] sm:w-1/2 min-w-[50vw] max-w-[720px] bg-white rounded-2xl flex flex-col shadow-2xl max-h-[85vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <meta.icon size={16} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Xử lý xung đột — {meta.label}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{conflict.reason}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{body}</div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">{actions}</div>
      </div>
      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function Conflicts() {
  const { tree } = useOrg();
  const { conflicts } = useConflicts();
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const resolving = conflicts.find(c => c.id === resolvingId) ?? null;
  const openCount = conflicts.filter(c => c.status === "open").length;
  const resolvedCount = conflicts.filter(c => c.status === "resolved").length;
  const shown = conflicts.filter(c => (filter === "all" ? true : c.status === filter));

  const summaryFor = (c: Conflict): string => {
    if (c.type === "member_unit_mismatch") {
      const member = findMember(tree, c.memberId);
      const synced = findUnit(tree, c.syncedUnitId);
      return `${member?.name ?? c.memberId} → đề xuất chuyển sang "${synced?.name ?? c.syncedUnitId}"`;
    }
    if (c.type === "duplicate_unit_name") {
      const existing = findUnit(tree, c.existingUnitId);
      return `"${c.incomingUnitName}" (Auto Sync) trùng tên với "${existing?.name ?? c.existingUnitId}"`;
    }
    const member = findMember(tree, c.memberId);
    return `${member?.name ?? c.memberId} không còn trong hệ thống nguồn`;
  };

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      {resolving && <ResolveModal conflict={resolving} onClose={() => setResolvingId(null)} />}

      <PageHeader
        title="Xung đột đồng bộ"
        desc="Các trường hợp dữ liệu từ Auto Sync (FPT Identity) khác với dữ liệu đang quản lý thủ công trong Agent Studio — xem xét và chọn cách xử lý cho từng trường hợp."
      />

      <Card>
        <div className="flex items-center gap-2 mb-4">
          {[
            { key: "open" as const, label: "Chưa xử lý", count: openCount },
            { key: "resolved" as const, label: "Đã xử lý", count: resolvedCount },
            { key: "all" as const, label: "Tất cả", count: conflicts.length },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`h-8 px-3 rounded-lg text-xs font-medium border transition-base ${
                filter === tab.key ? "bg-primary-soft text-primary border-primary/30" : "border-border text-muted-foreground hover:bg-surface-muted"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-10 text-center">
            {filter === "open" ? "Không có xung đột nào đang chờ xử lý." : "Chưa có dữ liệu."}
          </div>
        ) : (
          <div className="divide-y divide-border -mx-1">
            {shown.map(c => {
              const meta = TYPE_META[c.type];
              return (
                <div key={c.id} className="flex items-start justify-between gap-4 px-1 py-3.5">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        c.status === "open" ? "bg-destructive-soft text-destructive" : "bg-surface-muted text-muted-foreground"
                      }`}
                    >
                      {c.status === "open" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold">{meta.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-muted-foreground font-medium">
                          {c.detectedAt}
                        </span>
                      </div>
                      <div className="text-sm text-foreground mt-0.5">{summaryFor(c)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{c.status === "resolved" ? c.resolution : c.reason}</div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {c.status === "open" ? (
                      <button
                        type="button"
                        onClick={() => setResolvingId(c.id)}
                        className="h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-base"
                      >
                        Xử lý
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={12} /> Đã xử lý
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
