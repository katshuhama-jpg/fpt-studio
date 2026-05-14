## Mục tiêu

Biến trang **General** thành trang setting tổng — tích hợp accordion cho từng nhóm config (Business processes, Tools, Tasks, Knowledge, Triggers, Guardrails, Chat optimization), trong khi vẫn giữ các tab riêng ở sidenav để user power-user dùng full editor.

## UX

```
General (1 trang dài, accordion)
├─ [Always open] Persona / Prompt / Model         (form edit trực tiếp như hiện tại)
├─ ▸ Business processes  (3)         [Manage →]
├─ ▸ Tools               (5)         [Manage →]
├─ ▸ Tasks               (4)         [Manage →]
├─ ▸ Knowledge           (12 docs)   [Manage →]
├─ ▸ Triggers            (2)         [Manage →]
├─ ▸ Guardrails          (3)         [Manage →]
└─ ▸ Chat optimization               [Manage →]
```

- Mỗi accordion **đóng mặc định**, click mở để xem **list rút gọn read-mostly** + nút "+ Add" mở dialog có sẵn (TaskFormDialog, BusinessProcessFormDialog, TriggerFormDialog, GuardrailFormDialog…).
- Header accordion: icon avatar + tên + count badge + nút "Manage →" link sang tab riêng (giữ navigate `?section=bp` v.v.).
- Item row gọn: icon nhỏ + tên + chip type + toggle on/off + nút edit (mở dialog hiện có).
- **Không duplicate form** — tái dùng các Dialog đã viết.
- Chat optimization vì có 5 sub-feature → trong accordion chỉ hiển thị summary toggles (References on/off, Opener, Quick replies, Rich, Follow-up) + "Manage →" để mở full editor.

## Visual

- Dùng `<Accordion type="multiple">` của shadcn (đã có `accordion.tsx`).
- Container `p-8 max-w-4xl mx-auto` (hẹp hơn 6xl để dễ đọc khi list dài).
- Trigger row: `h-14`, icon avatar `w-9 h-9 rounded-lg bg-primary-soft text-primary`, count badge `chip chip-muted`.
- Persona/Prompt/Model giữ nguyên ở đầu, không nằm trong accordion (đó là core identity).

## Files

**Sửa:**
- `src/pages/AgentBuilder.tsx` — viết lại `GeneralTab`:
  - Giữ block Persona/Prompt/Model đầu trang.
  - Thêm `<Accordion>` 7 sections, mỗi section là 1 sub-component nhỏ inline (dưới ~30 dòng/cái).
  - Mỗi sub-component đọc store tương ứng (`businessProcessStore`, `taskStore`, `agentToolsStore` nếu có / hoặc inline list, `triggerStore`, `guardrailStore`, `knowledgeStore`, `chatOptimizationStore`).
  - Nút "Manage →" gọi `setSearchParams({ tab: "develop", section: "<id>" })`.
  - Nút "+ Add" / "Edit" mở các Dialog đã có.

**Không tạo file mới** — tái dùng toàn bộ store + dialog hiện có.

## Phạm vi loại trừ

- Không đụng tabs ở sidenav (giữ Build/Test/Configure).
- Không đụng các trang riêng (BusinessProcessesGrid, TasksGrid, …).
- Không đổi data model.
