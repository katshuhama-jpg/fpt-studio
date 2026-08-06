import { Card, PageHeader } from "./shared";
import OrgStructureExplorer from "./OrgStructureExplorer";

export default function Structure() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="Structure" desc="Units can contain members and nested sub-units, to any depth. Pick a unit to see who's in it." />

      <Card>
        <OrgStructureExplorer />
      </Card>
    </div>
  );
}
