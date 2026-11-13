import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

/**
 * Returns `{ show(message, { tone, duration }), dismiss(id) }`. `show` returns
 * the toast id. Requires <ToastProvider> (src/components/ui/Toast.jsx) above.
 */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside <ToastProvider>");
  return toast;
}
