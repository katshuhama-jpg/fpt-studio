import { Card, PageHeader } from "./shared";
import OrgStructureExplorer from "./OrgStructureExplorer";

export default function Structure() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="Structure" desc="A unit can contain members and other units nested inside it, with no depth limit. Select a unit to see who's inside." />

      <Card>
        <OrgStructureExplorer />
      </Card>
    </div>
  );
}
