import { RequestsQueuePage } from "@/components/governance/requestsQueue";

export default function GovernanceRequests() {
  return (
    <RequestsQueuePage
      scope="agent"
      title="Agent Requests"
      intro="Duyệt Agent có được publish tới người dùng trong Org/Unit hay không — độc lập với việc resource Agent dùng có được duyệt dùng chung hay chưa."
    />
  );
}
