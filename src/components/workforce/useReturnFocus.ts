import { useEffect, useRef } from "react";

/** Captures whatever had focus right before `open` became true, and restores it once `open`
 * goes back to false — for a component that stays mounted and toggles its own visibility via
 * an `open` prop. Closing a picker/popup this way (Escape, backdrop, close button) always
 * returns focus to whatever triggered it, per the a11y pass in S11. */
export function useReturnFocus(open: boolean) {
  const prevFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      prevFocused.current = document.activeElement as HTMLElement | null;
    } else if (prevFocused.current) {
      prevFocused.current.focus?.();
      prevFocused.current = null;
    }
  }, [open]);
}

/** Same idea, for a drawer/popup the parent only renders while open (mounts on open, unmounts
 * on close) — captures focus on mount, restores it on unmount. */
export function useReturnFocusOnUnmount() {
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    return () => prev?.focus?.();
  }, []);
}
