import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

/**
 * A detail view that opens *inside* the current page (a knowledge base inside a Digital Worker,
 * a document inside a knowledge base) and is addressed by one query param.
 *
 * - open() pushes a history entry, so the browser Back button closes the detail and keeps the
 *   user on the page they were on - never jumps to the list behind it.
 * - close() goes back when this page pushed the entry itself (same result as Back); on a deep
 *   link (nothing to go back to) it just drops the param, replacing the entry.
 * - Opening a parent level clears the child params passed in `clears` (e.g. opening another
 *   knowledge base closes any document that was open).
 */
export function useDrillParam(key: string, clears: string[] = []) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const value = params.get(key);

  const open = (id: string) => {
    const next = new URLSearchParams(params);
    next.set(key, id);
    for (const c of clears) next.delete(c);
    setParams(next, { state: { drill: key } });
  };

  const close = () => {
    const state = location.state as { drill?: string } | null;
    if (state?.drill === key) { navigate(-1); return; }
    const next = new URLSearchParams(params);
    next.delete(key);
    for (const c of clears) next.delete(c);
    setParams(next, { replace: true });
  };

  return { value, open, close };
}
