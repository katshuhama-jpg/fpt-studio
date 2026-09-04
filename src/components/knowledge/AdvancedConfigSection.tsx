import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Check } from "lucide-react";
import ChipsInput, { type Chip } from "./ChipsInput";

export interface AdvancedConfig {
  titleXpath: string;
  contentXpaths: Chip[];
  ignoreTags: string[];
  ignoreElementXpaths: Chip[];
  captureImageCaptions: boolean;
}

export function defaultAdvancedConfig(): AdvancedConfig {
  return { titleXpath: "", contentXpaths: [], ignoreTags: ["header", "footer", "nav"], ignoreElementXpaths: [], captureImageCaptions: true };
}

const IGNORE_TAG_OPTIONS = ["header", "footer", "nav", "img", "link", "meta", "noscript", "script", "style"];

function FieldLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="text-muted-foreground outline-none"><Info size={12} /></span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px]">{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Shared "Cấu hình nâng cao" accordion — identical across all three Add URL modal tabs. */
export default function AdvancedConfigSection({ value, onChange }: { value: AdvancedConfig; onChange: (next: AdvancedConfig) => void }) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="advanced" className="border border-border rounded-lg px-3">
        <AccordionTrigger className="text-sm font-medium hover:no-underline py-2.5">Cấu hình nâng cao</AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          <div>
            <FieldLabel label="Main title xpath" tooltip="Chỉ lấy phần tiêu đề trong vùng bạn chỉ định thay vì đoán tự động. Để trống nếu không chắc." />
            <input
              value={value.titleXpath}
              onChange={e => onChange({ ...value, titleXpath: e.target.value })}
              placeholder="//h1"
              className="w-full h-9 px-2.5 rounded-lg border border-border bg-white text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
            />
          </div>
          <div>
            <FieldLabel label="Main content xpath" tooltip="Chỉ lấy nội dung trong vùng bạn chỉ định, bỏ qua menu và quảng cáo. Để trống nếu không chắc." />
            <ChipsInput chips={value.contentXpaths} onChange={c => onChange({ ...value, contentXpaths: c })} placeholder="//article" />
          </div>
          <div>
            <FieldLabel label="Ignore HTML tags" tooltip="Các thẻ HTML sẽ bị bỏ qua khi thu thập nội dung." />
            <div className="flex flex-wrap gap-1.5">
              {IGNORE_TAG_OPTIONS.map(tag => {
                const active = value.ignoreTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onChange({ ...value, ignoreTags: active ? value.ignoreTags.filter(t => t !== tag) : [...value.ignoreTags, tag] })}
                    className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-xs font-mono border transition-base ${active ? "bg-primary-soft text-primary border-primary/20" : "bg-surface border-border text-muted-foreground hover:bg-surface-muted"}`}
                  >
                    {active && <Check size={10} />} {tag}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <FieldLabel label="Ignore element xpath" tooltip="Các phần tử theo xpath này sẽ bị loại khỏi nội dung thu thập." />
            <ChipsInput chips={value.ignoreElementXpaths} onChange={c => onChange({ ...value, ignoreElementXpaths: c })} />
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={value.captureImageCaptions} onChange={e => onChange({ ...value, captureImageCaptions: e.target.checked })} className="w-4 h-4 accent-primary mt-0.5 shrink-0" />
            <div>
              <span className="text-sm font-medium">Bật chú thích hình ảnh</span>
              <p className="text-xs text-muted-foreground mt-0.5">Trích xuất phần chú thích đi kèm hình ảnh vào nội dung chunk.</p>
            </div>
          </label>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
