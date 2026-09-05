import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { knowledgeFaqStore, type KnowledgeFaq } from "./knowledgeFaqStore";
import { knowledgeStore } from "./knowledgeStore";
import CategoryChipsInput from "./CategoryChipsInput";
import FaqSidePeek from "./FaqSidePeek";

const QUESTION_MAX = 500;
const ANSWER_MAX = 5000;
const MAX_CATEGORIES = 10;
const CATEGORY_MAX = 30;
const DUPLICATE_CHECK_MIN_CHARS = 8;
const DUPLICATE_CHECK_DEBOUNCE_MS = 500;

/** Pass either kbId (Console FAQ tab) or agentId (Agent Knowledge "Câu hỏi thường gặp" tile).
 * Categories, duplicate detection, and the side peek only apply to Console FAQs — Agent
 * Knowledge items don't have a kbId-scoped catalog to compare against. */
export default function AddEditFaqModal({ open, kbId, agentId, editingFaq, onClose }: {
  open: boolean; kbId?: string; agentId?: string; editingFaq?: KnowledgeFaq; onClose: () => void;
}) {
  const isEdit = !!editingFaq;
  const [question, setQuestion] = useState(editingFaq?.question ?? "");
  const [answer, setAnswer] = useState(editingFaq?.answer ?? "");
  const [categories, setCategories] = useState<string[]>(editingFaq?.categories ?? []);
  const [questionTouched, setQuestionTouched] = useState(false);
  const [answerTouched, setAnswerTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [matches, setMatches] = useState<{ exact: KnowledgeFaq | null; similar: KnowledgeFaq[] }>({ exact: null, similar: [] });
  const [maxCategoriesMsg, setMaxCategoriesMsg] = useState(false);
  const [peekFaq, setPeekFaq] = useState<KnowledgeFaq | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (agentId || !kbId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = question.trim();
    if (q.length < DUPLICATE_CHECK_MIN_CHARS) { setMatches({ exact: null, similar: [] }); return; }
    debounceRef.current = setTimeout(() => {
      setMatches(knowledgeFaqStore.findMatches(kbId, q, editingFaq?.id));
    }, DUPLICATE_CHECK_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, kbId, agentId, editingFaq?.id]);

  const questionError = (questionTouched || submitAttempted) && question.trim().length === 0 ? "Vui lòng nhập câu hỏi." : null;
  const answerError = (answerTouched || submitAttempted) && answer.trim().length === 0 ? "Vui lòng nhập câu trả lời." : null;
  const categoryError = categories.length > MAX_CATEGORIES
    ? `Chỉ gắn được tối đa ${MAX_CATEGORIES} danh mục cho một câu hỏi.`
    : categories.some(c => c.length > CATEGORY_MAX)
      ? `Mỗi danh mục tối đa ${CATEGORY_MAX} ký tự.`
      : null;
  const canSubmit = question.trim().length > 0 && answer.trim().length > 0 && !categoryError;

  const isDirty = question.trim() !== (editingFaq?.question ?? "").trim()
    || answer.trim() !== (editingFaq?.answer ?? "").trim()
    || categories.length !== (editingFaq?.categories ?? []).length
    || categories.some(c => !(editingFaq?.categories ?? []).includes(c));

  const requestClose = () => { if (isDirty) setShowDiscardConfirm(true); else onClose(); };

  const runLifecycle = (updateFn: (status: "processing" | "done", chunkCount?: number) => void) => {
    setTimeout(() => updateFn("processing"), 300);
    setTimeout(() => updateFn("done", 1), 1500);
  };

  const submit = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;

    if (agentId) {
      if (!isEdit) {
        const item = knowledgeStore.add(agentId, { name: question.trim(), kind: "faq", description: answer.trim() });
        toast.success("Đã lưu câu hỏi.");
        runLifecycle((status, chunkCount) => knowledgeStore.updateStatus(agentId, item.id, status, chunkCount !== undefined ? { chunkCount } : undefined));
      }
      onClose();
      return;
    }

    if (isEdit) {
      knowledgeFaqStore.update(editingFaq.id, { question: question.trim(), answer: answer.trim(), categories });
      toast.success("Đã lưu câu hỏi.");
      runLifecycle((status, chunkCount) => knowledgeFaqStore.updateStatus(editingFaq.id, status, chunkCount !== undefined ? { chunkCount } : undefined));
    } else {
      const faq = knowledgeFaqStore.create(kbId!, { question: question.trim(), answer: answer.trim(), categories });
      toast.success("Đã lưu câu hỏi.");
      runLifecycle((status, chunkCount) => knowledgeFaqStore.updateStatus(faq.id, status, chunkCount !== undefined ? { chunkCount } : undefined));
    }
    onClose();
  };

  const categoryOptions = kbId ? knowledgeFaqStore.listCategoriesWithCounts(kbId) : [];

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && requestClose()}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Sửa FAQ" : "Tạo FAQ"}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Nhập câu hỏi và câu trả lời để Agent sử dụng khi phản hồi.</p>
          </DialogHeader>
          {editingFaq && (editingFaq.status === "failed" || editingFaq.status === "invalid") && (
            <div className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed ${editingFaq.status === "failed" ? "bg-[hsl(var(--destructive-soft))] text-destructive" : "bg-[hsl(var(--warning-soft))] text-warning"}`}>
              <p className="font-semibold">{editingFaq.status === "failed" ? "Xử lý thất bại" : "Nội dung chưa hợp lệ"}</p>
              {editingFaq.statusReason && <p className="mt-0.5">{editingFaq.statusReason}</p>}
              <p className="mt-1 opacity-80">
                {editingFaq.status === "failed" ? "Lưu lại để hệ thống tự động xử lý lại." : "Hãy chỉnh sửa nội dung phù hợp rồi lưu lại."}
              </p>
            </div>
          )}
          <div className="space-y-4 py-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Câu hỏi <span className="text-destructive">*</span></label>
                <span className="text-xs text-muted-foreground">{question.length}/{QUESTION_MAX}</span>
              </div>
              <input
                value={question}
                maxLength={QUESTION_MAX}
                onChange={e => setQuestion(e.target.value)}
                onBlur={() => { setQuestion(v => v.trim()); setQuestionTouched(true); }}
                placeholder="Nhập câu hỏi người dùng thường hỏi"
                className={`w-full h-10 px-3 rounded-lg border bg-white text-sm outline-none focus:ring-2 transition-base ${
                  questionError ? "border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"
                }`}
              />
              {questionError && <p className="text-xs text-destructive mt-1">{questionError}</p>}

              {!agentId && matches.exact && (
                <div className="mt-1.5 rounded-lg bg-[hsl(var(--warning-soft))] px-3 py-2">
                  <p className="text-xs text-warning leading-relaxed">
                    Câu hỏi này đã tồn tại trong kho. Câu hỏi trùng nhau có thể khiến Agent trả lời thiếu nhất quán.
                  </p>
                  <button type="button" onClick={() => setPeekFaq(matches.exact)} className="text-xs font-semibold text-warning hover:underline mt-1">
                    Xem câu hỏi đã có
                  </button>
                </div>
              )}
              {!agentId && !matches.exact && matches.similar.length > 0 && (
                <div className="mt-1.5 rounded-lg bg-surface-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Có {matches.similar.length} câu hỏi tương tự trong kho:</p>
                  <div className="mt-1 space-y-0.5">
                    {matches.similar.map(f => (
                      <button key={f.id} type="button" onClick={() => setPeekFaq(f)} className="block text-left text-xs font-medium text-primary hover:underline truncate w-full">
                        {f.question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Câu trả lời <span className="text-destructive">*</span></label>
                <span className="text-xs text-muted-foreground">{answer.length}/{ANSWER_MAX}</span>
              </div>
              <textarea
                rows={6} maxLength={ANSWER_MAX} value={answer}
                onChange={e => setAnswer(e.target.value)}
                onBlur={() => setAnswerTouched(true)}
                placeholder="Nhập câu trả lời Agent sẽ dùng"
                className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm outline-none focus:ring-2 transition-base resize-none ${
                  answerError ? "border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"
                }`}
              />
              {answerError && <p className="text-xs text-destructive mt-1">{answerError}</p>}
            </div>
            {!agentId && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Danh mục</label>
                <CategoryChipsInput
                  value={categories}
                  onChange={next => { setCategories(next); setMaxCategoriesMsg(false); }}
                  options={categoryOptions}
                  maxCount={MAX_CATEGORIES}
                  onMaxAttempt={() => setMaxCategoriesMsg(true)}
                />
                {maxCategoriesMsg && <p className="text-xs text-warning mt-1">Chỉ gắn được tối đa {MAX_CATEGORIES} danh mục cho một câu hỏi.</p>}
                {categoryError && <p className="text-xs text-destructive mt-1">{categoryError}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={requestClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
            <button onClick={submit} disabled={!canSubmit} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Lưu</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FaqSidePeek faq={peekFaq} onClose={() => setPeekFaq(null)} />

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ thay đổi?</AlertDialogTitle>
            <AlertDialogDescription>Thông tin bạn vừa nhập sẽ không được lưu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDiscardConfirm(false); onClose(); }} className="bg-surface text-foreground border border-border hover:bg-surface-muted">Bỏ thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
