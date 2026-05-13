## Mục tiêu

1. Bổ sung tab **Business processes** trong màn Build Agent (`/agents/:id`) — quản lý các "nghiệp vụ" mà Agent có thể chạy theo (theo spec 2.5 Build Business process).
2. Mở rộng màn **Inventor** (AI scaffold) để khi đề xuất nháp Agent sẽ sinh ra đủ 4 nhóm tài sản: **Business processes, Tasks, Tools, Knowledge** (hiện chỉ có Tools).

Trả lời câu hỏi: Đúng — sau khi thêm BP, inventory ở Inventor sẽ gồm **Business process + Task + Tool + Knowledge** (4 mục). Đây là 4 "nguyên liệu" cấu thành 1 Agent theo cấu trúc TOVA.

---

## Phần 1 — Business processes tab (Build Agent)

Vị trí: thêm tab "Business processes" vào `AgentBuilder.tsx`, đứng đầu (trước Tasks/Tools), vì BP là lớp điều phối Task/Tool theo nghiệp vụ.

### Danh sách BP (list view)
- Lưới card giống mẫu trong ảnh user gửi (3 cột): tên BP, badge trạng thái indexing, mô tả ngắn, Last update, toggle ON/OFF, BP `others` có badge `Default`.
- Thanh search theo tên.
- Nút **+ Create** mở dialog tạo BP.
- Hover card → icon Edit / Delete (BP `others` ẩn nút Delete và không cho đổi tên).

### Tạo / Sửa BP — dialog
Trường (theo spec):
- **Name*** (≤100, đếm ký tự, unique)
- **Description*** (≤800)
- **Sample** (optional, ≤2000)
- **Goal*** (≤255)
- **Strategy*** — select: `ReAct`, `Predefined Plan`, `Tool Execution`
  - Khi chọn **Tool Execution**: chỉ cho chọn **1 Task hoặc 1 Tool** (loại trừ lẫn nhau), bắt buộc phải chọn, inline error nếu thiếu: "Please select at least one Task or Tool".
- **Instruction*** (textarea, không giới hạn)
- **Tasks** — multi-select từ danh sách Task của Agent + link "Create new task" (mở `TaskFormDialog` đã có).
- **Tools** — multi-select từ danh sách Tool đã cài + link "Create new tool" (mở dropdown Add tool đã có).
- **Constraint** (optional, ≤800)
- Nút Save & Process / Cancel.

Validate đúng spec, toast EN/VI theo bảng message.

### Seed mặc định
- Mỗi Agent tự có 1 BP `others` (không xoá, không đổi tên, có Reset default).

### Bật/Tắt
- Toggle ON/OFF mỗi BP (lưu `enabled`). BP OFF không được Agent dùng khi runtime (chỉ là cờ UI ở giai đoạn này).

### Data
Thêm `businessProcessStore.ts` tương tự `taskStore.ts`:
```ts
type Strategy = "react" | "predefined" | "tool_execution";
interface BusinessProcess {
  id; agentId; name; description; sample?; goal;
  strategy; instruction; constraint?;
  taskIds: string[]; toolIds: string[];
  enabled: boolean; isDefault?: boolean;
  indexingStatus: "completed" | "not_indexed";
  updatedAt;
}
```
Không backend — in-memory store (giống tasks/tools hiện tại).

---

## Phần 2 — Inventor: 4 nhóm tài sản

Hiện tại `Inventor.tsx` chỉ hiển thị Tools trong panel "Draft Agent". Mở rộng:

### Cấu trúc draft mới
```ts
type Draft = {
  ...
  businessProcesses: { name; description; strategy }[];
  tasks: { name; description }[];
  tools: Tool[]; // giữ nguyên
  knowledge: { name; type: "doc"|"url"|"faq"; description }[];
};
```

### UI panel phải
4 Section thay vì 1:
1. **Business processes** (icon Workflow) — luôn có ít nhất `others`.
2. **Tasks** (icon ListChecks).
3. **Tools** (icon Wrench) — như cũ.
4. **Knowledge** (icon BookOpen).

Mỗi section: count badge, list item, EmptyHint nếu trống.

### Luồng AI scaffold
Sửa flow giả lập (`scriptedFlow`) trong Inventor:
- Bước "Find suitable tools" → đổi thành "Design business processes" rồi reveal lần lượt: BP → Tasks → Tools → Knowledge (mỗi nhóm thêm 1 message `*-batch` tương tự `tool-batch` hiện có).
- Với prompt mẫu CSKH 24/7: sinh sẵn ví dụ:
  - BP: `others`, `verify_customer`, `lock_card`, `book_appointment`
  - Tasks: `collect_customer_info`, `confirm_booking`
  - Tools: `verify_customer`, `lock_card`, `calendar_create_event`
  - Knowledge: `FAQ chính sách thẻ`, `Hướng dẫn đặt lịch`

### Khi nhấn "Create Agent"
Khi commit draft sang `/agents/:id`, ghi tất cả 4 nhóm vào store tương ứng để tab Build Agent hiển thị ngay.

---

## Phần 3 — Chi tiết kỹ thuật

- File mới:
  - `src/components/business-processes/businessProcessStore.ts`
  - `src/components/business-processes/BusinessProcessesGrid.tsx`
  - `src/components/business-processes/BusinessProcessFormDialog.tsx`
  - `src/components/business-processes/BusinessProcessCard.tsx`
- File sửa:
  - `src/pages/AgentBuilder.tsx` — thêm tab "Business processes" (đặt đầu).
  - `src/pages/Inventor.tsx` — mở rộng `Draft`, thêm 3 Section, cập nhật scripted flow + commit handler.
- Knowledge store tối thiểu (in-memory) để Inventor có chỗ ghi vào — chưa làm full Knowledge tab trong Build Agent (ngoài scope, BP đã đủ lớn).

---

## Out of scope (lần này)
- Trang Knowledge đầy đủ trong Build Agent (chỉ thêm store + hiển thị ở Inventor).
- Indexing thật (giả lập trạng thái Completed/Not indexed).
- Cấu hình "Chuyển tư vấn viên" và phần ON/OFF runtime ở section 5–6 của spec — có thể làm phase sau.

---

## Câu hỏi xác nhận

1. Tab order trong Build Agent: **Business processes → Tasks → Tools → Knowledge → Settings** ổn không, hay muốn BP đặt sau Tasks?
2. Có muốn mình gộp luôn 1 tab **Knowledge** đơn giản (upload file giả lập + FAQ) trong Build Agent lần này không, hay chỉ cần ở Inventor?
