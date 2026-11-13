import { Button } from "./Button";
import "./FormAlert.css";

export function FormAlert({ tone = "error", title, children, onRetry, retryLabel = "Try again", className }) {
  const classes = ["ui-alert", `ui-alert--${tone}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} role={tone === "error" ? "alert" : "status"}>
      <div className="ui-alert__body">
        {title && <p className="ui-alert__title">{title}</p>}
        {children && <div className="ui-alert__message">{children}</div>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" className="ui-alert__retry" onClick={onRetry}>{retryLabel}</Button>
      )}
    </div>
  );
}
