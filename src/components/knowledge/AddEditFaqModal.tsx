import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { knowledgeFaqStore, type KnowledgeFaq } from "./knowledgeFaqStore";
import { knowledgeStore, type KnowledgeItem } from "./knowledgeStore";
import CategoryChipsInput from "./CategoryChipsInput";
import FaqSidePeek from "./FaqSidePeek";
import MemberPicker from "./MemberPicker";
import { CURRENT_USER, type SharingMode, type SharedPerson } from "./knowledgeBaseStore";

const QUESTION_MAX = 500;
const ANSWER_MAX = 5000;
const MAX_CATEGORIES = 10;
const CATEGORY_MAX = 30;
const DUPLICATE_CHECK_MIN_CHARS = 8;
const DUPLICATE_CHECK_DEBOUNCE_MS = 500;

const ACCESS_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng Console", helper: "Mọi thành viên Console đều xem và dùng được FAQ này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

/** Pass either kbId (Console FAQ tab) or agentId (Agent Knowledge "Câu hỏi thường gặp" tile).
 * Categories, duplicate detection, and the side peek only apply to Console FAQs — Agent
 * Knowledge items don't have a kbId-scoped catalog to compare against.
 * `editingFaq` edits a Console KB FAQ (kbId); `editingItem` edits an Agent-level FAQ
 * KnowledgeItem (agentId) — its question/answer live in the generic name/description fields
 * shared with doc/url items. Pass at most one of the two. */
export default function AddEditFaqModal({ open, kbId, agentId, editingFaq, editingItem, onClose }: {
  open: boolean; kbId?: string; agentId?: string; editingFaq?: KnowledgeFaq; editingItem?: KnowledgeItem; onClose: () => void;
}) {
  const isEdit = !!editingFaq || !!editingItem;
  const initialQuestion = editingFaq?.question ?? editingItem?.name ?? "";
  const initialAnswer = editingFaq?.answer ?? editingItem?.description ?? "";
  const initialCategories = editingFaq?.categories ?? editingItem?.categories ?? [];
  const statusSource = editingFaq ?? editingItem;
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
  // Only asked at creation (edit-time sharing changes go through the row-level "Chia sẻ"
  // action instead, same split as UploadDocumentsModal).
  const [accessMode, setAccessMode] = useState<SharingMode>("private");
  const [accessPeople, setAccessPeople] = useState<SharedPerson[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Agent-level duplicate check is a plain exact-match lookup (no fuzzy scoring needed), so it
  // runs synchronously on every render instead of the debounced effect the Console path uses.
  const agentDuplicate = agentId && question.trim().length > 0
    ? knowledgeStore.findFaqDuplicate(agentId, question, editingItem?.id)
    : false;

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
  const accessInvalid = !isEdit && accessMode === "specific" && accessPeople.length === 0;
  const canSubmit = question.trim().length > 0 && answer.trim().length > 0 && !categoryError && !accessInvalid;

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
    // Agent-level duplicates block the save behind an explicit confirm — unlike the Console
    // path below, which only ever shows a non-blocking inline warning.
    if (agentId && agentDuplicate && !showDuplicateConfirm) { setShowDuplicateConfirm(true); return; }

    const sharing = accessMode === "private" ? undefined : { mode: accessMode, people: accessMode === "specific" ? accessPeople : [] };

    if (agentId) {
      if (editingItem) {
        // Editing content isn't a reprocess — Trạng thái stays exactly as it was.
        knowledgeStore.update(agentId, editingItem.id, { name: question.trim(), description: answer.trim(), categories });
        toast.success("Đã lưu câu hỏi.");
      } else if (!isEdit) {
        const item = knowledgeStore.add(agentId, { name: question.trim(), kind: "faq", description: answer.trim(), categories, sharing });
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
      const faq = knowledgeFaqStore.create(kbId!, { question: question.trim(), answer: answer.trim(), categories, sharing });
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
            {!isEdit && (
              <div>
                <label className="text-sm font-medium mb-2 block">Ai có quyền truy cập</label>
                <div className="space-y-2">
                  {ACCESS_OPTIONS.map(opt => {
                    const selected = accessMode === opt.value;
                    return (
                      <div key={opt.value}>
                        <div
                          onClick={() => setAccessMode(opt.value)}
                          className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-base ${
                            selected ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selected ? "border-primary" : "border-border"}`}>
                            {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{opt.label}</div>
                            {opt.helper && <div className="text-xs text-muted-foreground mt-0.5">{opt.helper}</div>}
                          </div>
                        </div>
                        {selected && opt.value === "specific" && (
                          <div className="mt-2 pl-3.5">
                            <MemberPicker value={accessPeople} onChange={setAccessPeople} ownerRow={{ name: CURRENT_USER.name, email: CURRENT_USER.email }} />
                            {accessPeople.length === 0 && (
                              <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người để chia sẻ.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
