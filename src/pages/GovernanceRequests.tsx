import { RequestsQueuePage } from "@/components/governance/requestsQueue";

export default function GovernanceRequests() {
  return (
    <RequestsQueuePage
      scope="agent"
      title="Yêu cầu duyệt Nhân sự số"
      intro="Duyệt yêu cầu publish Nhân sự số tới người dùng - Space Admin thấy và duyệt mọi yêu cầu."
      note="Không phụ thuộc vào việc resource Nhân sự số dùng đã được duyệt dùng chung hay chưa - Xem trạng thái dùng chung ngay trên trang chi tiết của từng Nhân sự số."
    />
  );
}
