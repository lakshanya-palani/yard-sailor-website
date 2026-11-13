import './IconButton.css';

export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  type = 'button',
  className,
  children,
  ...rest
}) {
  const classes = ['ui-icon-btn', `ui-icon-btn--${variant}`, `ui-icon-btn--${size}`, className]
    .filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} aria-label={label} title={label} {...rest}>
      <span className="ui-icon-btn__icon" aria-hidden="true">{children}</span>
    </button>
  );
}
