# Fix blank preview

## What's wrong
The preview renders a blank page. The browser throws:
`Identifier 'Delete01Icon' has already been declared`

This is a hard parse error, so the whole app fails to load — every route is blank.

## Cause
In `src/pages/AgentBuilder.tsx` line 5, the icon import list includes `Delete01Icon` twice:
`... Wrench01Icon , Delete01Icon, UserGroupIcon }`

## Fix
Remove the duplicate `Delete01Icon` from that import statement (keep one occurrence), then reload the preview and confirm the app renders with no console errors.

No other files need changes; typecheck is currently clean.
