## Goal

Add a visual **Workflow-based Tool Builder** to the agent builder's `Tools` section (currently a placeholder), inspired by Dify, Kore.ai, and n8n. Users compose a tool as a node-graph: trigger → logic / API / AI nodes → output. The output tool can then be attached to an agent.

## Scope

Frontend / presentation only. No backend, no real execution engine — this is a UI scaffold that demonstrates the flow, mirroring the visual language already established in this app (shadcn/ui, semantic tokens, current sidebar patterns).

## UX flow

```text
Tools section (in AgentBuilder)
  └─ Tools list (cards: name, description, last edited, status)
        ├─ [+ New tool]  → opens Tool Builder (full-screen overlay route)
        └─ [Edit]        → opens Tool Builder pre-populated
```

Tool Builder layout (n8n-style):

```text
┌────────────────────────────────────────────────────────────────┐
│ Topbar: ← Back | Tool name (editable) | Test ▶ | Save | Publish │
├──────────┬───────────────────────────────────────┬─────────────┤
│ Node     │                                       │ Inspector   │
│ Library  │      Canvas (pan / zoom)              │ (selected   │
│          │                                       │  node)      │
│ Triggers │   [Trigger]──►[HTTP]──►[Transform]──► │             │
│ Logic    │                  │                    │ Params      │
│ Data     │                  └──►[If]──►[AI]──►   │ Auth        │
│ AI       │                          [Output]     │ Output map  │
│ Output   │                                       │             │
└──────────┴───────────────────────────────────────┴─────────────┘
```

- Drag a node from the left library onto the canvas.
- Click a node → right Inspector panel shows its config (params, headers, conditions, prompt, etc.).
- Connect nodes by dragging from a node's output handle to another node's input handle.
- Bottom drawer: **Test run** — input JSON, see step-by-step execution log (mocked).

## Node types (initial set)

| Category | Nodes |
|---|---|
| Trigger | Manual, Agent call (when agent invokes this tool), Webhook |
| Logic   | If / Else, Switch, Loop, Set variable |
| Data    | HTTP Request, Database query (placeholder), Knowledge lookup |
| AI      | LLM prompt, Extract structured data, Classify |
| Output  | Return to agent |

## Files to add / change

- **New** `src/pages/ToolBuilder.tsx` — full builder page (canvas, library, inspector, test drawer).
- **New** `src/components/tool-builder/NodeLibrary.tsx` — left panel, draggable node catalog.
- **New** `src/components/tool-builder/Canvas.tsx` — wraps React Flow; renders nodes/edges, handles drop.
- **New** `src/components/tool-builder/Inspector.tsx` — right panel, renders config form per node type.
- **New** `src/components/tool-builder/nodes/` — small node components (`TriggerNode`, `HttpNode`, `IfNode`, `LlmNode`, `OutputNode`, plus a generic `BaseNode`).
- **New** `src/components/tool-builder/TestDrawer.tsx` — bottom drawer with mocked run timeline.
- **New** `src/components/tool-builder/types.ts` — `ToolNode`, `ToolEdge`, `NodeKind`, `ToolDefinition` types and a small in-memory mock store.
- **Edit** `src/pages/AgentBuilder.tsx` — replace the `tool` placeholder with a real `ToolsTab` listing tools + "New tool" button that navigates to the builder.
- **Edit** `src/App.tsx` — add routes `/agents/:id/tools/new` and `/agents/:id/tools/:toolId` mounting `ToolBuilder` outside `WorkspaceLayout` (full-screen, like the canvas tools in n8n).

## Technical details

- **Graph engine**: use `reactflow` (`bun add reactflow`). It's the de-facto library for n8n/Dify-style canvases — supports custom nodes, handles, mini-map, controls, pan/zoom out of the box.
- **State**: local component state (`useNodesState`, `useEdgesState` from reactflow) plus a `useState<ToolDefinition>` holding name/description. No persistence beyond in-memory for now.
- **Styling**: custom node components styled with semantic tokens (`bg-surface`, `border-border`, `bg-primary-soft`, `text-primary`, etc.) — no raw colors. Match existing radius and shadow utilities (`shadow-soft`, `rounded-xl`).
- **DnD**: HTML5 drag-and-drop from the library into the canvas; reactflow's `onDrop` handler creates the new node at the drop position.
- **Inspector forms**: a switch on `node.kind` rendering shadcn `Input`, `Textarea`, `Select`, `Switch` controls. Changes update the selected node's `data` field.
- **Test drawer**: mocks a run by walking the graph topologically and rendering a vertical timeline of "step → status → duration → output" using existing chip/card primitives.
- **Empty state**: when no nodes are on the canvas, show a centered hint card with the three quickest starting templates ("Webhook → HTTP → Return", "Agent call → LLM → Return", "Blank").
- **Save**: writes the `ToolDefinition` to a module-level mock store keyed by tool id; the agent's Tools list reads from the same store so newly-built tools appear immediately.

## Out of scope (intentionally)

- Real execution / backend wiring.
- Authentication for HTTP nodes (UI fields only).
- Versioning of tools.
- Sharing tools across agents (each agent has its own list for now).
