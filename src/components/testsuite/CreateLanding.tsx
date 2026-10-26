import { useRef, useState } from "react";
import { CheckmarkSquare02Icon, Attachment01Icon, SentIcon, PencilEdit01Icon, FileUploadIcon, Cancel01Icon, FileAttachmentIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { testStore, nextSuiteName, setPendingPrompt, type Suite } from "./testSuiteStore";
import { Crumbs, Icon, useTestNav } from "./parts";
import type { Count } from "./AiGenerate";

/** Hero shown where testcases start: prompt for AI, or Nhập tay / Upload file có sẵn.
 * Without a suite (first run on the Agent) it creates "Test Suite mới" on the first action. */
export function CreateHero({ agentId, suite, title }: { agentId: string; suite?: Suite; title?: string }) {
  const { go } = useTestNav();
  const [text, setText] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [count, setCount] = useState<Count>("auto");
  const fileRef = useRef<HTMLInputElement>(null);
  const target = () => suite ?? testStore.createSuite(agentId, nextSuiteName(agentId), "");
  const start = () => {
    if (!text.trim() && !file) return;
    const s = target();
    setPendingPrompt(s.id, { text: text.trim(), file, count });
    go("test-sets", { item: s.id, view: "ai" });
  };
  const open = (view: "manual" | "upload") => go("test-sets", { item: target().id, view });

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center px-6 py-14 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon icon={CheckmarkSquare02Icon} size={24} /></div>
      <h1 className="text-2xl font-semibold tracking-tight">{title ?? "Tạo bộ testcase đầu tiên"}</h1>
      <p className="mt-2 max-w-[520px] text-sm text-muted-foreground">Mô tả điều bạn muốn kiểm thử, hoặc đính kèm tài liệu như SRS, BRD. AI sẽ đề xuất testcase để bạn tinh chỉnh trước khi lưu.</p>

      <div className="mt-7 w-full rounded-xl border bg-card text-left shadow-sm focus-within:ring-[3px] focus-within:ring-ring/50">
        {file && (
          <div className="mx-4 mt-3 flex w-fit items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs">
            <Icon icon={FileAttachmentIcon} size={12} />{file}
            <button type="button" aria-label="Bỏ tệp đính kèm" onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground"><Icon icon={Cancel01Icon} size={12} /></button>
          </div>
        )}
        <Textarea autoFocus rows={3} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); start(); } }}
          placeholder="Mô tả testcase bạn cần, hoặc đính kèm tài liệu (SRS, BRD)..." aria-label="Mô tả testcase cần tạo"
          className="min-h-[88px] resize-none border-0 px-4 pt-3 shadow-none focus-visible:ring-0" />
        <div className="flex items-center gap-2 border-t px-3 py-2.5">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Đính kèm tài liệu" onClick={() => fileRef.current?.click()}><Icon icon={Attachment01Icon} /></Button>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.md,.xlsx" aria-label="Chọn tài liệu" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f.name); e.target.value = ""; }} />
          <Select value={count} onValueChange={v => setCount(v as Count)}>
            <SelectTrigger className="h-8 w-auto gap-1 text-xs" aria-label="Số lượng testcase"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Số lượng: Tự động</SelectItem>
              <SelectItem value="5">Số lượng: 5</SelectItem>
              <SelectItem value="10">Số lượng: 10</SelectItem>
              <SelectItem value="20">Số lượng: 20</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="icon" className="ml-auto h-8 w-8" aria-label="Tạo bằng AI" disabled={!text.trim() && !file} onClick={start}><Icon icon={SentIcon} /></Button>
        </div>
      </div>

      <div className="my-6 flex w-full items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />hoặc<span className="h-px flex-1 bg-border" /></div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" variant="outline" onClick={() => open("manual")}><Icon icon={PencilEdit01Icon} /> Nhập tay</Button>
        <Button type="button" variant="outline" onClick={() => open("upload")}><Icon icon={FileUploadIcon} /> Upload file có sẵn</Button>
      </div>
      <p className="mt-8 max-w-[520px] text-xs text-muted-foreground">Bạn vẫn có thể nhờ AI chỉnh sửa bất cứ lúc nào sau này bằng nút <span className="font-semibold">Refine with AI</span>, dù testcase được tạo bằng cách nào.</p>
    </div>
  );
}

/** Full-screen "+ Thêm testcase" (view=new) for a suite that already has testcases. */
export default function CreateLanding({ agentId, suite }: { agentId: string; suite: Suite }) {
  const { go } = useTestNav();
  const back = () => go("test-sets", { item: suite.id });
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Crumbs onBack={back} items={[{ label: "Test Suites", onClick: () => go("test-sets") }, { label: suite.name, onClick: back }, { label: "Thêm testcase" }]} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto"><CreateHero agentId={agentId} suite={suite} title="Thêm testcase" /></div>
    </div>
  );
}

/** Full-screen "+ Tạo Test Suite" (view=new, no suite yet) — the suite is created on the first action. */
export function CreateSuitePage({ agentId }: { agentId: string }) {
  const { go } = useTestNav();
  const back = () => go("test-sets");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Crumbs onBack={back} items={[{ label: "Test Suites", onClick: back }, { label: "Tạo Test Suite" }]} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto"><CreateHero agentId={agentId} title="Tạo bộ testcase mới" /></div>
    </div>
  );
}
