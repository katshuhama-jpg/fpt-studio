## Mục tiêu

Triển khai đầy đủ feature **Task** trong Agent Builder theo PRD 2.6 v34 và screen flow đã đính kèm. Bao quát 5 Use Case: tạo, xem, sửa, publish workflow, xem danh sách, sửa thông tin task.

## Hiện trạng

- `AgentBuilder.tsx` đã có tab **Tasks** (`section=task`) nhưng đang render bảng table (`TasksList`) — không đúng spec card layout.
- `TaskEditor.tsx` đã có canvas workflow + breadcrumb + Save/Publish nhưng:
  - Mở mặc định ra **Template Picker** (3 starting points) — PRD yêu cầu 2-node mặc định (Start, End).
  - Thiếu popup Create, Edit info, checklist warning panel, history/rollback, commit message dialog, validation.
- Chưa có route `/agents/:id/tasks/new` (PRD yêu cầu modal — không cần route riêng).
- Chưa có 2 system task mặc định: **Knowledge Retrieval** & **Generate Knowledge Response**.

## Phạm vi

| UC | Màn / Component | Trạng thái |
|---|---|---|
| UC-04 | Task List (card grid + empty + search) | Mới |
| UC-01 | Create Task modal | Mới |
| UC-05 | Edit Task Info modal | Mới |
| UC-02 | Workflow viewer (read mode + node detail panel) | Sửa |
| UC-03 | Workflow editor (publish + checklist + history + commit) | Sửa |
| Default | 2 system task readonly + reset | Mới (mock data) |

## Thiết kế UI

### 1. Task List — card grid (UC-04)

Thay bảng `TasksList` trong `AgentBuilder.tsx` (dòng 455–495) bằng card layout:

```text
┌─────────────────────────────────────────────────────────┐
│ Tasks                              [Search] [+ Create]  │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ 🔒 Lock  │ │ 📚 Know. │ │ 💬 Gen.  │ │ 📅 Sched.│   │
│ │ credit…  │ │ Retrieval│ │ Response │ │ consult. │   │
│ │ Verify…  │ │ [System] │ │ [System] │ │ Book a…  │   │
│ │ 2m ago   │ │ —        │ │ —        │ │ 3d ago   │   │
│ │     ⓘ ✏️🗑│ │     ⓘ    │ │    ⓘ     │ │    ⓘ ✏️🗑 │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
```

- Mỗi card: name, purpose (2 dòng truncate), last update, badge `[System]` nếu là task default.
- Hover → hiện 2 icon Edit / Delete (system task ẩn Delete, chỉ có "Reset to default").
- Click body card → vào workflow editor (`/agents/:id/tasks/:taskId`).
- Empty state: minh họa + CTA **Create**.
- Search: filter theo name/purpose, debounce 200ms.

### 2. Create Task modal (UC-01)

Mở từ nút **+ Create** ở Task List. Dialog 480px gồm:
- **Name** (required, max 50, placeholder *"A clear and memorable name…"*) — validate trùng với toàn bộ tasks.
- **Purpose** (required, max 255, textarea 3 rows, placeholder *"Expected outcome of executing this task"*).
- Counter ký tự, inline error đỏ theo Messages bảng (mục 4 PRD).
- **Cancel** / **Create** (primary, disabled nếu invalid).
- Submit → tạo task → toast green *"Task created successfully"* → navigate vào workflow editor với 2 node default (Start, End), trạng thái Published.

### 3. Edit Task Info modal (UC-05)

Reuse cùng component với Create (mode `edit`). Mở từ icon ✏️ trên card. Khác:
- Title "Edit task".
- Button primary **Save** thay cho **Create**.
- Toast *"Task updated successfully"* sau khi lưu.

### 4. Workflow editor (UC-02 + UC-03)

Sửa `TaskEditor.tsx`:

#### Khởi tạo
- Bỏ `TemplatePicker`. Khi mở task → hiển thị canvas với 2 node mặc định **Start** → **End** (cho task mới) hoặc nodes đã lưu.

#### Top bar mới
```text
[← Back] Banking ABC / Tasks / Lock credit card · Published 2h ago
                              [Checklist ⚠ 2] [v3 History] [Test] [Save] [Publish]
```
- **Trạng thái publish**: chip cạnh tên — `Unpublished` (vàng) khi có sửa chưa publish, `Published Xh ago` (xanh) khi đã đồng bộ.
- **Checklist** button: badge đếm số issue. Mở panel phải:
  - Liệt kê issue per node (vd. *"Node 'verify_customer' missing URL"*).
  - Click 1 issue → focus & highlight node trên canvas.
  - Realtime update khi user sửa.
- **Publish** button: disabled khi checklist > 0. Click → mở dialog **Commit message** (textarea required) → submit → trạng thái chuyển sang Published, toast success.
- **History** dropdown: list version (commit msg, time, Active/Inactive). Mỗi item có **Restore** (rollback) — confirm dialog trước khi áp.

#### View mode (UC-02)
- Khi user là Bot Tester → toolbar ẩn Save/Publish, canvas readonly.
- Click 1 node → mở **Node Detail Panel** ở góc dưới-phải (popup nhỏ 320×auto): name, description, key configs (read-only). Có nút "Open in inspector" (đưa qua edit mode nếu có quyền).

#### Add node (UC-03)
4 cách theo PRD:
1. Nút `+` trên toolbar (đã có trong NodeLibrary).
2. Node "trống đầu ra" → icon `+` ở handle phải.
3. Click vào edge giữa 2 node → mini popup `+ Add block`.
4. Chuột phải canvas → context menu **Add block**.

(Triển khai #1 & #2 ở phase này; #3, #4 mock UI nhưng skeleton sẵn.)

#### Zoom
- Min 25% — Max 200%, Ctrl+scroll, nút +/- ở góc dưới phải canvas (reactflow built-in Controls).

### 5. System default tasks

Mock 2 task `Knowledge Retrieval` & `Generate Knowledge Response` trong list của mỗi agent:
- Badge `[System]`.
- Workflow readonly (xem được, sửa được nodes nhưng không xóa/đổi tên task).
- Menu kebab có **Reset to default** → dialog confirm → restore nodes mặc định.

## Phạm vi file

| File | Thay đổi |
|---|---|
| `src/pages/AgentBuilder.tsx` | Thay `TasksList` (455–495) bằng `<TasksGrid agentId={id} />` import từ component mới. |
| `src/components/tasks/TasksGrid.tsx` | **Mới** — card grid + search + empty + Create CTA. |
| `src/components/tasks/TaskFormDialog.tsx` | **Mới** — modal Create/Edit dùng chung (mode prop). |
| `src/components/tasks/taskStore.ts` | **Mới** — in-memory store (mock) cho tasks per-agent: list, create, update, delete, isDuplicateName. |
| `src/pages/TaskEditor.tsx` | Bỏ TemplatePicker; default 2-node Start/End; thêm checklist panel, publish dialog, history dropdown, view-mode toggle, status chip. |
| `src/components/tasks/ChecklistPanel.tsx` | **Mới** — sidebar phải, list warnings + click-to-focus. |
| `src/components/tasks/PublishDialog.tsx` | **Mới** — commit message + confirm. |
| `src/components/tasks/HistoryDropdown.tsx` | **Mới** — version list + restore. |
| `src/components/tasks/NodeDetailPanel.tsx` | **Mới** — popup readonly góc dưới phải. |

Không thay đổi:
- Routing (`App.tsx`) — đã có `/agents/:id/tasks/:taskId`.
- WorkspaceLayout, header `+ New` dropdown (đã hoàn thành ở loop trước).
- Tool builder nodes / Inspector (tái sử dụng nguyên).

## Validation & messages (đầy đủ theo PRD)

```
Name required:    "Trường Tên là bắt buộc"
Purpose required: "Trường Mục đích là bắt buộc"
Name > 50:        "Tên không được dài quá 50 ký tự"
Purpose > 255:    "Mục đích không dài quá 255 ký tự"
Duplicate name:   "Đã tồn tại tên nhiệm vụ này trong hệ thống"
Create success:   toast green "Tạo nhiệm vụ thành công" / "Task created successfully"
Update success:   toast green "Cập nhật nhiệm vụ thành công"
API error:        toast red với message từ server
```

Hiển thị song ngữ VI/EN — theo convention hiện tại của codebase (đang dùng EN ở UI), label primary là EN, không cần i18n switcher ở phase này.

## Tech notes

- State: dùng React local state + 1 module-level store (`taskStore.ts`) để mock multi-agent persistence trong session.
- Toast: dùng `useToast` (sonner) đã setup sẵn.
- Modal: dùng `Dialog` từ `@/components/ui/dialog`.
- Dropdown: dùng `DropdownMenu` từ shadcn (đã có).
- Auto-save: PRD đánh dấu `[later]` — skip phase này, chỉ giữ chỗ comment.
- Version history rollback: PRD note `[Later]` open-question — implement basic UI mock, không cần backend logic phức tạp.

## Out of scope

- Auto-save indicator.
- Backend persistence (mock only).
- Permission system thực (mock view-mode bằng query param `?role=tester`).
- Chi tiết config từng loại node mới (giữ nguyên Inspector hiện có).
