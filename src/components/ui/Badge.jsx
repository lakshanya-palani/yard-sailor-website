import './Badge.css';

export function Badge({ tone = 'neutral', icon, className, children, ...rest }) {
  const classes = ['ui-badge', `ui-badge--${tone}`, className].filter(Boolean).join(' ');
  return (
    <span className={classes} {...rest}>
      {icon && <span className="ui-badge__icon" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
