import { RequestsQueuePage } from "@/components/governance/requestsQueue";

export default function GovernanceLibraryRequests() {
  return (
    <RequestsQueuePage
      scope="resource"
      title="Resource Requests"
      intro="Duyệt yêu cầu đưa Knowledge, Skill, Guardrails và Connector vào Thư viện Space để dùng chung."
      note="Không ảnh hưởng đến các Nhân sự số đang dùng resource này - Nhân sự số vẫn tiếp tục publish và hoạt động bình thường."
    />
  );
}
