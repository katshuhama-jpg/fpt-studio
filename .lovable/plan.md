# Create Task — Workflow Editor (Dify-style)

Mở rộng màn `/agents/:id/tasks/:taskId` (`src/pages/TaskEditor.tsx`) thành editor workflow đầy đủ theo spec: 21 block types, popup Add-node 3 tab (Blocks / Tools / Tasks), Node Detail panel theo từng loại, chat Prompt-to-Task có Clarifying questions + Apply/Discard, Error Handling & Retry, Test panel với input variables, Publish dialog có version name + release note + warning, History có Restore. Tất cả mock, persist `localStorage`.

Giữ nguyên các trang khác. Tận dụng React Flow + shadcn đang có.

## Phạm vi UI

### Top bar
- Inline name (đã có) + chip Auto-saved (xanh khi sạch, "Saving…" 600ms khi dirty).
- Buttons: Assistant (toggle chat phải), Test, Publish (primary), History (icon).
- Bỏ nút "Save" thủ công — auto-save vào localStorage theo key `task:<agentId>:<taskId>`.

### Canvas
- Giữ React Flow hiện tại. Mặc định có Start + End (đã có).
- Nút `+ Add` nổi góc trên-trái canvas → mở Add-node popup.
- Node có handle phụ "error" (xuất hiện khi config Error Handling = `Continue in Error Branch`).

### Add-node popup (Dialog)
- Search box + 3 tab: **Blocks** | **Tools** | **Tasks**.
- Blocks: 21 node types (xem dưới), group theo category (Input/AI/Logic/Knowledge/Tools/Output), icon + mô tả ngắn.
- Tools: 2 sub-tab `Custom` (đọc `toolStore.list(agentId)` lọc IDE/API, badge Active/Inactive) và `MCP` (đọc tools source=mcp, group theo connectionId). Empty state có CTA "Create new tool" / "Connect MCP".
- Tasks: `taskStore.list(agentId)` trừ task hiện tại.
- Chọn 1 item → drop node ra center canvas, đóng popup.

### Right panel (slide-over ~420px, mutual exclusive)
- **Node Detail**: mở khi chọn node.
- **Assistant chat**: mở khi bấm Assistant button.

### Node Detail panel
Render dynamic theo `kind`. Mỗi panel: header (icon + label + kind), description, action row (Run this step | Copy | Duplicate | Delete), form fields, vùng **Error Handling** (cho các kind hỗ trợ).

Field controls: dùng shadcn Input / Select / Switch / Slider / Textarea / Checkbox / Button. Required đánh dấu `*` đỏ; default value điền sẵn; tooltip ở label khi cần.

### Error Handling & Retry
Component `ErrorHandlingSection` dùng chung cho: `llm | code | tool | rewriter | http | task_call`.
- Select Error Handling: `Stop Workflow` (default) / `Continue with Error` / `Continue with Fallback` (hiện input fallback value) / `Continue in Error Branch` (thêm handle `error` trên node).
- Subset `llm | code | tool | http`: thêm Retry on Failure switch → Max retries (slider+input 1-5, default 3) + Retry interval (slider+input 100-5000ms, default 1000).

### Test panel (slide-over)
- Render input form từ Start node variables.
- Nút "Start run" → mock trace: list các node theo topo order với input/output JSON giả + timing.

### Publish dialog
- Version name (default `Version {n}`, unique trong history, ≤50 chars), Release note (≤1000 chars).
- Warning list: BPs/Triggers/Tasks reference task này (mock từ `businessProcessStore` + `triggerStore` + cross-task call).
- Publish button → processing 800ms → success toast + push history entry + Status=Published.

### History dropdown
- List versions: Name (+ chip "Latest"), published at, by ("you"), release note.
- Click version → mở read-only viewer (overlay) với nút **Restore** (confirm dialog).

## Prompt-to-Task assistant

Chat panel bên phải (toggle), style như Cursor/Relevance.

- Lịch sử user/ai trong session, lưu vào ref (không persist).
- Input dưới cùng; gõ `/` hoặc `@` mở picker chọn node hiện có hoặc variable (autocomplete dropdown sát caret).
- Thinking state (3 dots) khi assistant "process".

### Clarifying questions
Trước khi sinh proposal, mock helper `needsClarification(prompt, graph)` trả về 1–3 câu hỏi khi:
- Có nhiều node match theo tên (vd: "the LLM node" mà có >1).
- Thiếu giá trị bắt buộc (variable / threshold / model).
- Scope không rõ (whole flow vs 1 branch).
- Bug root cause mơ hồ.
- Action destructive (delete/overwrite).

Render dạng card: title "A few quick questions" + mỗi question = chip quick-reply (multi-choice) + ô "Other…" text. Khi user trả lời đủ → bấm Continue → assistant tiếp tục sinh proposal với prompt + answers gộp. Nếu prompt đã rõ, bỏ qua bước này.

### Proposals (Apply / Discard)
Mock 3 nhóm task:
1. **Add/edit flow**: parse keyword (vd "add Knowledge Retrieval before LLM") → proposal mô tả node thêm/sửa/xoá + edge sẽ wire. Apply → mutate canvas state.
2. **Self-fix**: phát hiện node lỗi (vd http thiếu URL trong checklist) → propose patch config field.
3. **Trace**: hiển thị step-by-step list các node theo topo order với input/output mock + branch reason.

Proposal card: header (icon + summary), diff/preview (list "+add", "~edit", "-delete"), 2 nút **Apply** (primary) / **Discard**. Apply xong → card chuyển read-only ("Applied"), canvas update + auto-save dirty.

## State & persistence

- Toàn bộ draft (`nodes`, `edges`, `name`, `description`, `history`) auto-save vào `localStorage["task:<agentId>:<taskId>"]` debounced 400ms; chip Auto-saved phản hồi.
- Mount đọc lại localStorage, fallback `taskStore` rồi `defaultStartEnd()`.

## Technical details

### Files mới

- `src/components/task-editor/blockCatalog.ts` — định nghĩa 21 block specs `{ kind, label, description, category, icon, defaults, supportsErrorHandling, supportsRetry }`.
- `src/components/task-editor/AddNodePopup.tsx` — Dialog 3 tab (Blocks/Tools/Tasks) + search.
- `src/components/task-editor/NodeDetailPanel.tsx` — switch theo `kind`, render form tương ứng. Bên trong tách sub-components: `StartConfig`, `QuestionClassifierConfig`, `LLMConfig`, `KnowledgeRetrievalConfig`, `IfElseConfig`, `HttpConfig`, `AgentConfig`, `CodeConfig`, … (21 components nhỏ).
- `src/components/task-editor/ErrorHandlingSection.tsx` — select + fallback + retry sliders.
- `src/components/task-editor/AssistantPanel.tsx` — chat UI, input với mention picker, proposal cards, clarifying cards.
- `src/components/task-editor/assistantEngine.ts` — pure helpers: `parseIntent`, `needsClarification`, `buildProposal`, `applyProposal(graph, proposal)`.
- `src/components/task-editor/TestPanel.tsx` — input form từ Start vars + mock trace renderer.
- `src/components/task-editor/PublishDialog.tsx` — version name + release note + warning list.
- `src/components/task-editor/HistoryDropdown.tsx` — list + Restore.

### Files sửa

- `src/components/tool-builder/types.ts` — mở rộng `NodeKind` lên 21 kind (thêm: `classifier, rewriter, query_processor, hkg_retrieval, iteration, code, var_agg, ref_filter, template, param_extractor, agent, file_parser, loop_node, var_assigner, knowledge_lookup`). Cập nhật `NodeCategory` thêm `knowledge`, `tools`.
- `src/components/tool-builder/nodes/FlowNode.tsx` — thêm error handle (Right side, offset y bottom) khi `data.config.errorMode === "branch"`.
- `src/components/tool-builder/Canvas.tsx` — bỏ MiniMap toggleable; truyền `errorMode` để render handle. Không cần thay đổi nhiều.
- `src/pages/TaskEditor.tsx` — thay `NodeLibrary` (sidebar drag) bằng nút Add → `AddNodePopup`; thay `Inspector` bằng `NodeDetailPanel`; thay `TestDrawer` bằng `TestPanel`; thêm `AssistantPanel`, `PublishDialog` (thay dialog hiện tại), `HistoryDropdown`. Auto-save localStorage. Bỏ nút Save thủ công.

### Mapping 21 blocks → kind

```text
Start → start              Question Classifier → classifier
Question Rewriter → rewriter   Query Processor → query_processor
Knowledge Retrieval → knowledge   H-KG Retrieval → hkg_retrieval
LLM → llm                  If/Else → if
Iteration → iteration      Code → code
Variable Aggregator → var_agg   End → end
Reference Filter → ref_filter   Template → template
Parameter Extractor → param_extractor   HTTP Request → http
Agent → agent              File Parser → file_parser
Loop → loop_node           Variable Assigner → var_assigner
Knowledge Lookup → knowledge_lookup
```

(`start`/`end` map tới `trigger`/`output` hiện có để giữ tương thích.)

### Assistant engine — intent parsing (mock)

`parseIntent(prompt)` chia 3 nhóm bằng keyword:
- `/add|insert|wire/i` → add/edit
- `/fix|bug|error|fail/i` → self-fix
- `/why|trace|debug|explain/i` → trace

Build proposal:
- add/edit: tìm `node type` trong prompt match label các block; tìm vị trí "before/after <X>" → tính insert position.
- self-fix: chạy `computeIssues()` (đã có) → chọn 1 issue đầu, propose patch (vd set `url`, `topK`).
- trace: topo sort nodes, sinh mock input/output JSON theo `kind` defaults.

`needsClarification` chạy trước `buildProposal`; nếu trả về spec → push clarify card + dừng, chờ user trả lời rồi gọi `buildProposal(prompt + answers)`.

### Acceptance checklist (kiểm trước khi xong)

- 21 block types xuất hiện trong Add-node popup, drop được ra canvas.
- Mỗi block khi select hiện form đúng fields/default theo spec.
- ErrorHandling/Retry hiển thị đúng subset node, "Continue in Error Branch" thêm handle thật.
- Assistant: hỏi clarifying khi prompt mơ hồ; Apply mutate canvas; Discard không đổi gì.
- Test panel chạy mock trace; Publish dialog có warning + lưu version; History Restore confirm + overwrite draft.
- Auto-save localStorage giữ state qua F5.
