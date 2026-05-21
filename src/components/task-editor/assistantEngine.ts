import type { ToolNode, ToolEdge, NodeKind } from "@/components/tool-builder/types";
import { blockCatalog } from "./blockCatalog";
import { specByKind } from "@/components/tool-builder/NodeLibrary";

export type Intent = "add" | "fix" | "trace" | "unknown";

export interface ClarifyQ {
  id: string;
  question: string;
  options: string[];
}

export interface ChangeOp {
  type: "add" | "edit" | "delete";
  nodeId?: string;
  label: string;
  detail?: string;
  apply: (graph: { nodes: ToolNode[]; edges: ToolEdge[] }) => { nodes: ToolNode[]; edges: ToolEdge[] };
}

export interface Proposal {
  intent: Intent;
  summary: string;
  ops: ChangeOp[];
  trace?: { nodeId: string; label: string; input: any; output: any; branch?: string; ms: number }[];
}

export function parseIntent(prompt: string): Intent {
  const p = prompt.toLowerCase();
  if (/\b(why|trace|debug|explain|reason)\b/.test(p)) return "trace";
  if (/\b(fix|bug|error|fail|broken)\b/.test(p)) return "fix";
  if (/\b(add|insert|wire|connect|create|append)\b/.test(p)) return "add";
  return "unknown";
}

function findBlockByPrompt(prompt: string) {
  const p = prompt.toLowerCase();
  return blockCatalog.find(b => p.includes(b.label.toLowerCase()))
      ?? blockCatalog.find(b => p.includes(b.kind));
}

function findNodeByLabel(nodes: ToolNode[], prompt: string) {
  const p = prompt.toLowerCase();
  const matches = nodes.filter(n => p.includes((n.data.label || "").toLowerCase()) || p.includes(n.data.kind));
  return matches;
}

/** Decide if we need clarifying questions before producing a proposal. */
export function needsClarification(
  prompt: string,
  graph: { nodes: ToolNode[]; edges: ToolEdge[] }
): ClarifyQ[] | null {
  const intent = parseIntent(prompt);
  const p = prompt.toLowerCase();

  if (intent === "unknown") {
    return [{
      id: "intent",
      question: "What would you like me to do?",
      options: ["Add or wire a node", "Fix a broken node", "Trace the last run", "Something else"],
    }];
  }

  if (intent === "add") {
    const block = findBlockByPrompt(prompt);
    const qs: ClarifyQ[] = [];
    if (!block) {
      qs.push({
        id: "node_type",
        question: "Which node type should I add?",
        options: ["Knowledge Retrieval", "LLM", "HTTP Request", "If / Else", "Code"],
      });
    }
    // ambiguous "before/after which node"
    const matches = findNodeByLabel(graph.nodes, prompt);
    if (matches.length > 1 && !/\b(before|after)\s+\S+\s+\S+/.test(p)) {
      qs.push({
        id: "target",
        question: "I found multiple matching nodes — which one is the target?",
        options: matches.slice(0, 4).map(n => n.data.label || n.id),
      });
    }
    if (/delete|remove|overwrite/.test(p)) {
      qs.push({
        id: "confirm_destructive",
        question: "This change overwrites existing config — proceed?",
        options: ["Yes, overwrite", "No, abort"],
      });
    }
    return qs.length > 0 ? qs : null;
  }

  if (intent === "fix") {
    const issues = computeIssues(graph);
    if (issues.length > 1) {
      return [{
        id: "which_issue",
        question: "I see multiple potential issues — which should I fix first?",
        options: issues.slice(0, 4).map(i => i.label),
      }];
    }
    return null;
  }

  if (intent === "trace") {
    if (graph.nodes.length === 0) {
      return [{
        id: "no_nodes",
        question: "There are no nodes to trace. Do you want me to scaffold a minimal flow first?",
        options: ["Yes, scaffold a basic flow", "No, never mind"],
      }];
    }
    return null;
  }

  return null;
}

interface Issue { nodeId: string; label: string; patch: Record<string, any>; field: string; }

function computeIssues(graph: { nodes: ToolNode[]; edges: ToolEdge[] }): Issue[] {
  const out: Issue[] = [];
  for (const n of graph.nodes) {
    const c = n.data.config || {};
    if (n.data.kind === "http" && !c.url) out.push({ nodeId: n.id, label: `"${n.data.label}" is missing a URL`, patch: { url: "https://api.example.com/endpoint" }, field: "url" });
    if (n.data.kind === "knowledge" && !c.topK) out.push({ nodeId: n.id, label: `"${n.data.label}" has no Top-K`, patch: { topK: 20 }, field: "topK" });
    if (n.data.kind === "llm" && !c.context) out.push({ nodeId: n.id, label: `"${n.data.label}" is missing Context`, patch: { context: "@knowledge" }, field: "context" });
    if (n.data.kind === "if" && !(c.branches && c.branches.length)) out.push({ nodeId: n.id, label: `"${n.data.label}" has no branches`, patch: { branches: [{ id: "if", label: "IF", conditions: [{ left: "", op: "Is", right: "" }] }] }, field: "branches" });
  }
  return out;
}

function topoSort(nodes: ToolNode[], edges: ToolEdge[]) {
  const indeg = new Map(nodes.map(n => [n.id, 0]));
  edges.forEach(e => indeg.set(e.target, (indeg.get(e.target) || 0) + 1));
  const queue = nodes.filter(n => (indeg.get(n.id) || 0) === 0).map(n => n.id);
  const order: ToolNode[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const node = nodes.find(n => n.id === id);
    if (node) order.push(node);
    edges.filter(e => e.source === id).forEach(e => {
      const d = (indeg.get(e.target) || 0) - 1;
      indeg.set(e.target, d);
      if (d === 0) queue.push(e.target);
    });
  }
  return order;
}

export function buildProposal(
  prompt: string,
  graph: { nodes: ToolNode[]; edges: ToolEdge[] },
  intent: Intent = parseIntent(prompt)
): Proposal {
  if (intent === "add") {
    const block = findBlockByPrompt(prompt);
    if (!block) {
      return { intent, summary: "I couldn't infer which node to add.", ops: [] };
    }
    // find "before X" or "after X"
    const beforeMatch = prompt.match(/before\s+(\w[\w\s]*)/i);
    const afterMatch = prompt.match(/after\s+(\w[\w\s]*)/i);
    const targetLabel = (beforeMatch?.[1] || afterMatch?.[1] || "").trim().toLowerCase();
    const target = graph.nodes.find(n => (n.data.label || "").toLowerCase().includes(targetLabel) || n.data.kind === targetLabel);
    const pos = target ? { x: target.position.x + (afterMatch ? 240 : -240), y: target.position.y } : { x: 320, y: 240 };

    const newId = `${block.kind}-${Date.now()}`;
    const newNode: ToolNode = {
      id: newId, type: "flow", position: pos,
      data: { kind: block.kind, label: block.label, config: { ...block.defaults } },
    };

    const ops: ChangeOp[] = [{
      type: "add",
      label: `Add "${block.label}" node${target ? ` ${beforeMatch ? "before" : "after"} "${target.data.label}"` : ""}`,
      detail: block.description,
      apply: ({ nodes, edges }) => {
        let newEdges = edges;
        if (target) {
          if (beforeMatch) {
            const inbound = edges.filter(e => e.target === target.id);
            newEdges = edges.filter(e => !inbound.includes(e))
              .concat(inbound.map(e => ({ ...e, id: `${e.source}-${newId}`, target: newId })))
              .concat([{ id: `${newId}-${target.id}`, source: newId, target: target.id, animated: true, style: { strokeWidth: 2 } }]);
          } else if (afterMatch) {
            const outbound = edges.filter(e => e.source === target.id);
            newEdges = edges.filter(e => !outbound.includes(e))
              .concat([{ id: `${target.id}-${newId}`, source: target.id, target: newId, animated: true, style: { strokeWidth: 2 } }])
              .concat(outbound.map(e => ({ ...e, id: `${newId}-${e.target}`, source: newId })));
          }
        }
        return { nodes: [...nodes, newNode], edges: newEdges };
      },
    }];

    return {
      intent, ops,
      summary: `I'll add a ${block.label} node${target ? ` ${beforeMatch ? "before" : "after"} ${target.data.label}` : ""}.`,
    };
  }

  if (intent === "fix") {
    const issues = computeIssues(graph);
    if (issues.length === 0) {
      return { intent, summary: "I didn't find any issues — your flow looks healthy.", ops: [] };
    }
    const iss = issues[0];
    const ops: ChangeOp[] = [{
      type: "edit",
      nodeId: iss.nodeId,
      label: `Patch ${iss.field} on the affected node`,
      detail: iss.label,
      apply: ({ nodes, edges }) => ({
        nodes: nodes.map(n => n.id === iss.nodeId ? { ...n, data: { ...n.data, config: { ...n.data.config, ...iss.patch } } } : n),
        edges,
      }),
    }];
    return { intent, summary: iss.label, ops };
  }

  if (intent === "trace") {
    const order = topoSort(graph.nodes, graph.edges);
    const trace = order.map((n, i) => ({
      nodeId: n.id,
      label: `${n.data.label || specByKind(n.data.kind).label}`,
      input: i === 0 ? { user_message: "Sample input" } : { from_prev: `output_${i - 1}` },
      output: mockOutput(n.data.kind),
      branch: n.data.kind === "if" ? "IF" : undefined,
      ms: 80 + Math.floor(Math.random() * 320),
    }));
    return {
      intent,
      summary: `Traced ${trace.length} nodes in execution order.`,
      ops: [],
      trace,
    };
  }

  return { intent: "unknown", summary: "I'm not sure how to help with that yet.", ops: [] };
}

function mockOutput(kind: NodeKind) {
  switch (kind) {
    case "knowledge": return { documents: [{ title: "FAQ.pdf", score: 0.87 }] };
    case "llm": return { text: "Sure — here is the answer." };
    case "if": return { branch: "IF" };
    case "http": return { status_code: 200, body: { ok: true } };
    case "output": return { final_answer: "Done." };
    default: return { ok: true };
  }
}

export function applyProposal(
  graph: { nodes: ToolNode[]; edges: ToolEdge[] },
  proposal: Proposal
) {
  return proposal.ops.reduce((g, op) => op.apply(g), graph);
}
