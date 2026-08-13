import { Card, PageHeader } from "./shared";
import OrgStructureExplorer from "./OrgStructureExplorer";

export default function Structure() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="Cấu trúc tổ chức" desc="Unit có thể chứa thành viên và các unit con lồng nhau, không giới hạn cấp độ. Chọn một unit để xem thành viên bên trong." />

      <Card>
        <OrgStructureExplorer />
      </Card>
    </div>
  );
}
