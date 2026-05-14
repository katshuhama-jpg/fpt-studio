## Mục tiêu
Xoá hẳn panel "Preview" (cột phải) trong trang **Chat optimization**, để form setting chiếm full width.

## Thay đổi
File: `src/components/configure/ChatOptimizationTab.tsx`

1. Trong block layout chính:
   - Đổi `<div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6 items-start">` → bỏ grid, dùng container đơn `<div>`.
   - Xoá dòng `<PreviewPanel settings={settings} tab={tab} />`.
2. Xoá hoàn toàn function `PreviewPanel` và các helper chỉ phục vụ nó (component `Bubble` nếu không còn nơi khác dùng — sẽ verify trước khi xoá).
3. Dọn import không dùng (nếu có icon/component chỉ dùng trong Preview).

## Phạm vi loại trừ
- Không đụng các tab Triggers, Guardrails, hay General.
- Không đổi data store.
