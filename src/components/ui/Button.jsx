import { Link } from 'react-router-dom';
import './Button.css';

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  icon,
  iconAfter,
  loading = false,
  as,
  to,
  href,
  type = 'button',
  disabled,
  className,
  children,
  onClick,
  ...rest
}) {
  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    block && 'ui-btn--block',
    loading && 'is-loading',
    className,
  ].filter(Boolean).join(' ');

  const inactive = Boolean(disabled || loading);
  const content = (
    <>
      {loading && <span className="ui-btn__spinner" aria-hidden="true" />}
      {icon && <span className="ui-btn__icon" aria-hidden="true">{icon}</span>}
      {children != null && <span className="ui-btn__label">{children}</span>}
      {iconAfter && <span className="ui-btn__icon" aria-hidden="true">{iconAfter}</span>}
    </>
  );

  const Component = as || (to != null ? Link : href != null ? 'a' : 'button');
  const isNativeButton = Component === 'button';

  if (isNativeButton) {
    return (
      <button
        type={type}
        className={classes}
        disabled={inactive}
        aria-busy={loading || undefined}
        onClick={onClick}
        {...rest}
      >
        {content}
      </button>
    );
  }

  // Links can't be truly disabled: mark them and swallow clicks instead.
  const handleClick = inactive
    ? event => { event.preventDefault(); }
    : onClick;

  return (
    <Component
      className={classes}
      to={to}
      href={href}
      aria-disabled={inactive || undefined}
      aria-busy={loading || undefined}
      tabIndex={inactive ? -1 : undefined}
      onClick={handleClick}
      {...rest}
    >
      {content}
    </Component>
  );
}
