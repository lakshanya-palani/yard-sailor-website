import "./StatusMessage.css";

/**
 * Empty, error and loading states. Empty/error render a centered cream panel;
 * loading renders a ring + text. Errors announce via role="alert", loading via role="status".
 */
export function StatusMessage({
  kind = "empty",
  title,
  children,
  action,
  onRetry,
  retryLabel = "Try again",
  icon,
  compact = false,
  titleAs,
  className = "",
}) {
  const classes = ["ui-status", `ui-status--${kind}`, compact && "ui-status--compact", className]
    .filter(Boolean)
    .join(" ");

  if (kind === "loading") {
    return (
      <div className={classes} role="status">
        <span className="ui-status__ring" aria-hidden="true" />
        <span className="ui-status__text">{title || children || "Loading…"}</span>
        {title && children && <span className="ui-status__body">{children}</span>}
      </div>
    );
  }

  const Heading = titleAs || (compact ? "p" : "h2");

  return (
    <div className={classes} role={kind === "error" ? "alert" : undefined}>
      {icon && <span className="ui-status__icon" aria-hidden="true">{icon}</span>}
      {title && <Heading className="ui-status__title">{title}</Heading>}
      {children && <div className="ui-status__body">{children}</div>}
      {(action || onRetry) && (
        <div className="ui-status__actions">
          {action}
          {onRetry && (
            <button type="button" className="ui-status__retry" onClick={onRetry}>
              {retryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
