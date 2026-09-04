import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { knowledgeFaqStore, type KnowledgeFaq } from "./knowledgeFaqStore";
import { knowledgeStore } from "./knowledgeStore";
import ChipsInput, { type Chip } from "./ChipsInput";

const QUESTION_MAX = 500;
const ANSWER_MAX = 5000;
const MAX_CATEGORIES = 10;
const CATEGORY_MAX = 30;

/** Pass either kbId (Console FAQ tab, S13) or agentId (Agent Knowledge "Câu hỏi thường gặp"
 * tile, S14). Categories only apply to Console FAQs — Agent Knowledge items don't have them. */
export default function AddEditFaqModal({ open, kbId, agentId, editingFaq, onClose }: {
  open: boolean; kbId?: string; agentId?: string; editingFaq?: KnowledgeFaq; onClose: () => void;
}) {
  const isEdit = !!editingFaq;
  const [question, setQuestion] = useState(editingFaq?.question ?? "");
  const [answer, setAnswer] = useState(editingFaq?.answer ?? "");
  const [categories, setCategories] = useState<Chip[]>((editingFaq?.categories ?? []).map(value => ({ value })));
  const [questionTouched, setQuestionTouched] = useState(false);

  const canSubmit = question.trim().length > 0 && answer.trim().length > 0;
  const isDuplicate = !agentId && kbId && question.trim().length > 0 && knowledgeFaqStore.isDuplicateQuestion(kbId, question, editingFaq?.id);
  const categoryError = categories.length > MAX_CATEGORIES ? `Chỉ gắn được tối đa ${MAX_CATEGORIES} danh mục cho một FAQ.`
    : categories.some(c => c.value.length > CATEGORY_MAX) ? `Mỗi danh mục tối đa ${CATEGORY_MAX} ký tự.`
    : null;

  const submit = () => {
    setQuestionTouched(true);
    if (!canSubmit || categoryError) return;

    if (agentId) {
      if (isEdit) {
        // Agent Knowledge items don't support edit via this modal today — creation only.
      } else {
        const item = knowledgeStore.add(agentId, { name: question.trim(), kind: "faq", description: answer.trim() });
        toast.success("Đã tạo câu hỏi.");
        setTimeout(() => knowledgeStore.updateStatus(agentId, item.id, "processing"), 300);
        setTimeout(() => knowledgeStore.updateStatus(agentId, item.id, "done", { chunkCount: 1 }), 1500);
      }
      onClose();
      return;
    }

    const cats = categories.map(c => c.value);
    if (isEdit) {
      knowledgeFaqStore.update(editingFaq.id, { question: question.trim(), answer: answer.trim(), categories: cats });
      toast.success("Đã lưu câu hỏi.");
    } else {
      const faq = knowledgeFaqStore.create(kbId!, { question: question.trim(), answer: answer.trim(), categories: cats });
      toast.success("Đã tạo câu hỏi.");
      setTimeout(() => { knowledgeFaqStore.updateStatus(faq.id, "processing"); }, 300);
      setTimeout(() => { knowledgeFaqStore.updateStatus(faq.id, "done", { chunkCount: 1 }); }, 1500);
    }
    onClose();
  };

  const existingCategories = kbId ? knowledgeFaqStore.listCategories(kbId) : [];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa FAQ" : "Tạo FAQ"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Câu hỏi <span className="text-destructive">*</span></label>
              <span className="text-xs text-muted-foreground">{question.length}/{QUESTION_MAX}</span>
            </div>
            <textarea
              autoFocus rows={2} maxLength={QUESTION_MAX} value={question}
              onChange={e => setQuestion(e.target.value)}
              onBlur={() => setQuestionTouched(true)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
            />
            {questionTouched && question.trim().length === 0 && <p className="text-xs text-destructive mt-1">Vui lòng nhập câu hỏi.</p>}
            {isDuplicate && (
              <p className="text-xs text-warning mt-1">Câu hỏi này đã tồn tại trong kho. Câu hỏi trùng nhau có thể khiến Agent trả lời thiếu nhất quán.</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Câu trả lời <span className="text-destructive">*</span></label>
              <span className="text-xs text-muted-foreground">{answer.length}/{ANSWER_MAX}</span>
            </div>
            <textarea
              rows={5} maxLength={ANSWER_MAX} value={answer} onChange={e => setAnswer(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
            />
          </div>
          {!agentId && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Danh mục</label>
              <ChipsInput chips={categories} onChange={setCategories} placeholder={existingCategories.length ? existingCategories.join(", ") : "Nhập danh mục..."} />
              {categoryError && <p className="text-xs text-destructive mt-1">{categoryError}</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} disabled={!canSubmit || !!categoryError} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">{isEdit ? "Lưu" : "Tạo"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
