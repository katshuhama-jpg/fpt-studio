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

/** `editingFaq` edits an existing FAQ (in Console or already attached to an Agent) — pass its
 * own `kbId` alongside it so duplicate-checking still compares against the rest of that KB.
 * `agentId` with no `editingFaq` creates a brand-new FAQ filed into the creator's personal "Cá
 * nhân" KB and attached to that Agent in the same step (see knowledgeStore.createFaq).
 * Categories and the fuzzy-match side peek only apply when a `kbId` is known (Console FAQs, or
 * editing an already-attached one) — a brand-new Agent-created FAQ has no KB-scoped catalog to
 * compare against yet, so it only gets the lighter exact-match duplicate check. */
export default function AddEditFaqModal({ open, kbId, agentId, editingFaq, onClose }: {
  open: boolean; kbId?: string; agentId?: string; editingFaq?: KnowledgeFaq; onClose: () => void;
}) {
  const isEdit = !!editingFaq;
  const initialQuestion = editingFaq?.question ?? "";
  const initialAnswer = editingFaq?.answer ?? "";
  const initialCategories = editingFaq?.categories ?? [];
  const statusSource = editingFaq;
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState(initialAnswer);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [questionTouched, setQuestionTouched] = useState(false);
  const [answerTouched, setAnswerTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [matches, setMatches] = useState<{ exact: KnowledgeFaq | null; similar: KnowledgeFaq[] }>({ exact: null, similar: [] });
  const [maxCategoriesMsg, setMaxCategoriesMsg] = useState(false);
  const [peekFaq, setPeekFaq] = useState<KnowledgeFaq | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Agent-level duplicate check (only relevant while creating a brand-new FAQ from an Agent's
  // Knowledge screen, which has no KB-scoped catalog yet) is a plain exact-match lookup (no
  // fuzzy scoring needed), so it runs synchronously on every render instead of the debounced
  // effect the kbId path below uses.
  const agentDuplicate = agentId && !isEdit && question.trim().length > 0
    ? knowledgeStore.findFaqDuplicate(agentId, question)
    : false;

  useEffect(() => {
    if (!kbId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = question.trim();
    if (q.length < DUPLICATE_CHECK_MIN_CHARS) { setMatches({ exact: null, similar: [] }); return; }
    debounceRef.current = setTimeout(() => {
      setMatches(knowledgeFaqStore.findMatches(kbId, q, editingFaq?.id));
    }, DUPLICATE_CHECK_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [question, kbId, editingFaq?.id]);

  const questionError = (questionTouched || submitAttempted) && question.trim().length === 0 ? "Vui lòng nhập câu hỏi." : null;
  const answerError = (answerTouched || submitAttempted) && answer.trim().length === 0 ? "Vui lòng nhập câu trả lời." : null;
  const categoryError = categories.length > MAX_CATEGORIES
    ? `Chỉ gắn được tối đa ${MAX_CATEGORIES} danh mục cho một câu hỏi.`
    : categories.some(c => c.length > CATEGORY_MAX)
      ? `Mỗi danh mục tối đa ${CATEGORY_MAX} ký tự.`
      : null;
  const canSubmit = question.trim().length > 0 && answer.trim().length > 0 && !categoryError;

  const isDirty = question.trim() !== initialQuestion.trim()
    || answer.trim() !== initialAnswer.trim()
    || categories.length !== initialCategories.length
    || categories.some(c => !initialCategories.includes(c));

  const requestClose = () => { if (isDirty) setShowDiscardConfirm(true); else onClose(); };

  const runLifecycle = (updateFn: (status: "processing" | "done", chunkCount?: number) => void) => {
    setTimeout(() => updateFn("processing"), 300);
    setTimeout(() => updateFn("done", 1), 1500);
  };

  const submit = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    // Agent-level duplicates block the save behind an explicit confirm — unlike the kbId path
    // below, which only ever shows a non-blocking inline warning.
    if (agentDuplicate && !showDuplicateConfirm) { setShowDuplicateConfirm(true); return; }

    if (isEdit) {
      knowledgeFaqStore.update(editingFaq.id, { question: question.trim(), answer: answer.trim(), categories });
      toast.success("Đã lưu câu hỏi.");
      runLifecycle((status, chunkCount) => knowledgeFaqStore.updateStatus(editingFaq.id, status, chunkCount !== undefined ? { chunkCount } : undefined));
    } else if (agentId) {
      const faq = knowledgeStore.createFaq(agentId, { question: question.trim(), answer: answer.trim(), categories });
      toast.success("Đã lưu câu hỏi.");
      runLifecycle((status, chunkCount) => knowledgeFaqStore.updateStatus(faq.id, status, chunkCount !== undefined ? { chunkCount } : undefined));
    } else {
      const faq = knowledgeFaqStore.create(kbId!, { question: question.trim(), answer: answer.trim(), categories });
      toast.success("Đã lưu câu hỏi.");
      runLifecycle((status, chunkCount) => knowledgeFaqStore.updateStatus(faq.id, status, chunkCount !== undefined ? { chunkCount } : undefined));
    }
    onClose();
  };

  const categoryOptions = kbId ? knowledgeFaqStore.listCategoriesWithCounts(kbId) : agentId ? knowledgeStore.listFaqCategoriesWithCounts(agentId) : [];

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && requestClose()}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Sửa FAQ" : "Tạo FAQ"}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Nhập câu hỏi và câu trả lời để Agent sử dụng khi phản hồi.</p>
          </DialogHeader>
          {statusSource && (statusSource.status === "failed" || statusSource.status === "invalid") && (
            <div className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed ${statusSource.status === "failed" ? "bg-[hsl(var(--destructive-soft))] text-destructive" : "bg-[hsl(var(--warning-soft))] text-warning"}`}>
              <p className="font-semibold">{statusSource.status === "failed" ? "Xử lý thất bại" : "Nội dung chưa hợp lệ"}</p>
              {statusSource.statusReason && <p className="mt-0.5">{statusSource.statusReason}</p>}
              <p className="mt-1 opacity-80">
                {statusSource.status === "failed"
                  ? (agentId ? "Lưu lại rồi dùng \"Xử lý lại\" nếu cần." : "Lưu lại để hệ thống tự động xử lý lại.")
                  : "Hãy chỉnh sửa nội dung phù hợp rồi lưu lại."}
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
              {agentId && agentDuplicate && (
                <div className="mt-1.5 rounded-lg bg-[hsl(var(--warning-soft))] px-3 py-2">
                  <p className="text-xs text-warning leading-relaxed">
                    Câu hỏi này đã tồn tại trong tri thức của Agent.
                  </p>
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

      <AlertDialog open={showDuplicateConfirm} onOpenChange={setShowDuplicateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Câu hỏi này đã tồn tại</AlertDialogTitle>
            <AlertDialogDescription>
              Một câu hỏi khác trong tri thức của Agent đã có nội dung giống hệt. Bạn vẫn muốn {isEdit ? "lưu thay đổi" : "tạo thêm"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDuplicateConfirm(false); submit(); }}>{isEdit ? "Vẫn lưu" : "Tạo thêm"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
