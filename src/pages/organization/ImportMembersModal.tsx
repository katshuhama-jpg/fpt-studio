import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, ChevronLeft, Download, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { OrgMember, OrgUnit } from "./orgData";
import { RoleDef } from "./rolesStore";
import { deriveNameFromEmail } from "./orgStore";
import { DEFAULT_ROLE_ID } from "./Members";

type ImportRow = {
  rowNumber: number;
  name: string;
  email: string;
  roleLabel: string;
  roleId: string;
  /** Resolved unit to add this member into, and its display name/path for the preview table. */
  unitId: string;
  unitLabel: string;
  status: "valid" | "skipped";
  reason?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Splits plain CSV text into a grid of trimmed cells — good enough for a simple template with no embedded commas/quotes. */
function parseCSV(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(",").map(cell => cell.trim()));
}

/** Full breadcrumb path of a unit's name, root first (e.g. "Ngan hang ABC > Phong CNTT"), used
 * to label the resolved Unit column and to disambiguate same-named units in different branches. */
function unitPathLabel(tree: OrgUnit, targetId: string): string {
  const walk = (node: OrgUnit, trail: string[]): string[] | null => {
    if (node.id === targetId) return [...trail, node.name];
    for (const child of node.units) {
      const found = walk(child, [...trail, node.name]);
      if (found) return found;
    }
    return null;
  };
  return (walk(tree, []) ?? [tree.name]).join(" > ");
}

/** First unit anywhere in the tree whose name matches exactly (case-insensitive). */
function findUnitByName(tree: OrgUnit, name: string): OrgUnit | null {
  if (tree.name.toLowerCase() === name.toLowerCase()) return tree;
  for (const child of tree.units) {
    const found = findUnitByName(child, name);
    if (found) return found;
  }
  return null;
}

/** Walks a "/"-separated path of unit names, relative to the tree's root (root's own name is
 * not repeated as the first segment) — for disambiguating units that share a name elsewhere. */
function findUnitByPath(tree: OrgUnit, segments: string[]): OrgUnit | null {
  let current = tree;
  for (const seg of segments) {
    const next = current.units.find(u => u.name.toLowerCase() === seg.toLowerCase());
    if (!next) return null;
    current = next;
  }
  return current;
}

/** Resolves a CSV row's "Unit" cell against the org tree — blank cell falls back to
 * `fallbackUnitId`. Accepts either a bare unit name ("Phong Kinh doanh") matched anywhere in
 * the tree, or a "/"-separated path from the root ("Phong Kinh doanh/Team Sales mien Bac") to
 * disambiguate when two units share a name in different branches. */
function resolveUnitCell(tree: OrgUnit, raw: string, fallbackUnitId: string): OrgUnit | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    const walk = (node: OrgUnit): OrgUnit | null => {
      if (node.id === fallbackUnitId) return node;
      for (const child of node.units) {
        const found = walk(child);
        if (found) return found;
      }
      return null;
    };
    return walk(tree);
  }
  if (trimmed.includes("/")) {
    const segments = trimmed.split("/").map(s => s.trim()).filter(Boolean);
    return findUnitByPath(tree, segments);
  }
  return findUnitByName(tree, trimmed);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadSampleTemplate() {
  const csv = [
    "Name,Email,Role,Unit",
    "Mai Hoang,mai.hoang@fpt.com,Builder,Phong Kinh doanh",
    ",khanh.nguyen@fpt.com,Viewer,Phong Kinh doanh/Team Sales mien Bac",
    "An Tran,an.tran@fpt.com,Viewer,",
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "member-import-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ImportMembersModal({
  roles, existingMembers, tree, defaultUnitId, onClose, onConfirm,
}: {
  roles: RoleDef[];
  existingMembers: OrgMember[];
  /** Org tree the "Unit" column is resolved against. */
  tree: OrgUnit;
  /** Unit a row is added to when its Unit cell is left blank. */
  defaultUnitId: string;
  onClose: () => void;
  onConfirm: (rows: { name: string; email: string; roleId: string; unitId: string }[]) => void;
}) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [dragActive, setDragActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [imported, setImported] = useState<ImportRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const resetToUpload = () => {
    setStep("upload");
    setParseError(null);
    setFileInfo(null);
    setRows([]);
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    setIsParsing(true);
    setFileInfo({ name: file.name, size: file.size });
    try {
      const text = await file.text();
      const table = parseCSV(text);
      if (table.length < 2) throw new Error("empty");
      const headers = table[0].map(h => h.toLowerCase());
      const nameIdx = headers.indexOf("name");
      const emailIdx = headers.indexOf("email");
      const roleIdx = headers.indexOf("role");
      const unitIdx = headers.indexOf("unit");
      if (emailIdx === -1) throw new Error("no-email-column");

      const existingEmails = new Set(existingMembers.map(m => m.email?.trim().toLowerCase()).filter(Boolean));
      const seenInFile = new Set<string>();

      const builtRows: ImportRow[] = table.slice(1).map((cells, i) => {
        const emailRaw = (cells[emailIdx] ?? "").trim();
        const nameRaw = nameIdx !== -1 ? (cells[nameIdx] ?? "").trim() : "";
        const roleRaw = roleIdx !== -1 ? (cells[roleIdx] ?? "").trim() : "";
        const unitRaw = unitIdx !== -1 ? (cells[unitIdx] ?? "").trim() : "";
        const name = nameRaw || (EMAIL_RE.test(emailRaw) ? deriveNameFromEmail(emailRaw) : "");
        const roleMatch = roles.find(r => r.name.toLowerCase() === roleRaw.toLowerCase());
        const roleId = roleMatch?.id ?? DEFAULT_ROLE_ID;
        const roleLabel = roleMatch ? roleMatch.name : roleRaw ? `${roleRaw} → Viewer` : "Viewer (default)";
        const resolvedUnit = resolveUnitCell(tree, unitRaw, defaultUnitId);
        const unitId = resolvedUnit?.id ?? defaultUnitId;
        const unitLabel = resolvedUnit ? unitPathLabel(tree, resolvedUnit.id) : unitRaw;

        let status: "valid" | "skipped" = "valid";
        let reason: string | undefined;
        const emailLower = emailRaw.toLowerCase();
        if (!emailRaw) { status = "skipped"; reason = "Missing email"; }
        else if (!EMAIL_RE.test(emailRaw)) { status = "skipped"; reason = "Invalid email format"; }
        else if (seenInFile.has(emailLower)) { status = "skipped"; reason = "Duplicate email in this file"; }
        else if (existingEmails.has(emailLower)) { status = "skipped"; reason = "Already an org member"; }
        else if (unitRaw && !resolvedUnit) { status = "skipped"; reason = `Unit not found: "${unitRaw}"`; }
        if (status === "valid") seenInFile.add(emailLower);

        return { rowNumber: i + 1, name, email: emailRaw, roleLabel, roleId, unitId, unitLabel, status, reason };
      });

      setRows(builtRows);
      setStep("preview");
    } catch {
      setParseError("Couldn't read this file. Make sure it's a .csv file with Name, Email, Role, and Unit columns — Email is required.");
    } finally {
      setIsParsing(false);
    }
  };

  const validRows = rows.filter(r => r.status === "valid");
  const skippedRows = rows.filter(r => r.status === "skipped");

  const submit = () => {
    if (validRows.length === 0) return;
    onConfirm(validRows.map(r => ({ name: r.name, email: r.email, roleId: r.roleId, unitId: r.unitId })));
    setImported(validRows);
    setStep("done");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-[92vw] sm:w-1/2 min-w-[50vw] max-w-[1100px] bg-white rounded-2xl flex flex-col shadow-2xl max-h-[85vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">Import members from Excel</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === "upload" && "Upload a spreadsheet to add many members at once."}
              {step === "preview" && "Review what was found before importing."}
              {step === "done" && "Import complete."}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === "upload" && (
            <>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Download size={12} /> Download sample template
              </button>

              <div
                role="button"
                tabIndex={0}
                aria-label="Upload member import file"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                onDragOver={e => { e.preventDefault(); if (!isParsing) setDragActive(true); }}
                onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
                onDrop={e => {
                  e.preventDefault();
                  setDragActive(false);
                  if (isParsing) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
                className={`min-h-[160px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer ${
                  isParsing ? "opacity-60 pointer-events-none" : ""
                } ${dragActive ? "border-primary bg-primary-soft" : "border-border bg-surface-muted hover:bg-surface-muted/70"}`}
              >
                {isParsing ? (
                  <>
                    <Loader2 size={22} className="animate-spin text-primary" />
                    <div className="text-sm font-medium">Reading {fileInfo?.name}…</div>
                  </>
                ) : (
                  <>
                    <UploadCloud size={28} className="text-muted-foreground" />
                    <div className="text-sm font-medium">Drag and drop your file here</div>
                    <div className="text-xs text-muted-foreground">.csv file exported from Excel — expects Name, Email, Role, Unit columns</div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="btn-secondary mt-1"
                    >
                      Browse files
                    </button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {fileInfo && !isParsing && (
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3">
                  <FileText size={16} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-medium text-foreground truncate">{fileInfo.name}</div>
                    <div className="text-muted-foreground">{formatBytes(fileInfo.size)}</div>
                  </div>
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3">
                  <AlertTriangle size={15} className="text-destructive shrink-0 mt-0.5" />
                  <div className="text-xs text-destructive leading-relaxed">{parseError}</div>
                </div>
              )}
            </>
          )}

          {step === "preview" && (
            <>
              <button
                type="button"
                onClick={resetToUpload}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-base"
              >
                <ChevronLeft size={12} /> Choose a different file
              </button>

              {fileInfo && (
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3">
                  <FileText size={16} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-medium text-foreground truncate">{fileInfo.name}</div>
                    <div className="text-muted-foreground">{formatBytes(fileInfo.size)} · {rows.length} row{rows.length === 1 ? "" : "s"} found</div>
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{validRows.length}</span> will be imported
                {skippedRows.length > 0 && <> · <span className="text-foreground font-medium">{skippedRows.length}</span> will be skipped</>}
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr,1fr,1fr,110px,150px] gap-3 px-4 py-2.5 bg-surface-muted section-eyebrow">
                  <div>Name</div><div>Email</div><div>Unit</div><div>Role</div><div>Status</div>
                </div>
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                  {rows.map(r => (
                    <div key={r.rowNumber} className="grid grid-cols-[1fr,1fr,1fr,110px,150px] gap-3 px-4 py-2.5 items-center text-sm">
                      <div className="truncate">{r.name || <span className="text-muted-foreground italic">—</span>}</div>
                      <div className="truncate text-muted-foreground">{r.email || <span className="italic">—</span>}</div>
                      <div className="truncate text-xs text-muted-foreground" title={r.unitLabel}>{r.unitLabel}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.roleLabel}</div>
                      <div>
                        {r.status === "valid" ? (
                          <span className="chip chip-success text-[11px]"><Check size={11} /> Valid</span>
                        ) : (
                          <span className="chip chip-warning text-[11px]" title={r.reason}>{r.reason}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === "done" && (
            <>
              <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 px-3.5 py-3">
                <Check size={15} className="text-success shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  Imported <span className="font-medium">{imported.length}</span> member{imported.length === 1 ? "" : "s"}
                  {skippedRows.length > 0 && <> — {skippedRows.length} row{skippedRows.length === 1 ? "" : "s"} skipped.</>}
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr,1fr,1fr,120px] gap-3 px-4 py-2.5 bg-surface-muted section-eyebrow">
                  <div>Name</div><div>Email</div><div>Unit</div><div>Role</div>
                </div>
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                  {imported.map(r => (
                    <div key={r.rowNumber} className="grid grid-cols-[1fr,1fr,1fr,120px] gap-3 px-4 py-2.5 items-center text-sm">
                      <div className="truncate">{r.name}</div>
                      <div className="truncate text-muted-foreground">{r.email}</div>
                      <div className="truncate text-xs text-muted-foreground" title={r.unitLabel}>{r.unitLabel}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.roleLabel}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          {step === "preview" ? (
            <>
              <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={validRows.length === 0}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Import {validRows.length} member{validRows.length === 1 ? "" : "s"}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
              Close
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}
