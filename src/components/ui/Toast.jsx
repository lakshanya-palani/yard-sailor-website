import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { ToastContext } from "../../hooks/useToast";
import "./Toast.css";

function ToastItem({ toast, onDismiss }) {
  const { id, message, tone, duration } = toast;
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || !duration || !Number.isFinite(duration)) return undefined;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, paused, onDismiss]);

  return (
    <div
      className={`ui-toast ui-toast--${tone}`}
      role={tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="ui-toast__message">{message}</div>
      <button type="button" className="ui-toast__dismiss" aria-label="Dismiss" onClick={() => onDismiss(id)}>
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Renders the app's toast stack. Use it via useToast(). */
export function ToastProvider({ children, max = 4 }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, { tone = "info", duration = 5000 } = {}) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((list) => [...list, { id, message, tone, duration }].slice(-max));
      return id;
    },
    [max],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext value={value}>
      {children}
      <div className="ui-toast-region" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />)}
      </div>
    </ToastContext>
  );
}
