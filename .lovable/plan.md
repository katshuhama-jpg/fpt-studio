## Mục tiêu

Trong **màn Inventor** (`/inventor`), thể hiện rõ quan hệ cha–con: mỗi Business Process (BP) là cha, các Tools/Tasks được gán nằm bên trong nó. Hiện tại 3 section **Business processes / Tasks / Tools** ở panel cấu hình bên phải đang hiển thị **phẳng và độc lập**, không thấy cái nào thuộc BP nào.

## Thay đổi

### 1. Mở rộng kiểu `BpDraft` (data model)

```ts
type BpDraft = {
  name: string;
  description: string;
  strategy: "ReAct" | "Predefined Plan" | "Tool Execution";
  isDefault?: boolean;
  toolNames?: string[];   // mới — tên tools mà BP này gọi
  taskNames?: string[];   // mới — tên tasks mà BP này dùng
};
```

Cập nhật `careDraft` và `reportDraft` (file `src/pages/Inventor.tsx`) để gắn tool/task vào BP, ví dụ:

- `verify_customer` BP → tools: `["verify_customer"]`, tasks: `["collect_customer_info"]`
- `lock_card` BP → tools: `["verify_customer", "lock_card"]`
- `book_appointment` BP → tools: `["calendar_create_event", "send_sms"]`, tasks: `["confirm_booking"]`
- `weekly_report` BP → tools: `["Google Search", "Python code", "Google Docs"]`
- `research_brief` BP → tools: `["Google Search", "Perplexity", "Firecrawl"]`, tasks: `["collect_topic_brief", "synthesize_findings"]`
- `publish_report` BP → tools: `["Google Docs", "Google Sheets"]`

Tools/tasks không được BP nào dùng sẽ rơi vào nhóm "Unassigned" (xem mục 3).

### 2. Gộp 3 section ở `ConfigPanel` thành 1 section "Business processes" có cây con

Xoá 2 section `Tasks` và `Tools` riêng lẻ. Section "Business processes" hiển thị mỗi BP như một card cha (giữ chip strategy + Default), bên dưới có 2 nhóm con:

```text
🟦 verify_customer                   [Predefined Plan]
   Verify the customer by phone…
   ├─ 🔧 Tools (1)
   │   • verify_customer          Verify a customer by phone or ID
   └─ ✅ Tasks (1)
       • collect_customer_info    Collect phone, full name…
```

Quy ước:
- Đường kẻ trái mảnh + indent giống bên màn General để nhất quán visual.
- Tool/task con hiển thị tên + meta ngắn (description rút gọn).
- Nếu BP không có tool/task: ẩn nhóm tương ứng (giữ panel gọn) — không hiện empty state vì đây là draft preview.

### 3. Section "Unassigned" cho tool/task chưa thuộc BP nào

Sau danh sách BP, nếu còn tool/task không xuất hiện trong bất kỳ `toolNames`/`taskNames` nào, hiển thị 1 card nhỏ "Unassigned · sẽ được gắn sau khi mở agent" liệt kê chúng. Giúp user thấy đầy đủ nhưng vẫn rõ relationship.

### 4. Inventory batch cards (chat trái) — giữ nguyên

Các card "Designing business processes / Drafting tasks / Adding recommended tools" trong khung chat vẫn liệt kê phẳng theo lô — đây là log timeline AI đang làm gì, không phải view cấu hình. Không sửa.

### 5. Commit về agent (`commitDraftToAgent`)

Khi user bấm **Open agent**, hàm `commitDraftToAgent`:

- Sau khi tạo xong tasks (đã có `id` trả về), build map `name → taskId`.
- Khi tạo BP, resolve `b.taskNames` → `taskIds` thực tế.
- Với tools: hiện Inventor không tạo entry trong `toolStore`. Đề xuất:
  - Khi commit BP, ánh xạ `b.toolNames` → slug (lowercase, snake_case) làm `toolIds`. Nếu sau này màn General/Tools chưa có tool tương ứng thì BP sẽ vẫn lưu reference (UI Tools attach picker đã handle ID không tồn tại bằng cách filter). Đây là behavior chấp nhận được cho prototype.
- BP `default` (others) vẫn bỏ qua commit như cũ.

### Phạm vi file

- `src/pages/Inventor.tsx`:
  - Mở rộng type `BpDraft`.
  - Thêm `toolNames`/`taskNames` vào các BP trong `careDraft` và `reportDraft`.
  - Viết lại section "Business processes" trong `ConfigPanel`; xoá section "Tasks" và "Tools" độc lập; thêm section "Unassigned" có điều kiện.
  - Cập nhật `commitDraftToAgent` để truyền `taskIds`/`toolIds` đúng vào `businessProcessStore.create`.

### Không thay đổi

- Inventory batch cards trong chat.
- Sections Persona, Core expertise, Knowledge, Triggers, Workflow add-ons.
- Layout 2 cột trái-chat / phải-config.
