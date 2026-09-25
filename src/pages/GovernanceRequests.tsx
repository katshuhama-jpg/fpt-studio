import { RequestsQueuePage } from "@/components/governance/requestsQueue";

export default function GovernanceRequests() {
  return (
    <RequestsQueuePage
      scope="agent"
      title="Agent Requests"
      intro="Duyệt yêu cầu publish Agent tới người dùng trong Org/Unit của bạn."
      note="Không phụ thuộc vào việc resource Agent dùng đã được duyệt dùng chung hay chưa — xem trạng thái dùng chung ngay trên trang chi tiết của từng Agent."
    />
  );
}
