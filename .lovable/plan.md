# Kế hoạch xây dựng tính năng Tool theo use case

Hiện trạng: trong `Agent → Develop → Tools` chỉ có 1 dạng tool duy nhất (custom Python với code editor + params + card binding) — `ToolsTab` trong `AgentBuilder.tsx` và trang `ToolBuilder.tsx`. Bộ use case mới định nghĩa **5 nhóm tool** + tầng **execution**. Kế hoạch dưới đây tổ chức lại UI/UX cho khớp, vẫn giữ in-memory store (`toolStore`) làm dữ liệu mẫu.

## 1. Tổ chức lại trang Tools của Agent

Đổi `ToolsTab` thành màn "Agent Tools" 2 phần, theo UC-BT-01:

- **My Tools**: tool đã gắn vào agent này (cards: name, description, badge nguồn `Built-in | Custom API | IDE | MCP`, count, status `Installed/Used`).
- **Tool Store**: catalog các built-in tool set chưa cài (Install button).
- Search bar + filter theo category (Communication, Data, AI, Banking…).
- Empty states: "chưa cài tool" và "không match search" theo UC-BT-01.
- Nút **+ Add tool** mở dropdown: `Browse Built-in`, `New Custom API tool`, `New IDE (Python) tool`, `Import JSON`, `Connect MCP server`.

## 2. Built-in Tool Store (UC-BT-01..05)

- Trang/Drawer "Tool Store" với grid các **tool sets** mẫu (CRM Lookup, Core Banking, Email/SMS, Google Calendar, Web Search…). Mỗi card: avatar plugin, tool count, mô tả, nút **Install**.
- **Install dialog** (UC-BT-02): 2 nhánh
  - Không cần config → install ngay + toast `Tool installed successfully`.
  - Cần API key → form `Authorization name / API Key / Base URL (optional)` → validate giả → lưu credential (mask).
- **Tool Details popup** (UC-BT-03): accordion liệt kê từng tool con với input/output schema, required credentials, link doc.
- **Use in BP / Task** (UC-BT-04, 05): trong tool selector hiện tại của Task/BP node thêm tabs `Built-in | Custom`; chọn xong hiển thị badge tool name.
- Business rule: built-in không edit/delete, chỉ install/uninstall; mỗi set chỉ install 1 lần (disable nút khi đã install).

## 3. Custom Tool — API (UC-CT-01)

Wizard 6 bước trong drawer/full-page:

1. Basic info (name, description)
2. API config (URL, Method, Headers JSON)
3. Input params (Name, Description, Type, Input method `agent | user | const`, Required, Save in memory)
4. Output params
5. Test API: form input theo params → hiển thị Request preview + Response + badge PASS/FAIL
6. Save → thêm vào My Tools (loại `Custom API`).

Validation: invalid URL, test failed inline error.

## 4. Custom Tool — IDE/Python (UC-IDE-01)

Tái sử dụng `ToolBuilder.tsx` hiện có (code editor + metadata + test). Chuẩn hóa:
- Default template `def handler(**kwargs):` đã có.
- Tabs `Code | Metadata | Card binding` giữ nguyên.
- Tab Test: input JSON → run mô phỏng → output + duration.
- Lỗi syntax → toast `Code execution failed`.

## 5. Import / Export (UC-IMP-01, 02)

- Nút **Export JSON** trên card tool và trong editor → tải `tool-name.json` (serialize từ `toolStore`).
- Nút **Import** → file picker `.json` → validate schema (kiểm tra field bắt buộc) → preview dialog → Confirm → tạo tool. Schema sai: `Unsupported tool format`.

## 6. MCP Tools (UC-MCP-01..03)

Section riêng "MCP Connections" trong trang Tools:

- **Connect MCP**: form `Name / Endpoint / Token` → Connect → validate → fetch tool list → checkbox chọn tool muốn include → Save. Lỗi: `Unable to connect to MCP server`.
- **Sync**: connection card hiện badge `Updates available` → click `Review updates` mở diff dialog (mock).
- **Delete**: nếu đang được dùng → cảnh báo `This connection is used in N workflows` với 2 nút `Cancel | Force delete & detach`.

## 7. Tool Execution & Audit (UC-EXEC-01)

Thêm tab **Runs** trong editor mỗi tool (và trang tổng "Tool runs" cấp agent):

- Bảng audit: Tool, Input, Output, Duration, Status, Time, Retries (max 3), Timeout flag.
- Trong drawer Test (đang có), sau mỗi lần Run lưu 1 row vào lịch sử (in-memory) để mô phỏng audit log.
- Trạng thái lỗi mẫu: `Tool execution timeout`, `Validation failed: missing param X`.

## 8. Data model (in-memory, mở rộng `types.ts`)

```text
ToolDefinition
  id, agentId
  source: "builtin" | "api" | "ide" | "mcp"
  name, description, status, enabled, updatedAt
  // builtin
  setId, pluginAvatar, requiresAuth, credentials[]
  // api
  api: { url, method, headers, inputs[], outputs[] }
  // ide (giữ nguyên)
  code, params[], cardBinding
  // mcp
  mcpConnectionId, remoteToolName
  // execution
  runs: { id, input, output, ms, status, error?, ts }[]

McpConnection { id, name, endpoint, token, tools[], updatesAvailable }
ToolSetCatalog (static seed) — danh sách built-in để hiển thị Store
```

## 9. Files dự kiến chỉnh/tạo

- Sửa: `src/components/tool-builder/types.ts` (mở rộng model + seed catalog), `src/pages/AgentBuilder.tsx` (`ToolsTab` mới), `src/pages/ToolBuilder.tsx` (chia route theo source), task/BP tool selector.
- Tạo:
  - `src/components/tool-builder/store/ToolStore.tsx` (browse + install)
  - `src/components/tool-builder/store/InstallDialog.tsx`
  - `src/components/tool-builder/api/ApiToolWizard.tsx`
  - `src/components/tool-builder/mcp/McpConnections.tsx`, `ConnectMcpDialog.tsx`
  - `src/components/tool-builder/io/ImportExport.tsx`
  - `src/components/tool-builder/runs/RunsTable.tsx`
  - Routes mới: `/agents/:id/tools/store`, `/agents/:id/tools/new/api`, `/agents/:id/tools/new/ide`, `/agents/:id/tools/mcp`.

## 10. Phạm vi triển khai theo phase

Ưu tiên trong lần build đầu (giảm rủi ro):

- Phase 1: Tổ chức lại `ToolsTab` (My Tools + Add menu) + Built-in Tool Store browse + Install (UC-BT-01..03) + types mở rộng + seed catalog.
- Phase 2: Custom API wizard (UC-CT-01) + Import/Export (UC-IMP-01,02).
- Phase 3: MCP Connections (UC-MCP-01..03).
- Phase 4: Tool Runs/audit (UC-EXEC-01) + tích hợp tool selector trong Task/BP.

Bạn muốn mình triển khai cả 4 phase trong lần build kế tiếp, hay làm cuốn chiếu Phase 1 trước rồi tiếp tục?
