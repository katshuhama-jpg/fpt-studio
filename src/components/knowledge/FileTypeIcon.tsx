import { FileText, FileType2, FileSpreadsheet, Presentation, AlignLeft, Folder, Globe, HelpCircle } from "lucide-react";

export type FileKind = "pdf" | "doc" | "sheet" | "slide" | "text" | "folder" | "url" | "faq" | "unknown";

const EXT_KIND: Record<string, FileKind> = {
  pdf: "pdf",
  doc: "doc", docx: "doc",
  xls: "sheet", xlsx: "sheet", csv: "sheet",
  ppt: "slide", pptx: "slide",
  txt: "text", md: "text",
};

export function kindForName(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_KIND[ext] ?? "unknown";
}

const KIND_META: Record<FileKind, { Icon: typeof FileText; className: string }> = {
  pdf: { Icon: FileText, className: "text-red-600" },
  doc: { Icon: FileType2, className: "text-blue-600" },
  sheet: { Icon: FileSpreadsheet, className: "text-green-600" },
  slide: { Icon: Presentation, className: "text-orange-600" },
  text: { Icon: AlignLeft, className: "text-muted-foreground" },
  folder: { Icon: Folder, className: "text-amber-600" },
  url: { Icon: Globe, className: "text-muted-foreground" },
  faq: { Icon: HelpCircle, className: "text-purple-600" },
  unknown: { Icon: FileText, className: "text-muted-foreground" },
};

/** Shared per-type file icon — same glyph+colour pairing everywhere a source is listed
 * (Documents/Website tables, the document viewer top bar, the upload modal's staged-file list,
 * Agent-level knowledge tables) so one file type looks the same across the whole feature.
 * Pass either `kind` directly (folder/url/faq have no filename extension to infer from) or
 * `name` to auto-detect from the file extension. */
export default function FileTypeIcon({ kind, name, size = 15, className }: { kind?: FileKind; name?: string; size?: number; className?: string }) {
  const resolved = kind ?? (name ? kindForName(name) : "unknown");
  const { Icon, className: colorClass } = KIND_META[resolved];
  return <Icon size={size} aria-hidden="true" className={`${colorClass} shrink-0 ${className ?? ""}`} />;
}
