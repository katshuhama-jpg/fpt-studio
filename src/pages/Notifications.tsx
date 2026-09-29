import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { NotificationItem, useNotifications } from "@/components/notifications/notificationUi";
import { notificationStore, type AppNotification } from "@/components/notifications/notificationStore";

const DAY = 24 * 60 * 60 * 1000;

function groupOf(n: AppNotification): string {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  if (n.at >= start.getTime()) return "Hôm nay";
  if (n.at >= start.getTime() - 6 * DAY) return "7 ngày qua";
  return "Cũ hơn";
}

export default function Notifications() {
  const { viewer, all, unread } = useNotifications();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const items = tab === "all" ? all : unread;
  const groups = ["Hôm nay", "7 ngày qua", "Cũ hơn"]
    .map(g => ({ g, list: items.filter(n => groupOf(n) === g) }))
    .filter(x => x.list.length);

  return (
    <div className="p-8 w-full max-w-[1040px] space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
          <Bell size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold">Thông báo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Những thay đổi ảnh hưởng tới agent do bạn tạo hoặc được chia sẻ, và yêu cầu đang chờ bạn duyệt.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div role="tablist" className="inline-flex p-1 rounded-lg bg-surface-muted">
          {([["all", "Tất cả", all.length], ["unread", "Chưa đọc", unread.length]] as const).map(([k, label, count]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`h-8 px-3 rounded-md text-sm transition-base ${tab === k ? "bg-surface shadow-sm font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}{count > 0 && <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{count}</span>}
            </button>
          ))}
        </div>
        {unread.length > 0 && (
          <button onClick={() => notificationStore.markAllRead(viewer)} className="h-8 px-3 rounded-md border border-border text-sm font-medium hover:bg-surface-muted inline-flex items-center gap-1.5">
            <CheckCheck size={14} /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Bell size={22} className="mx-auto text-muted-foreground" />
          <p className="text-sm text-foreground mt-2">{tab === "all" ? "Chưa có thông báo nào." : "Bạn đã đọc hết thông báo."}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {tab === "all" ? "Kết quả duyệt Agent và yêu cầu cần bạn duyệt sẽ hiện ở đây." : "Thông báo mới sẽ hiện ở đây."}
          </p>
        </div>
      ) : (
        groups.map(({ g, list }) => (
          <section key={g}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{g}</h2>
            <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
              {list.map(n => <NotificationItem key={n.id} n={n} viewer={viewer} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
