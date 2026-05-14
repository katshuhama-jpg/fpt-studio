## Mục tiêu

Trong tab **General**, làm rõ rằng Tools và Tasks luôn được **gọi từ Business Process (BP)**. BP là cha, Tools/Tasks là con. Mỗi BP có thể:
- Hiển thị danh sách tool/task con đang được gắn
- Gắn thêm tool/task mới vào BP
- Mở thẳng màn detail của tool/task để chỉnh sửa

## Thay đổi UI

### 1. Gộp 3 accordion (Business processes / Tools / Tasks) thành 1 section duy nhất

Thay block đang có ở `GeneralTab` (3 accordion riêng biệt cho BP, Tools, Tasks) bằng **1 accordion "Business processes"** mở rộng — bên trong là danh sách BP, mỗi BP là 1 thẻ con có thể bung ra.

Các accordion khác (Knowledge, Triggers, Guardrails, Chat optimization) **giữ nguyên**.

### 2. Layout mỗi BP card (cha)

```text
┌─────────────────────────────────────────────────────────┐
│ ▸ [icon] lock_card                       [default] [●on]│
│         Khoá thẻ ngay khi khách báo mất…   2 tools · 1 task │
└─────────────────────────────────────────────────────────┘
```

Bấm `▸` để bung ra phần con:

```text
  │  ├─ 🔧 Tools  (2)                        [+ Attach tool]
  │  │   • verify_customer    REST    →  (mở detail)
  │  │   • lock_card          REST    →
  │  ├─ ✅ Tasks  (1)                        [+ Attach task]
  │  │   • Lock credit card   Workflow · v3 →
  │  └─ [Manage business process →]   (vào màn BP detail)
```

Quy ước hiển thị:
- Đường kẻ trái + indent nhẹ để thể hiện quan hệ cha–con.
- Mỗi item con có nút mũi tên/`ArrowRight` → bấm điều hướng tới `/agents/:id/tools/:toolId` hoặc `/agents/:id/tasks/:taskId`.
- Nếu BP không có tool/task nào: hiển thị empty state nhẹ "No tools attached" + nút "+ Attach".
- BP `default` (others) có badge `default`; vẫn hỗ trợ attach tool/task.

### 3. Hành vi "Attach tool / Attach task"

Bấm `+ Attach tool` (hoặc task) trên 1 BP mở **Popover/Dropdown** chứa:
- Ô search
- Danh sách tools (hoặc tasks) hiện có của agent, có checkbox cho phép multi-select
- Đã attach thì hiện checked + label "Attached"
- Nút "Create new tool/task" ở cuối → điều hướng sang màn tạo mới (`/agents/:id/tools/new` hoặc mở dialog tạo task) — sau khi tạo xong quay lại General với tool/task mới được attach.

Khi tick/bỏ tick → cập nhật `taskIds` / `toolIds` của BP qua `businessProcessStore` (cần thêm method `update(agentId, id, patch)` nếu chưa có; nếu đã có giữ nguyên).

### 4. Header của accordion BP

Thay vì chỉ "Business processes · count", thêm summary nhỏ:
- `N processes · M tools linked · K tasks linked`
- Nút `Manage` giữ nguyên → vào màn BP grid.

### 5. Loại bỏ 2 accordion riêng

Xoá `ConfigAccordion` "Tools" và "Tasks" khỏi `GeneralTab` (hiện ở dòng ~429 và ~447). Lý do: Tools/Tasks đã được thể hiện qua quan hệ con của BP. Người dùng muốn xem toàn bộ tools/tasks vẫn có thể vào tab Tools / Tasks ở left nav.

## Phạm vi file

- `src/pages/AgentBuilder.tsx` — phần `GeneralTab` (lines ~385-514) + atoms `ConfigAccordion` / `SummaryRow` (giữ, dùng lại).
- `src/components/business-processes/businessProcessStore.ts` — bổ sung `update()` nếu chưa có để patch `taskIds` / `toolIds`.
- Component mới (cùng file hoặc tách):
  - `BpParentCard` — render 1 BP cha + children.
  - `AttachPicker` — popover chọn tool/task để attach.

## Nguồn dữ liệu

- BPs: `businessProcessStore.list(agentId)`
- Tasks: `taskStore.list(agentId)` — lookup theo `taskIds`
- Tools: hiện `AgentToolsTab` đang dùng data nội bộ; cần lấy danh sách tools của agent. Đề xuất: tạo helper `agentToolStore.list(agentId)` đọc từ cùng nguồn `AgentToolsTab` đang dùng (sẽ kiểm tra/refactor nhẹ khi implement). Nếu chưa có store dùng chung thì dùng tạm danh sách mock đã có trong file.

## Không thay đổi

- Tab Tools / Tasks ở left nav giữ nguyên.
- Accordion Knowledge / Triggers / Guardrails / Chat optimization giữ nguyên.
- Routing detail tool/task không đổi.
