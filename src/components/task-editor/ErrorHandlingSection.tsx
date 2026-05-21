import { AlertTriangle } from "lucide-react";
import type { BlockSpec } from "./blockCatalog";

interface Props {
  spec: BlockSpec;
  cfg: Record<string, any>;
  set: (patch: Record<string, any>) => void;
}

export default function ErrorHandlingSection({ spec, cfg, set }: Props) {
  if (!spec.supportsErrorHandling) return null;
  const mode = cfg.errorMode || "stop";
  const retryOn = !!cfg.retryOn;

  return (
    <section className="mt-5 pt-4 border-t border-border">
      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <AlertTriangle size={11} /> Error handling
      </div>

      <label className="block text-xs font-medium mb-1">On failure</label>
      <select
        value={mode}
        onChange={e => set({ errorMode: e.target.value })}
        className="w-full h-9 px-2 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary"
      >
        <option value="stop">Stop Workflow (default)</option>
        <option value="continue">Continue with Error</option>
        <option value="fallback">Continue with Fallback</option>
        <option value="branch">Continue in Error Branch</option>
      </select>

      {mode === "fallback" && (
        <div className="mt-2">
          <label className="block text-xs font-medium mb-1">Fallback value</label>
          <input
            value={cfg.fallbackValue || ""}
            onChange={e => set({ fallbackValue: e.target.value })}
            placeholder="e.g. {} or empty string"
            className="w-full h-9 px-2 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary"
          />
        </div>
      )}

      {mode === "branch" && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          An <span className="font-mono text-warning">error</span> handle will appear on the node — wire it to a fail-path.
        </p>
      )}

      {spec.supportsRetry && (
        <div className="mt-4">
          <label className="flex items-center justify-between text-xs font-medium">
            Retry on failure
            <input
              type="checkbox"
              checked={retryOn}
              onChange={e => set({ retryOn: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
          </label>
          {retryOn && (
            <div className="mt-2 space-y-3">
              <RangeRow label="Max retries" min={1} max={5} step={1}
                value={cfg.maxRetries ?? 3} onChange={v => set({ maxRetries: v })} />
              <RangeRow label="Retry interval (ms)" min={100} max={5000} step={100}
                value={cfg.retryInterval ?? 1000} onChange={v => set({ retryInterval: v })} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function RangeRow({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs">{label}</span>
        <input
          type="number" min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-20 h-7 px-2 rounded-md border border-border bg-surface text-xs text-right outline-none focus:border-primary"
        />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
