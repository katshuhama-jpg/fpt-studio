import { RequestsQueuePage } from "@/components/governance/requestsQueue";

export default function GovernanceRequests() {
  return (
    <RequestsQueuePage
      scope="agent"
      title="Agent Requests"
      intro="Duyệt yêu cầu publish Agent tới người dùng - Space Admin thấy mọi yêu cầu, Unit Admin thấy yêu cầu tới đơn vị mình và các đơn vị cấp dưới."
      note="Không phụ thuộc vào việc resource Agent dùng đã được duyệt dùng chung hay chưa - Xem trạng thái dùng chung ngay trên trang chi tiết của từng Agent."
    />
  );
}
