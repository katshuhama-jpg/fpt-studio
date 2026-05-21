import type { NodeKind } from "@/components/tool-builder/types";
import { specByKind, nodeSpecs } from "@/components/tool-builder/NodeLibrary";

export interface BlockSpec {
  kind: NodeKind;
  label: string;
  description: string;
  group: "Input" | "AI" | "Knowledge" | "Logic" | "Tools" | "Output";
  defaults: Record<string, any>;
  supportsErrorHandling?: boolean;
  supportsRetry?: boolean;
  hasInput: boolean;
  hasOutput: boolean;
}

const llmDefaults = {
  model: "Llama-3.3-70B-Instruct",
  temperature: 0.7,
  topP: 1,
  freqPenalty: 0,
  presPenalty: 0,
  maxTokens: 512,
};

export const blockCatalog: BlockSpec[] = [
  { kind: "trigger", label: "Start", description: "Define the workflow's input variables.", group: "Input",
    defaults: { variables: [] }, hasInput: false, hasOutput: true },
  { kind: "output", label: "End", description: "Define the workflow's output variables.", group: "Output",
    defaults: { outputs: [{ name: "final_answer", from: "" }] }, hasInput: true, hasOutput: false },

  { kind: "classifier", label: "Question Classifier", description: "Classify questions into branches via LLM.", group: "AI",
    defaults: { input: "", ...llmDefaults, classes: [{ name: "Class 1", description: "" }], instruction: "", memory: false, windowSize: 50, roleName: "user", output: "class_name" },
    supportsErrorHandling: true, hasInput: true, hasOutput: true },
  { kind: "rewriter", label: "Question Rewriter", description: "Rewrite the user's question from history.", group: "AI",
    defaults: { ...llmDefaults, question: "", history: "chat_history", instruction: "", memory: true, windowSize: 6, roleName: "user", output: "rewritten" },
    supportsErrorHandling: true, hasInput: true, hasOutput: true },
  { kind: "query_processor", label: "Query Processor", description: "Pre-process query (synonyms).", group: "AI",
    defaults: { query: "", dictionary: [], output: "processed_query" },
    hasInput: true, hasOutput: true },
  { kind: "llm", label: "LLM", description: "Generate text or classify with an LLM.", group: "AI",
    defaults: { ...llmDefaults, mode: "chat", context: "", systemPrompt: "", messages: [{ role: "user", content: "" }], jsonOutput: false, memory: false, windowSize: 50, output: "text" },
    supportsErrorHandling: true, supportsRetry: true, hasInput: true, hasOutput: true },
  { kind: "param_extractor", label: "Parameter Extractor", description: "Extract variables from text.", group: "AI",
    defaults: { ...llmDefaults, input: "", parameters: [{ name: "param1", type: "String", description: "", required: true }], instruction: "", memory: false, windowSize: 50, output: "params" },
    supportsErrorHandling: true, hasInput: true, hasOutput: true },
  { kind: "agent", label: "Agent", description: "LLM agent that auto-picks tools.", group: "AI",
    defaults: { strategy: "Function Calling", model: "Llama-3.3-70B-Instruct", tools: [], instruction: "", query: "", maxIterations: 5, memory: true, windowSize: 10, output: "answer" },
    supportsErrorHandling: true, hasInput: true, hasOutput: true },

  { kind: "knowledge", label: "Knowledge Retrieval", description: "Retrieve from knowledge base.", group: "Knowledge",
    defaults: { query: "", semantic: 0.6, keyword: 0.4, topK: 20, scoreThreshold: 0, scoreThresholdActive: false, rerank: true, rerankTopK: 5, rerankThreshold: 0.01, parentChild: true, parentChildThreshold: 0.7, source: "Agent Knowledge", fileFilter: "Disable", metadataFilter: "Disable" },
    hasInput: true, hasOutput: true },
  { kind: "hkg_retrieval", label: "H-KG Retrieval", description: "Hierarchical KG retrieval.", group: "Knowledge",
    defaults: { query: "", collectionType: "Chunk", semantic: 0.6, keyword: 0.4, topK: 20, rerank: true, rerankTopK: 5, source: "Agent Knowledge" },
    hasInput: true, hasOutput: true },
  { kind: "ref_filter", label: "Reference Filter", description: "Filter references.", group: "Knowledge",
    defaults: { input: "", referenceContext: "", thresholdActive: false, threshold: 0, output: "reference_context" },
    hasInput: true, hasOutput: true },
  { kind: "knowledge_lookup", label: "Knowledge Lookup", description: "Fetch files by id or name.", group: "Knowledge",
    defaults: { source: "Agent Knowledge", fileFilter: "Disable", metadataFilter: "Disable", aggregation: "Unique by file name", limit: 10 },
    hasInput: true, hasOutput: true },
  { kind: "file_parser", label: "File Parser", description: "Extract content from files.", group: "Knowledge",
    defaults: { input: "sys.files", instruction: "Parse image", output: "content" },
    supportsErrorHandling: true, hasInput: true, hasOutput: true },

  { kind: "if", label: "If / Else", description: "Branch on a condition.", group: "Logic",
    defaults: { branches: [{ id: "if", label: "IF", conditions: [{ left: "", op: "Is", right: "" }] }, { id: "else", label: "ELSE", conditions: [] }] },
    hasInput: true, hasOutput: true },
  { kind: "iteration", label: "Iteration", description: "Independent loop over a list.", group: "Logic",
    defaults: { input: "", output: "", body: [] }, hasInput: true, hasOutput: true },
  { kind: "loop_node", label: "Loop", description: "Stateful loop with termination.", group: "Logic",
    defaults: { terminationCondition: "", maxLoopCount: 10, loopVariables: [] }, hasInput: true, hasOutput: true },
  { kind: "code", label: "Code", description: "Run Python logic.", group: "Logic",
    defaults: { inputs: [{ name: "arg1", from: "" }, { name: "arg2", from: "" }], code: "result = arg1 + arg2", outputName: "result", dataType: "String" },
    supportsErrorHandling: true, supportsRetry: true, hasInput: true, hasOutput: true },
  { kind: "var_agg", label: "Variable Aggregator", description: "Merge branches.", group: "Logic",
    defaults: { variables: [], groupName: "default", aggregationGroup: false }, hasInput: true, hasOutput: true },
  { kind: "var_assigner", label: "Variable Assigner", description: "Assign writable variables.", group: "Logic",
    defaults: { assignments: [{ target: "", mode: "Overwrite", value: "" }] }, hasInput: true, hasOutput: true },
  { kind: "template", label: "Template", description: "Compose text with variables.", group: "Logic",
    defaults: { variables: [], code: "", output: "text" }, hasInput: true, hasOutput: true },

  { kind: "http", label: "HTTP Request", description: "Call an external REST API.", group: "Tools",
    defaults: { authType: "None", apiKey: "", method: "GET", url: "", headers: [], params: [], bodyType: "none", body: "", timeoutConnect: 5000, timeoutRead: 30000, timeoutWrite: 30000 },
    supportsErrorHandling: true, supportsRetry: true, hasInput: true, hasOutput: true },
  { kind: "tool_call", label: "Tool", description: "Call a Custom or MCP tool.", group: "Tools",
    defaults: { toolId: "", toolName: "", inputs: {} },
    supportsErrorHandling: true, supportsRetry: true, hasInput: true, hasOutput: true },
  { kind: "task_call", label: "Task", description: "Call another saved Task.", group: "Tools",
    defaults: { taskId: "", taskName: "", inputs: {} },
    supportsErrorHandling: true, hasInput: true, hasOutput: true },
];

export const blockByKind = (k: NodeKind): BlockSpec | undefined =>
  blockCatalog.find(b => b.kind === k);

export const groupOrder: BlockSpec["group"][] = ["Input", "AI", "Knowledge", "Logic", "Tools", "Output"];

export function specOrLegacy(k: NodeKind) {
  return blockByKind(k) ?? {
    kind: k,
    label: specByKind(k).label,
    description: specByKind(k).description,
    group: "Logic" as const,
    defaults: {},
    hasInput: k !== "trigger",
    hasOutput: k !== "output",
  };
}

export { specByKind, nodeSpecs };
