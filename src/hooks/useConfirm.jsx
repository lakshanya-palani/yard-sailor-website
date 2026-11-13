import { createContext, useContext } from "react";

export const ConfirmContext = createContext(null);

/**
 * Returns `confirm({ title, body, confirmLabel, cancelLabel, tone })`, which
 * opens the shared ConfirmDialog and resolves to true (confirmed) or false.
 * Requires <ConfirmProvider> (src/components/ui/ConfirmDialog.jsx) above.
 */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
