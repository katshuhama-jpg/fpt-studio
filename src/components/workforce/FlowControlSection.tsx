import type { FlowControl } from "./types";
import Toggle from "./Toggle";

/** Fork/join settings for a routing step - shared by the Agent and Code drawers. */
export default function FlowControlSection({ value, outCount, inCount, onChange }: {
  value: FlowControl;
  outCount: number;
  inCount: number;
  onChange: (patch: FlowControl) => void;
}) {
  return (
    <div className="pt-4 mt-4 border-t border-border">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Luồng chạy</div>
      <Toggle
        checked={value.fanOut === "all"}
        onChange={v => onChange({ fanOut: v ? "all" : "choose" })}
        label="Chạy song song mọi tuyến ra"
      />
      <p className="text-xs text-muted-foreground mt-1.5 mb-3 leading-relaxed">
        {value.fanOut === "all"
          ? `Bật: cả ${outCount} tuyến ra chạy cùng lúc, không chọn một tuyến.`
          : "Tắt: chỉ đi một tuyến - tuyến có điều kiện đúng."}
      </p>
      <Toggle
        checked={!!value.joinAll}
        onChange={v => onChange({ joinAll: v })}
        label="Chờ đủ các nhánh vào"
      />
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
        {value.joinAll
          ? `Bật: chỉ chạy khi cả ${inCount} nhánh vào đã xong, dữ liệu của các nhánh được gộp lại.`
          : "Tắt: chạy ngay khi có một nhánh tới."}
      </p>
    </div>
  );
}
