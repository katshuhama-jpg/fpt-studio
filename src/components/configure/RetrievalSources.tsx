/** Nguồn truy xuất kèm câu trả lời: số trích dẫn trong câu và khối "Nguồn" bên dưới
 * (tên tài liệu + đoạn trích). Dùng chung cho Test run và Lịch sử. */
export interface RetrievalSource {
  title: string;
  excerpt: string;
}

export function CitationMark({ n }: { n: number }) {
  return (
    <sup className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-primary/10 px-1 text-[10px] font-medium text-primary tabular-nums">
      {n}
    </sup>
  );
}

export function SourcesBlock({ sources, note }: { sources: RetrievalSource[]; note?: string }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-2 rounded-md border border-border bg-card p-2.5 text-card-foreground">
      <p className="text-xs font-medium mb-1.5">Nguồn</p>
      <ol className="space-y-1.5">
        {sources.map((s, i) => (
          <li key={i} className="flex gap-2 text-xs">
            <span className="shrink-0 text-primary font-medium tabular-nums">{i + 1}</span>
            <span className="min-w-0">
              <span className="block font-medium truncate">{s.title}</span>
              <span className="block text-muted-foreground leading-relaxed">“{s.excerpt}”</span>
            </span>
          </li>
        ))}
      </ol>
      {note && <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}

/** Mock tài liệu mà Test run "truy xuất" được, theo từng Nhân sự số mẫu. */
const MOCK_SOURCES: Record<string, RetrievalSource> = {
  faq: { title: "Chính sách bảo hành sản phẩm 2026.pdf", excerpt: "Sản phẩm được bảo hành 12 tháng kể từ ngày mua; đổi trả trong 7 ngày nếu lỗi do nhà sản xuất." },
  hr: { title: "Quy chế nghỉ phép nhân viên.docx", excerpt: "Nhân viên chính thức có 12 ngày phép năm, cộng thêm 1 ngày cho mỗi 5 năm làm việc." },
};
export const mockSourceFor = (agentId: string): RetrievalSource =>
  MOCK_SOURCES[agentId] ?? { title: "Tài liệu hướng dẫn nội bộ.pdf", excerpt: "Thông tin được trích từ tài liệu Tri thức đã gắn cho Nhân sự số." };
