import './Spinner.css';

export function Spinner({ size = 18, label, className }) {
  const classes = ['ui-spinner', className].filter(Boolean).join(' ');
  const ring = <span className="ui-spinner__ring" style={{ width: size, height: size }} aria-hidden="true" />;
  if (!label) return <span className={classes}>{ring}</span>;
  return (
    <span className={classes} role="status">
      {ring}
      <span className="sr-only">{label}</span>
    </span>
  );
}
