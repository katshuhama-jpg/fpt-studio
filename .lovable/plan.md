# Task Editor — Add Node dropdown + Assistant default open

Two UX changes in `src/pages/TaskEditor.tsx` and surrounding components.

## 1. Replace "Add node" Dialog with a dropdown panel + drag-drop

Today: clicking **+ Add node** opens a centered modal Dialog. To place a node you click an item and it lands at viewport center. This blocks the canvas and feels heavy.

New behavior:
- The **+ Add node** button (top-left of canvas) opens a **Popover anchored under the button**, not a modal.
- The popover keeps the existing 3 tabs (**Blocks / Tools / Tasks**), the search box, and the same item rows.
- Each item is **draggable** onto the canvas:
  - Blocks → reuse the existing `application/x-tool-node` dataTransfer that `Canvas` already accepts (same as `NodeLibrary`).
  - Tools → new mime `application/x-tool-call` carrying `toolId|toolName`.
  - Tasks → new mime `application/x-task-call` carrying `taskId|taskName`.
- Clicking an item still works as a fallback (drops at viewport center, current behavior).
- After a successful drop or click, the popover closes.
- The popover stays at ~420px wide, max-height ~70vh, scrollable — small enough to leave canvas visible.

Files:
- Rename/rewrite `src/components/task-editor/AddNodePopup.tsx` to render with shadcn `Popover` (keep filename, change root element). Add `draggable` + `onDragStart` to each item row.
- `src/components/tool-builder/Canvas.tsx` — extend the existing `onDrop` handler to also accept the two new mime types and create `tool_call` / `task_call` nodes at the drop position.
- `src/pages/TaskEditor.tsx` — wrap the existing **+ Add node** button as the popover trigger; pass `agentId`, `currentTaskId`, `onPickBlock`, `onPickTool`, `onPickTask`.

## 2. AI Assistant open by default, docked on the left

Today: Assistant is closed on mount, opens as a right-side panel via the top-bar **Assistant** button.

New behavior:
- `assistantOpen` initial state = `true` (when not in tester/view mode).
- `AssistantPanel` renders on the **left side** of the canvas area (before `Canvas` in flex order) instead of the right.
- The panel is collapsible: same Assistant button in the top bar toggles it; panel has its own close (X) button.
- When collapsed, the canvas reclaims full width.
- Width stays ~360–400px so the canvas remains usable on a 1050px viewport.
- Selecting a node still auto-collapses the Assistant (existing behavior) to free room for `NodeDetailPanel` (which stays docked on the right).

Files:
- `src/pages/TaskEditor.tsx` — flip `assistantOpen` default to `true`; move `<AssistantPanel>` to render before `<ReactFlowProvider>` in the flex row.
- `src/components/task-editor/AssistantPanel.tsx` — switch border from `border-l` to `border-r`, keep width fixed; no other layout changes needed.

## Question for the user (will ask after plan approval)

Left placement keeps Assistant and NodeDetailPanel from fighting for the same edge (detail stays right). That is the recommendation. If the user prefers right, only the second bullet of section 2 changes.

## Out of scope

- No changes to node behavior, assistant logic, autosave, publish, or history.
- No restyling of the items in the tabs beyond what's needed to make rows draggable.
