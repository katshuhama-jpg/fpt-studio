import { RefreshCw } from "lucide-react";
import { Card, PageHeader } from "./shared";
import OrgStructureExplorer from "./OrgStructureExplorer";
import { ORG_LAST_SYNCED_AT } from "./orgData";

export default function Structure() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Cấu trúc tổ chức" desc="Unit có thể chứa thành viên và các unit con lồng nhau, không giới hạn cấp độ. Chọn một unit để xem thành viên bên trong." />
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 mt-1">
          <RefreshCw size={12} />
          Đồng bộ lần cuối từ hệ thống doanh nghiệp: {ORG_LAST_SYNCED_AT}
        </div>
      </div>

      <Card>
        <OrgStructureExplorer />
      </Card>
    </div>
  );
}
