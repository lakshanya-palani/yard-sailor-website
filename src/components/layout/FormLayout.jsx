import './FormLayout.css';

const cx = (...parts) => parts.filter(Boolean).join(' ');

/** White card that holds a form. `width` caps it (number = px, or any CSS length). */
export function FormCard({ title, subtitle, as: Component = 'section', headingAs: Heading = 'h2', width, className, children, ...rest }) {
  const style = width != null ? { '--form-card-width': typeof width === 'number' ? `${width}px` : width } : undefined;
  return (
    <Component className={cx('ui-form-card', width != null && 'ui-form-card--capped', className)} style={style} {...rest}>
      {(title || subtitle) && (
        <div className="ui-form-card__header">
          {title && <Heading className="ui-form-card__title">{title}</Heading>}
          {subtitle && <p className="ui-form-card__subtitle">{subtitle}</p>}
        </div>
      )}
      {children}
    </Component>
  );
}

/**
 * Group of related fields. Heading + description sit in a 280px column beside
 * the fields from 900px up and stack above them below that (or always, with `stacked`).
 */
export function FormSection({ title, description, headingAs: Heading = 'h2', aside, stacked = false, className, children }) {
  const hasIntro = title || description || aside;
  return (
    <section className={cx('ui-form-section', stacked && 'ui-form-section--stacked', !hasIntro && 'ui-form-section--bare', className)}>
      {hasIntro && (
        <div className="ui-form-section__intro">
          {(title || aside) && (
            <div className="ui-form-section__heading">
              {title && <Heading className="ui-form-section__title">{title}</Heading>}
              {aside && <span className="ui-form-section__aside">{aside}</span>}
            </div>
          )}
          {description && <p className="ui-form-section__description">{description}</p>}
        </div>
      )}
      <div className="ui-form-section__fields">{children}</div>
    </section>
  );
}

/** Field grid: `columns` (1–4) on wide screens, a single column at 640px and below. */
export function FormGrid({ columns = 2, className, children }) {
  return <div className={cx('ui-form-grid', className)} style={{ '--form-cols': columns }}>{children}</div>;
}

const ALIGNS = new Set(['end', 'between', 'stretch']);

/** Button row at the end of a form. Buttons stack full width at 480px and below. */
export function FormActions({ align = 'end', className, children }) {
  return <div className={cx('ui-form-actions', `ui-form-actions--${ALIGNS.has(align) ? align : 'end'}`, className)}>{children}</div>;
}
