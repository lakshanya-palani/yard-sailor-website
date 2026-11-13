import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ConfirmContext } from "../../hooks/useConfirm";
import "./ConfirmDialog.css";

/**
 * Holds the app's single confirmation <dialog>. showModal() gives us focus
 * trapping, Escape-to-cancel and an inert background; closing restores focus
 * to whatever was focused before. Use it via useConfirm().
 */
export function ConfirmProvider({ children }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const resolveRef = useRef(null);
  const [request, setRequest] = useState(null);
  const [openCount, setOpenCount] = useState(0);
  const titleId = useId();
  const bodyId = useId();

  const settle = useCallback((value) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(value);
  }, []);

  const confirm = useCallback(
    ({ title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "default" } = {}) =>
      new Promise((resolve) => {
        settle(false); // a newer request supersedes any pending one
        resolveRef.current = resolve;
        setRequest({ title, body, confirmLabel, cancelLabel, tone });
        setOpenCount((n) => n + 1);
      }),
    [settle],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!openCount || !dialog) return;
    if (!dialog.open) {
      dialog.returnValue = "";
      dialog.showModal();
    }
    (request?.tone === "danger" ? cancelRef : confirmRef).current?.focus();
  }, [openCount, request]);

  useEffect(() => () => settle(false), [settle]);

  const handleClose = () => settle(dialogRef.current?.returnValue === "confirm");

  // Clicks on the dialog element itself (not its inner panel) are backdrop clicks.
  const handleClick = (event) => {
    if (event.target === dialogRef.current) dialogRef.current.close("cancel");
  };

  const tone = request?.tone === "danger" ? "danger" : "default";

  return (
    <ConfirmContext value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        className={`ui-confirm ui-confirm--${tone}`}
        aria-labelledby={titleId}
        aria-describedby={request?.body ? bodyId : undefined}
        onClose={handleClose}
        onClick={handleClick}
      >
        <form method="dialog" className="ui-confirm__panel">
          <h2 id={titleId} className="ui-confirm__title">{request?.title || "Are you sure?"}</h2>
          {request?.body && <div id={bodyId} className="ui-confirm__body">{request.body}</div>}
          <div className="ui-confirm__actions">
            <button ref={cancelRef} type="submit" value="cancel" className="ui-confirm__btn ui-confirm__btn--secondary">
              {request?.cancelLabel || "Cancel"}
            </button>
            <button ref={confirmRef} type="submit" value="confirm" className={`ui-confirm__btn ui-confirm__btn--${tone === "danger" ? "danger" : "primary"}`}>
              {request?.confirmLabel || "Confirm"}
            </button>
          </div>
        </form>
      </dialog>
    </ConfirmContext>
  );
}
