import { Info } from "lucide-react";
import { Card, PageHeader } from "./shared";
import { featureGroups } from "./permissionsData";

export default function Permissions() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="Quyền hạn" desc="Sử dụng cá nhân luôn miễn phí. Các quyền dưới đây chỉ kiểm soát việc publish lên workspace." />

      <div className="rounded-xl border border-info/20 bg-info/5 p-4 flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-info/15 text-info flex items-center justify-center shrink-0">
          <Info size={15} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Ai cũng có thể build và sử dụng — ở chế độ riêng tư</div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Mọi thành viên đã có thể tạo và sử dụng agent, knowledge, skill, guardrail và connector cho mục đích cá nhân — không cần quyền,
            và ai cũng có thể xem những gì đã <span className="text-foreground font-medium">đang hoạt động</span> trong workspace. Việc publish, phê duyệt,
            chỉnh sửa, hoặc xóa những thứ đó mới là điều các quyền bên dưới kiểm soát.
          </p>
        </div>
      </div>

      {featureGroups.map(group => (
        <Card key={group.id}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <group.icon size={15} />
            </div>
            <h2 className="font-display text-base font-semibold">{group.label}</h2>
          </div>

          <div className="divide-y divide-border border-t border-border">
            {group.permissions.map(p => (
              <div key={p.id} className="py-4">
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
