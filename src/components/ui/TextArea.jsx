import "./TextArea.css";

export function TextArea({ invalid, rows = 5, className, ...props }) {
  const isInvalid = Boolean(invalid || props["aria-invalid"]);
  const classes = ["ui-textarea", isInvalid && "is-invalid", className].filter(Boolean).join(" ");
  return <textarea className={classes} rows={rows} {...props} aria-invalid={isInvalid || undefined} />;
}
