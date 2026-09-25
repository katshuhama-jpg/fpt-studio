import { RequestsQueuePage } from "@/components/governance/requestsQueue";

export default function GovernanceLibraryRequests() {
  return (
    <RequestsQueuePage
      scope="resource"
      title="Resource Requests"
      intro="Duyệt yêu cầu đưa Knowledge, Skill, Guardrails và Connector vào Tenant Library để dùng chung."
      note="Không ảnh hưởng đến các Agent đang dùng resource này — Agent vẫn tiếp tục publish và hoạt động bình thường."
    />
  );
}
