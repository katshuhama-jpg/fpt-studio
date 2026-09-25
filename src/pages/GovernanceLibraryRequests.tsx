import { RequestsQueuePage } from "@/components/governance/requestsQueue";

export default function GovernanceLibraryRequests() {
  return (
    <RequestsQueuePage
      scope="resource"
      title="Resource Requests"
      intro="Duyệt Knowledge/Skill/Guardrails/Connector có được đưa vào Tenant Library để dùng chung hay không — không ảnh hưởng đến Agent đang dùng resource này."
    />
  );
}
