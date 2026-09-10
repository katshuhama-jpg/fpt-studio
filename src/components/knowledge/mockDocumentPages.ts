// Shared "rendered page" text for every document/URL/agent-item previewed in ChunkViewerModal —
// this prototype has no real file storage or PDF rendering pipeline, so every source reuses the
// same small set of representative pages. Both DocumentPreviewPane (renders them) and
// knowledgeChunkStore (derives chunk content from a region of a page, for seeding and resize)
// need this list, so it lives in its own module rather than one importing the other.
export const MOCK_PAGES: string[] = [
  "Chính sách này áp dụng cho toàn bộ khiếu nại liên quan đến sản phẩm, dịch vụ của ngân hàng ABC. Mọi khách hàng đều có quyền gửi khiếu nại qua các kênh chính thức của ngân hàng.",
  "Khiếu nại được tiếp nhận trong vòng 24 giờ qua tổng đài, ứng dụng hoặc tại quầy giao dịch. Nhân viên tiếp nhận có trách nhiệm ghi nhận đầy đủ thông tin và mã số theo dõi.",
  "Ngân hàng cam kết phản hồi kết quả xử lý khiếu nại trong tối đa 15 ngày làm việc. Trường hợp phức tạp có thể kéo dài nhưng không quá 30 ngày, khách hàng sẽ được thông báo.",
  "Khách hàng không đồng ý với kết quả xử lý có quyền khiếu nại lần hai lên bộ phận giám sát chất lượng, hoặc phản ánh tới Ngân hàng Nhà nước theo quy định hiện hành.",
];
