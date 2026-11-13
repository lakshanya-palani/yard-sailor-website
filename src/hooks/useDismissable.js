import { useCallback, useEffect, useRef } from "react";

/**
 * Closes a popup when the user presses pointer down outside `ref` (and outside
 * every ref in `ignoreRefs`, e.g. the trigger) or presses Escape.
 *
 * `onClose(reason)` receives "outside" or "escape". Returning focus to the
 * trigger is the caller's job (typically only for "escape"). The returned
 * function closes with reason "manual", for callers that want to reuse it.
 */
export function useDismissable(ref, open, onClose, { ignoreRefs = [] } = {}) {
  const onCloseRef = useRef(onClose);
  const ignoreRefsRef = useRef(ignoreRefs);

  useEffect(() => {
    onCloseRef.current = onClose;
    ignoreRefsRef.current = ignoreRefs;
  });

  useEffect(() => {
    if (!open) return undefined;

    const isInside = (target) =>
      [ref, ...ignoreRefsRef.current].some((r) => r?.current && r.current.contains(target));

    const handlePointerDown = (event) => {
      if (!isInside(event.target)) onCloseRef.current?.("outside", event);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) onCloseRef.current?.("escape", event);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, ref]);

  return useCallback((event) => onCloseRef.current?.("manual", event), []);
}
