## Đồng bộ giao diện Business Processes với Tasks/Tools

### Vấn đề
Tab Business processes hiện có giao diện khác biệt đáng kể so với Tasks và Tools:
- Container `p-6 max-w-[1280px]` thay vì `p-8 max-w-6xl`
- Search nằm riêng dưới header thay vì cùng hàng với nút Create
- Card không có icon avatar (Tasks có icon 9x9 với nền màu)
- Card dùng DropdownMenu (MoreHorizontal) + toggle inline thay vì nút Edit/Delete hiện khi hover ở góc
- Card có footer "Last update" không có ở Tasks
- Empty state quá đơn giản so với Tasks

### Thay đổi (file `BusinessProcessesGrid.tsx`)

1. **Container**: Đổi `p-6 max-w-[1280px]` → `p-8 max-w-6xl mx-auto`
2. **Header**: Đưa search input vào cùng hàng với nút Create (bên phải), giống Tasks
3. **Card style**:
   - Thêm icon avatar `Layers` với `bg-primary-soft text-primary` (w-9 h-9 rounded-lg)
   - Hiển thị name + "Default" chip + strategy chip
   - Description
   - Bỏ toggle inline và footer "Last update" + task/tool count
   - Thay DropdownMenu bằng nút Edit/Delete hiện khi hover ở `absolute top-3 right-3`, giống Tasks
   - BP default thì nút Delete → thay bằng Reset to default (giống system task)
4. **Empty state**: Thay bằng empty state giống Tasks — icon lớn, heading, mô tả, nút Create
5. **Card grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5` (giống Tasks)

### Không thay đổi
- Dialog tạo/sửa BP (giữ nguyên)
- Logic store, toggle ON/OFF, Reset default
- AlertDialog xác nhận xóa

### File sửa
- `src/components/business-processes/BusinessProcessesGrid.tsx`