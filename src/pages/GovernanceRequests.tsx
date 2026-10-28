import { RequestsQueuePage } from "@/components/governance/requestsQueue";

export default function GovernanceRequests() {
  return (
    <RequestsQueuePage
      scope="agent"
      title="Yêu cầu duyệt Nhân sự số"
      intro="Yêu cầu publish Nhân sự số tới người dùng - Space Admin thấy và duyệt mọi yêu cầu. Người khác xem được yêu cầu của Nhân sự số mình sở hữu hoặc được cấp quyền."
      note="Không phụ thuộc vào việc resource Nhân sự số dùng đã được duyệt dùng chung hay chưa - Xem trạng thái dùng chung ngay trên trang chi tiết của từng Nhân sự số."
    />
  );
}
