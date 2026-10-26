import { useState } from "react";
import { toast } from "sonner";
import { PlayIcon, MoreHorizontalIcon, Copy01Icon, FolderTransferIcon, Delete02Icon, Loading03Icon, FileAttachmentIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSpaceActor } from "@/components/governance/spaceDelete";
import { testStore, type Suite, type TestCase } from "./testSuiteStore";
import { Icon, VerdictBadge, useTestNav } from "./parts";

const question = (c: TestCase) => (c.kind === "qna" ? c.question : c.turns[0]?.question ?? "");
const expected = (c: TestCase) => (c.kind === "qna" ? c.expected : c.turns[0]?.expected ?? "");

function MoveDialog({ suite, ids, onClose, onMoved }: { suite: Suite; ids: string[]; onClose: () => void; onMoved: () => void }) {
  const targets = testStore.suites(suite.agentId).filter(s => s.id !== suite.id);
  const [to, setTo] = useState(targets[0]?.id ?? "");
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Chuyển {ids.length} testcase sang Test Suite khác</DialogTitle>
          <DialogDescription>Testcase sẽ rời khỏi "{suite.name}". Kết quả các lần chạy trước vẫn giữ ở lịch sử.</DialogDescription>
        </DialogHeader>
        {targets.length ? (
          <div>
            <label className="text-sm font-medium" htmlFor="move-to">Test Suite đích</label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger id="move-to" className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{targets.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ) : <p className="rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">Agent chưa có Test Suite nào khác. Tạo Test Suite mới trước khi chuyển.</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
          <Button type="button" disabled={!to} onClick={() => {
            testStore.moveCases(suite.id, ids, to);
            toast.success(`Đã chuyển ${ids.length} testcase sang "${testStore.suite(to)?.name}".`);
            onMoved(); onClose();
          }}>Chuyển</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Màn 2 table: check · Câu hỏi · Câu trả lời mong muốn · Topic · Nguồn tài liệu · Run · Action. */
export default function CasesTable({ suite, readOnly, onOpen }: { suite: Suite; readOnly?: boolean; onOpen: (id: string) => void }) {
  const actor = useSpaceActor();
  const { go } = useTestNav();
  const [selected, setSelected] = useState<string[]>([]);
  const [moving, setMoving] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState<string[] | null>(null);
  const sel = selected.filter(id => suite.cases.some(c => c.id === id));
  const all = sel.length === suite.cases.length && sel.length > 0;
  const toggle = (id: string, on: boolean) => setSelected(s => (on ? [...s, id] : s.filter(x => x !== id)));

  const run = (ids: string[]) => {
    const r = testStore.startRun(suite.id, actor.name, false, ids);
    if (!r) return;
    toast.success(ids.length === 1 ? "Đang chạy testcase…" : `Đang chạy ${ids.length} testcase…`, { action: { label: "Xem tiến trình", onClick: () => go("runs", { item: r.id }) } });
  };

  return (
    <>
      {sel.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium tabular-nums">Đã chọn {sel.length}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => { run(sel); setSelected([]); }}><Icon icon={PlayIcon} /> Chạy</Button>
          {!readOnly && <Button type="button" variant="outline" size="sm" onClick={() => setMoving(sel)}><Icon icon={FolderTransferIcon} /> Chuyển đến Test Suite</Button>}
          {!readOnly && <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(sel)}><Icon icon={Delete02Icon} /> Xoá</Button>}
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected([])}><Icon icon={Cancel01Icon} /> Bỏ chọn</Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-10 px-3 py-2.5">
                <Checkbox checked={all ? true : sel.length ? "indeterminate" : false} onCheckedChange={v => setSelected(v ? suite.cases.map(c => c.id) : [])} aria-label="Chọn tất cả testcase" />
              </th>
              <th scope="col" className="px-3 py-2.5 text-left font-medium">Câu hỏi</th>
              <th scope="col" className="px-3 py-2.5 text-left font-medium">Câu trả lời mong muốn</th>
              <th scope="col" className="w-32 px-3 py-2.5 text-left font-medium">Topic</th>
              <th scope="col" className="w-40 px-3 py-2.5 text-left font-medium">Nguồn tài liệu</th>
              <th scope="col" className="w-28 px-3 py-2.5 text-left font-medium">Run</th>
              <th scope="col" className="w-12 px-2 py-2.5"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {suite.cases.map(c => {
              const on = sel.includes(c.id);
              const running = testStore.caseRunning(suite.id, c.id);
              return (
                <tr key={c.id} className={`cursor-pointer align-top hover:bg-muted/30 ${on ? "bg-primary/5" : ""}`}
                  onClick={e => { if (!(e.target as HTMLElement).closest("button,[role=checkbox],[role=menuitem]")) onOpen(c.id); }}>
                  <td className="px-3 py-3"><Checkbox checked={on} onCheckedChange={v => toggle(c.id, !!v)} aria-label={`Chọn testcase: ${question(c)}`} /></td>
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => onOpen(c.id)} className="line-clamp-2 text-left font-medium hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{question(c)}</button>
                    {c.kind === "scenario" && <span className="mt-1 inline-flex rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium">Kịch bản · {c.turns.length} lượt{c.name ? ` · ${c.name}` : ""}</span>}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground"><p className="line-clamp-2">{expected(c)}</p></td>
                  <td className="px-3 py-3">{c.topic || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-3">
                    {c.reference
                      ? <span className="inline-flex max-w-[150px] items-center gap-1" title={c.reference}><Icon icon={FileAttachmentIcon} size={14} className="shrink-0 text-muted-foreground" /><span className="truncate">{c.reference}</span></span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={running} aria-label={running ? "Đang chạy testcase" : "Run testcase"} onClick={() => run([c.id])}>
                            <Icon icon={running ? Loading03Icon : PlayIcon} size={14} className={running ? "animate-spin" : ""} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{running ? "Đang chạy…" : "Run testcase"}</TooltipContent>
                      </Tooltip>
                      {!running && <VerdictBadge v={testStore.lastVerdict(suite.id, c.id)} />}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right">
                    {!readOnly && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Action cho testcase: ${question(c)}`}><Icon icon={MoreHorizontalIcon} /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onSelect={() => { testStore.duplicateCase(suite.id, c.id); toast.success("Đã nhân bản testcase."); }}><Icon icon={Copy01Icon} /> Duplicate</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setMoving([c.id])}><Icon icon={FolderTransferIcon} /> Move to Test Suite</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting([c.id])}><Icon icon={Delete02Icon} /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {moving && <MoveDialog suite={suite} ids={moving} onClose={() => setMoving(null)} onMoved={() => setSelected(s => s.filter(id => !moving.includes(id)))} />}
      <AlertDialog open={!!deleting} onOpenChange={o => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá {deleting?.length === 1 ? "testcase này" : `${deleting?.length} testcase`}?</AlertDialogTitle>
            <AlertDialogDescription>Testcase sẽ bị xoá khỏi "{suite.name}". Kết quả ở các lần chạy trước vẫn được giữ.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (deleting) { testStore.removeCases(suite.id, deleting); toast.success(`Đã xoá ${deleting.length} testcase.`); setSelected(s => s.filter(id => !deleting.includes(id))); }
              setDeleting(null);
            }}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
