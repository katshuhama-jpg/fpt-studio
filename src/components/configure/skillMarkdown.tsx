import type { ReactNode } from "react";

function inlineRender(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="bg-surface-muted border border-border rounded px-1 py-px text-xs font-mono text-primary">{p.slice(1, -1)}</code>;
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    return p;
  });
}

/** Tiny Markdown-ish renderer for a skill's Source body — headings, fenced code blocks, bullet
 * lists, inline code/bold, and plain paragraphs. Shared by the Skills list's old preview and
 * SkillDetail's read-only content view so both render a skill's body identically. */
export function renderSkillBody(md: string): ReactNode[] {
  const lines = md.split("\n");
  const result: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      result.push(<h1 key={i} className="text-xl font-bold mb-3 mt-1 leading-snug">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      result.push(<h2 key={i} className="text-sm font-bold mt-4 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      result.push(<pre key={i} className="bg-surface-muted border border-border rounded-lg px-3 py-2 text-xs font-mono overflow-x-auto my-2 leading-relaxed text-foreground">{codeLines.join("\n")}</pre>);
    } else if (line.startsWith("- ")) {
      const items: ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(<li key={i}>{inlineRender(lines[i].slice(2))}</li>);
        i++;
      }
      result.push(<ul key={"ul" + i} className="list-disc pl-4 my-1 space-y-0.5 text-sm text-foreground leading-relaxed">{items}</ul>);
      continue;
    } else if (line.trim() === "") {
      // skip blank
    } else {
      result.push(<p key={i} className="text-sm leading-relaxed mb-1 text-foreground">{inlineRender(line)}</p>);
    }
    i++;
  }
  return result;
}
