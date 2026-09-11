// Single source of truth for which document formats Knowledge upload accepts — shared by
// UploadDocumentsModal (the drop zone chips/accept attr/validation) and KnowledgeDocumentsTab
// (the toolbar helper line and empty state), so the two surfaces can't drift out of sync the way
// the toolbar line and the modal previously did (the toolbar line was a separate hardcoded
// string that never got HTML/JSON added when the modal did).
export const ALLOWED_EXT = ["txt", "md", "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "html", "json"];
export const MAX_FILES = 10;
export const MAX_SIZE = 30 * 1024 * 1024;
export const FORMAT_HELPER_TEXT = `Hỗ trợ ${ALLOWED_EXT.map(ext => ext.toUpperCase()).join(", ")} · Tối đa ${MAX_FILES} tệp mỗi lần · ${MAX_SIZE / (1024 * 1024)}MB mỗi tệp`;

/** One-line processing note per format, shown in the upload modal's "(i)" format-details
 * popover table. */
export const FORMAT_NOTES: Record<string, string> = {
  txt: "Văn bản thuần, giữ nguyên toàn bộ nội dung.",
  md: "Markdown — tiêu đề và danh sách được giữ cấu trúc khi xử lý.",
  pdf: "Trích xuất văn bản trực tiếp; PDF dạng ảnh scan cần OCR nên có thể kém chính xác hơn.",
  doc: "Tự động chuyển sang PDF trước khi xử lý để trích xuất nội dung chính xác hơn.",
  docx: "Tự động chuyển sang PDF trước khi xử lý để trích xuất nội dung chính xác hơn.",
  ppt: "Tự động chuyển sang PDF trước khi xử lý, mỗi slide thành một phần nội dung.",
  pptx: "Tự động chuyển sang PDF trước khi xử lý, mỗi slide thành một phần nội dung.",
  xls: "Tự động chuyển sang PDF trước khi xử lý; mỗi bảng tính thành một phần nội dung.",
  xlsx: "Tự động chuyển sang PDF trước khi xử lý; mỗi bảng tính thành một phần nội dung.",
  csv: "Mỗi hàng dữ liệu được xử lý thành một phần nội dung riêng.",
  html: "Xử lý trực tiếp dưới dạng văn bản có cấu trúc — bảng và tiêu đề được giữ nguyên.",
  json: "Xử lý dưới dạng dữ liệu có cấu trúc — các cặp khóa/giá trị được làm phẳng thành văn bản dễ đọc theo từng chunk.",
};
