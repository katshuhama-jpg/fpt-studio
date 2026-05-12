## Mục tiêu

Tinh gọn header CTA theo hướng A + C: thay nút **"+ New Agent"** cố định bằng 1 dropdown **"+ New"** đa-entity, đồng thời ẩn các lựa chọn đã trùng với màn user đang đứng — giống pattern Dify / n8n.

## Hiện trạng

`src/components/layout/WorkspaceLayout.tsx` (dòng 261–263) render cứng:
```tsx
<NavLink to="/agents/new" className="btn-primary h-9">
  <Plus size={14} /> New Agent
</NavLink>
```
→ Nút này hiện ở mọi route dùng `WorkspaceLayout`, kể cả `/agents`, `/agents/new`, `/agents/:id` (nơi đã có CTA tạo agent trong content), gây trùng lặp.

## Thiết kế mới

### 1. Dropdown "+ New" trên header

| Item | Đích | Icon | Ẩn khi route khớp |
|---|---|---|---|
| New Agent | `/agents/new` | `Bot` | `/agents`, `/agents/new`, `/inventor` |
| New Tool | `/agents/:currentId/tools/new` hoặc `/tools` | `Wrench` | `/tools`, `/agents/:id/tools/*` |
| New Knowledge | `/knowledge?new=1` | `BookOpen` | `/knowledge` |
| New Task | `/agents/:currentId/tasks/new` (chỉ enable khi đang trong agent) | `ListChecks` | `/agents/:id/tasks/*` |
| ─── separator ─── | | | |
| Import from template | `/templates` | `Sparkles` | `/templates` |

- Khi **tất cả** items chính bị ẩn (vd. user đang ở `/agents`) → vẫn render dropdown nhưng chỉ còn item phụ "Import from template", hoặc fallback ẩn nguyên dropdown để header thật gọn.
- Trigger: `btn-primary h-9` với label `+ New` và `ChevronDown` nhỏ.

### 2. Logic ẩn theo route

Dùng `useLocation().pathname` + helper:
```ts
const hide = {
  agent:     /^\/(agents(\/new)?|inventor)$/.test(pathname),
  tool:      /^\/tools$/.test(pathname) || /^\/agents\/[^/]+\/tools/.test(pathname),
  knowledge: pathname === "/knowledge",
  task:      /^\/agents\/[^/]+\/tasks/.test(pathname),
  template:  pathname === "/templates",
};
```

### 3. Tương tác

- Click trigger → mở menu (pattern dropdown đã có sẵn cho tenant switcher / user menu trong layout — tái sử dụng cùng style `bg-surface rounded-xl ring-1 ring-border shadow-xl`).
- Click outside / ESC → đóng.
- Mỗi item: icon trái + tên + mô tả phụ 1 dòng (`text-[11px] text-muted-foreground`), giống các platform tham khảo.

## Phạm vi file

Chỉ sửa **1 file**: `src/components/layout/WorkspaceLayout.tsx`
- Thay block dòng 261–263 bằng component `HeaderNewMenu` cục bộ trong cùng file (tránh tạo file mới cho 1 dropdown nhỏ).
- Thêm import icon: `Bot`, `BookOpen`, `ListChecks`, `Sparkles`, `ChevronDown` (từ lucide-react).
- Thêm state `newMenuOpen` + ref đóng-ngoài, bám theo pattern `tenantMenu` đã có.

## Không thay đổi

- Không động vào CTA trong content của các màn list (`/agents`, `/tools`, `/knowledge`) — đó vẫn là primary CTA chính của màn.
- Không đổi route, không đổi business logic.
- Không tạo file mới.

## Kết quả kỳ vọng

- Ở `/templates`, `/settings`, `/docs`, `/api-keys`: thấy dropdown đầy đủ 4 entity → shortcut global thực sự hữu ích.
- Ở `/agents`: dropdown chỉ còn "Import from template" (hoặc ẩn) → không còn 2 nút "New Agent" cạnh nhau.
- Ở `/agents/:id`: thấy New Tool + New Task + New Knowledge — đúng ngữ cảnh đang build agent.
