# Fix blank preview (Agent Builder icon migration)

## What's wrong
The preview is blank on every route. The browser throws a hard parse error:
`Identifier 'Delete01Icon' has already been declared`

Because this is a module-level syntax error, the whole app fails to boot.

## Causes found in `src/pages/AgentBuilder.tsx`
1. `Delete01Icon` is imported twice in the same import statement (line 5) — this alone blanks the app.
2. The file was partly migrated from `lucide-react` to Hugeicons, but ~25 old lucide names are still referenced and no longer imported: `FileText`, `Cpu`, `Wrench`, `Puzzle`, `Shield`, `BookOpen`, `Zap`, `Bot`, `Activity`, `MessageSquare`, `UsersIcon`, `Star`, `ListChecks`, `PenLine`, `FlaskConical`, `Rocket`, `BarChart2`, `Eye`, `MessageSquareText`, `Globe`, `Database`, `Upload`, `FileQuestion`, `Plug`.
3. One nav-config type error at line 237: code reads `.items` on a nav entry shape that has no `items`.

## Fix
- Remove the duplicate `Delete01Icon` from the import list.
- Replace every leftover lucide name with its already-imported Hugeicons equivalent (e.g. `FileText` -> `FileEditIcon`, `Cpu` -> `CpuIcon`, `Puzzle` -> `PuzzleIcon`, `Shield` -> `Shield01Icon`, `BookOpen` -> `BookOpen01Icon`, `Zap` -> `BoltIcon`, `Bot` -> `Robot01Icon`, `MessageSquare` -> `Chat01Icon`, `Star` -> `StarIcon`, `ListChecks` -> `CheckListIcon`, `Rocket` -> `Rocket01Icon`, `BarChart2` -> `Analytics01Icon`, `Eye` -> `EyeIcon`, `Globe` -> `Globe02Icon`, `Database` -> `Database01Icon`, `Upload` -> `Upload01Icon`, `FileQuestion` -> `FileQuestionMarkIcon`, `Plug` -> `Plug01Icon`, `Wrench` -> `Wrench01Icon`, `Activity` -> `Activity01Icon`, `UsersIcon` -> `UserGroupIcon`, `PenLine` -> `PencilEdit01Icon`, `FlaskConical` -> `FlaskConicalIcon`), adding any missing Hugeicons imports.
- Guard the line 237 `.items` access so entries without sub-items are handled.

## Verification
Run the typecheck and load the app in a headless browser to confirm the home page renders with no console errors.
