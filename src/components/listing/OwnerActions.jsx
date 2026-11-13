import { useEffect, useRef } from "react";
import { Button } from "../ui/Button";
import { useConfirm } from "../../hooks/useConfirm";
import "./OwnerActions.css";

/**
 * Owner-only "Edit" (secondary link) + "Cancel/Delete" (danger) pair.
 * When `confirm` is given ({ title, body, confirmLabel, cancelLabel }) the
 * shared ConfirmDialog asks first; `onCancel` only runs when confirmed.
 * Either action is omitted when its prop (`editTo` / `onCancel`) is missing.
 */
export function OwnerActions({
  editTo,
  editLabel = "Edit Posting",
  onCancel,
  cancelLabel = "Cancel Posting",
  busy = false,
  busyLabel = "Cancelling...",
  confirm,
  size = "md",
  className,
}) {
  const ask = useConfirm();
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function handleCancel() {
    if (busy) return;
    if (confirm && !(await ask({ tone: "danger", confirmLabel: cancelLabel, cancelLabel: "Keep it", ...confirm }))) return;
    if (mounted.current) onCancel();
  }

  return (
    <div className={["listing-owner-actions", className].filter(Boolean).join(" ")}>
      {editTo && <Button variant="secondary" size={size} to={editTo} disabled={busy}>{editLabel}</Button>}
      {onCancel && (
        <Button variant="danger" size={size} onClick={handleCancel} loading={busy}>
          {busy ? busyLabel : cancelLabel}
        </Button>
      )}
    </div>
  );
}
