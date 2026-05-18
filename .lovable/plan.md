## Mục tiêu

Trong màn `/inventor`:

1. Hiển thị một **chip nhỏ "↙ From onboarding"** phía trên prompt đầu tiên (chỉ khi `?from=onboarding`), để user thấy rõ prompt được chuyển tiếp từ flow onboarding.
2. Thêm tính năng **Clarifying Questions**: nếu prompt mơ hồ/thiếu thông tin, Inventor tạm dừng luồng chính, hỏi 1–N câu làm rõ (multiple-choice + 1 ô text mở), chờ user trả lời, rồi mới chạy tiếp todo / strategy / apply config với prompt đã được bổ sung.

## Thay đổi trong `src/pages/Inventor.tsx`

### 1. Chip "From onboarding"

- Thêm vào `ChatMsg` một kind mới: `{ role: "ai"; kind: "source"; label: string }` — render dạng pill nhỏ, icon `CornerDownLeft` (↙), nền `primary-soft`, không có avatar bot.
- Trong `runConversation`, nếu `fromOnboarding === true`, push msg `source` với label `"From onboarding"` **trước** bubble user prompt.
  - Vị trí: pill nằm phía trên bubble prompt đầu, căn phải, kích thước nhỏ (text-[10px]), giống mock user gửi kèm.
- `MessageBubble` thêm nhánh render cho `kind === "source"`.

### 2. Clarifying Questions

#### 2a. Phát hiện prompt mơ hồ

Helper `needsClarification(prompt: string): ClarifyingSpec | null`:
- Trả về `null` nếu prompt đủ dài (≥ 80 ký tự) **và** match một trong các domain rõ ràng (chứa keyword: `customer|care|cskh|faq|booking|report|báo cáo|research|hr|onboarding`).
- Ngược lại trả về spec gồm 2 câu hỏi tuỳ ngữ cảnh, ví dụ:
  - Prompt ngắn chung chung → hỏi domain + audience.
  - Có `hr/onboarding` nhưng thiếu chi tiết → hỏi loại tài liệu (handbook, policy, paperwork) + ngôn ngữ phục vụ.
  - Có `report` thiếu chi tiết → hỏi loại báo cáo + tần suất.
- Mỗi câu hỏi: `{ id, question, options: string[] }`. Luôn kèm option "Other…" cho phép user nhập tự do.

#### 2b. Message kind mới

```ts
| { id; role: "ai"; kind: "clarify"; 
    questions: { id: string; question: string; options: string[] }[];
    answers: Record<string, string>;       // id → chosen / typed answer
    submitted: boolean;
  }
```

UI card `ClarifyingCard`:
- Header: icon `HelpCircle` + "A few quick questions" + subtext "Chọn nhanh để Inventor hiểu rõ hơn".
- Mỗi question: tiêu đề + grid các chip option (chọn 1, highlight `chip-primary` khi active) + 1 input nhỏ "Other…" (khi user gõ, các chip bỏ select).
- Nút "Continue" dưới cùng, disabled khi chưa trả lời đủ tất cả câu hỏi. Khi bấm:
  - Set `submitted = true` (card khoá lại, hiển thị tóm tắt câu trả lời ở dạng read-only).
  - Gọi `resumeAfterClarify(originalPrompt, answers)`.

#### 2c. Flow tích hợp

Sửa `runConversation(userPrompt)`:

```
push user prompt
push 'thinking'
await wait(500)
const spec = needsClarification(userPrompt)
if (spec) {
   push ai text "Trước khi bắt đầu, mình muốn làm rõ vài điểm:"
   push ai clarify(spec.questions)
   setThinking(false)
   return       // dừng — chờ user
}
runMainFlow(userPrompt)   // phần todo/strategy/cta hiện tại tách ra
```

Hàm mới `resumeAfterClarify(originalPrompt, answers)`:
- Build `mergedPrompt = originalPrompt + "\n\nContext:\n- " + Object.entries(answers).map(...).join("\n- ")`.
- Push ai text "Cảm ơn — mình sẽ dùng các thông tin sau để thiết kế agent." kèm list answers (đã hiển thị trong card, nên text ngắn gọn).
- Gọi `runMainFlow(mergedPrompt)`.
- Lưu `mergedPrompt` vào ref `effectivePromptRef` để `applyConfiguration` chọn draft dựa trên nó (thay vì `seedPrompt` cứng).

Sửa `applyConfiguration` để đọc `effectivePromptRef.current ?? seedPrompt` khi quyết định `careDraft` vs `reportDraft`.

#### 2d. Composer trong lúc chờ clarify

Trong khi có một `clarify` card chưa `submitted`:
- Disable nút Send + đổi placeholder thành "Trả lời các câu hỏi bên trên để tiếp tục…".
- Vẫn cho gõ nhưng `onSubmit` no-op.

### 3. Không thay đổi

- `commitDraftToAgent`, `ConfigPanel`, BusinessProcessTree, các kind message khác.
- Logic `handleFollowup` (sau khi config applied) giữ nguyên.

## Tóm tắt file đụng tới

- `src/pages/Inventor.tsx` — toàn bộ thay đổi trên (thêm 2 kind message, 1 component `ClarifyingCard`, helper `needsClarification`, tách `runMainFlow`, thêm `resumeAfterClarify`, đổi composer state, render chip "From onboarding").
