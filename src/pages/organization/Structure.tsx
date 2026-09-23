import { Card, PageHeader } from "./shared";
import OrgStructureExplorer from "./OrgStructureExplorer";

export default function Structure() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="Structure" desc="Một đơn vị có thể chứa thành viên và các đơn vị con lồng nhau, không giới hạn số cấp. Chọn một đơn vị để xem những ai đang ở trong đó." />

      <Card>
        <OrgStructureExplorer />
      </Card>
    </div>
  );
}
