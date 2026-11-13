import { useId } from "react";
import "./Checkbox.css";

export function Checkbox({ label, description, id, className, ...inputProps }) {
  const autoId = useId();
  const inputId = id || `checkbox-${autoId}`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const describedBy = [inputProps["aria-describedby"], descriptionId].filter(Boolean).join(" ") || undefined;
  const classes = ["ui-checkbox", inputProps.disabled && "is-disabled", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <input className="ui-checkbox__input" type="checkbox" id={inputId} {...inputProps} aria-describedby={describedBy} />
      <div className="ui-checkbox__text">
        <label className="ui-checkbox__label" htmlFor={inputId}>{label}</label>
        {description && <p className="ui-checkbox__description" id={descriptionId}>{description}</p>}
      </div>
    </div>
  );
}
