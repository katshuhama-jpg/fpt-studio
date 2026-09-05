import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KnowledgeStatusPill } from "./knowledgeStatus";
import type { KnowledgeFaq } from "./knowledgeFaqStore";

/** Read-only peek at an existing FAQ — opened from the duplicate-detection warning on the
 * Create/Edit FAQ modal so the user can compare wording before deciding to save a near-duplicate
 * anyway. Never editable; closing it returns focus to the modal that opened it. */
export default function FaqSidePeek({ faq, onClose }: { faq: KnowledgeFaq | null; onClose: () => void }) {
  return (
    <Sheet open={!!faq} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[440px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Câu hỏi đã có trong kho</SheetTitle>
        </SheetHeader>
        {faq && (
          <div className="flex-1 overflow-y-auto space-y-4 mt-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Câu hỏi</p>
              <p className="text-sm font-medium leading-relaxed">{faq.question}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Câu trả lời</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
            </div>
            {faq.categories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Danh mục</p>
                <div className="flex flex-wrap gap-1">
                  {faq.categories.map(c => <span key={c} className="chip chip-muted px-1.5 py-0.5">{c}</span>)}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <KnowledgeStatusPill status={faq.status} />
              <span className="text-xs text-muted-foreground">Cập nhật {new Date(faq.updatedAt).toLocaleDateString("vi-VN")} · {faq.updatedBy}</span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
