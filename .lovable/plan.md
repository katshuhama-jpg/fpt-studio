# Plan — Configure: Triggers, Guardrails, Chat optimization

## Mục tiêu
Tổ chức lại nhóm **Configure** trong Agent Builder thành 3 mục độc lập, đồng nhất visual với Tasks/Tools/Business processes hiện có.

## Sidenav mới

```
Develop
├── Build
│   ├── General          (chỉ còn Persona/Prompt/Model)
│   ├── Business processes
│   ├── Knowledge
│   ├── Tools
│   └── Tasks
├── Test
│   ├── Test cases
│   └── Auto-test
└── Configure
    ├── Triggers          ← mới (thay cho mục cũ trong Build)
    ├── Guardrails        ← tách từ General
    └── Chat optimization ← mới, gom 5 sub-feature
```

- Bỏ "Triggers" khỏi nhóm Build, "Advanced" khỏi Configure.
- Guardrails section trong `GeneralTab` → xoá, di chuyển sang trang riêng.
- Các setting khác trong `AdvancedTab` (Conversation memory, Topics, Reminders, Credentials) → đưa vào Chat optimization hoặc giữ lại 1 mục "Advanced" nhỏ (sẽ quyết định khi build).

## 1. Triggers — `src/components/configure/TriggersTab.tsx`

Trang quản lý "khi nào agent chạy". Pattern card-grid giống Tasks.

Loại trigger:
- **Manual** (mặc định, luôn bật)
- **Schedule** — cron-like: hàng giờ/ngày/tuần
- **Webhook** — endpoint URL + secret
- **Event** — keyword / intent từ message
- **Email inbound** (mock)

UI:
- Header: search + "New trigger" button (giống Tasks).
- Card grid 3 cột: icon avatar (Zap/Clock/Webhook/Mail), tên, type chip, last fired, on/off toggle, hover Edit/Delete.
- Empty state có icon + CTA.
- Form dialog: chọn type → field tương ứng (cron expression, webhook URL, keywords).

## 2. Guardrails — `src/components/configure/GuardrailsTab.tsx`

Tách section Guardrails khỏi `GeneralTab`, chuyển sang trang riêng nhưng nâng cấp UI.

UI:
- Header: search + "New rule" + filter by kind (Block/Warn).
- Card grid: icon Shield, rule text, kind badge (Block đỏ / Warn vàng), scope chip (Input/Output/Both), toggle.
- Form: text rule + kind + scope + optional example.
- Seed sẵn data từ array `guardrails` hiện có trong `AgentBuilder.tsx`.

## 3. Chat optimization — `src/components/configure/ChatOptimizationTab.tsx`

Theo spec section 2.10. Gom 5 sub-feature thành **tabs ngang** trong cùng trang (giống pattern Inspector của Tool Builder), giữ container `p-8 max-w-6xl mx-auto` thống nhất.

Tabs:
1. **References** — toggle "Show references", chọn format (inline citation / footer list / card), per-task override.
2. **Conversation opener** — danh sách câu mở đầu (đã có sẵn trong Advanced, port qua), thêm: greeting message, avatar, position.
3. **Quick-reply buttons** — list button presets (label + payload), preview chat bubble.
4. **Rich response** — toggle bật multi-media, image-from-document, **Card data binding** table (binding fields → card template).
5. **Follow-up suggestions** — toggle, số lượng (1-5), nguồn (LLM-generated / manual list).

Mỗi sub-tab dùng pattern Field/Section atoms có sẵn trong `AgentBuilder.tsx`.

## Files thay đổi

**Mới:**
- `src/components/configure/TriggersTab.tsx`
- `src/components/configure/TriggerFormDialog.tsx`
- `src/components/configure/triggerStore.ts`
- `src/components/configure/GuardrailsTab.tsx`
- `src/components/configure/GuardrailFormDialog.tsx`
- `src/components/configure/guardrailStore.ts`
- `src/components/configure/ChatOptimizationTab.tsx` (chứa cả 5 sub-tabs trong cùng file)
- `src/components/configure/chatOptimizationStore.ts`

**Sửa:**
- `src/pages/AgentBuilder.tsx`:
  - `developNav`: bỏ Triggers khỏi Build, đổi Configure thành 3 mục mới.
  - Routing: thêm các section mới `triggers`, `guardrails`, `chat-opt`.
  - `GeneralTab`: xoá section Guardrails + ProcessItem mock (đã có Business processes tab riêng).
  - Xoá `AdvancedTab` hoặc rút gọn.

## Phạm vi mock
- Tất cả store dùng in-memory (giống `taskStore`, `businessProcessStore`).
- Seed 2-3 item mỗi loại để có dữ liệu hiển thị.
- Không gọi backend.

## Visual consistency
- Container `p-8 max-w-6xl mx-auto`
- Card icon avatar `w-9 h-9 rounded-lg bg-primary-soft text-primary`
- Hover Edit/Delete buttons `absolute top-3 right-3`
- Empty state icon + heading + description + CTA
- Chip styles: `chip chip-primary` / `chip-accent` / custom by kind
