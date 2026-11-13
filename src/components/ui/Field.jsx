import { Children, cloneElement, isValidElement, useId } from "react";
import "./Field.css";

export function Field({ label, hint, error, required = false, count, max, id, children, className }) {
  const autoId = useId();
  const controlId = id || children?.props?.id || `field-${autoId}`;
  const hintId = hint ? `${controlId}-hint` : null;
  const errorId = error ? `${controlId}-error` : null;
  const countId = max != null ? `${controlId}-count` : null;

  const child = Children.only(children);
  const describedBy = [child.props["aria-describedby"], hintId, errorId, countId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(child)
    ? cloneElement(child, {
      id: controlId,
      "aria-describedby": describedBy,
      "aria-invalid": error ? true : child.props["aria-invalid"],
      required: required || child.props.required,
    })
    : child;

  const classes = ["ui-field", error && "is-invalid", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {label && (
        <label className="ui-field__label" htmlFor={controlId}>
          {label}
          {required && (
            <span className="ui-field__required">
              <span aria-hidden="true"> *</span>
              <span className="sr-only"> (required)</span>
            </span>
          )}
        </label>
      )}
      {hint && <p className="ui-field__hint" id={hintId}>{hint}</p>}
      {control}
      <div className="ui-field__footer">
        <div className="ui-field__error-region" aria-live="polite">
          {error && <p className="ui-field__error" id={errorId}>{error}</p>}
        </div>
        {max != null && (
          <span className="ui-field__count" id={countId}>
            {count ?? 0}/{max}<span className="sr-only"> characters</span>
          </span>
        )}
      </div>
    </div>
  );
}
