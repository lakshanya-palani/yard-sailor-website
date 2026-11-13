import { useId } from "react";
import { Check } from "lucide-react";
import "./ChoiceCard.css";

export function ChoiceCard({ type = "checkbox", title, description, icon, checked = false, onChange, name, value, disabled = false, className, ...inputProps }) {
  const autoId = useId();
  const descriptionId = description ? `choice-${autoId}-description` : undefined;
  const classes = [
    "ui-choice",
    `ui-choice--${type}`,
    checked && "is-selected",
    disabled && "is-disabled",
    className,
  ].filter(Boolean).join(" ");
  return (
    <label className={classes}>
      <input
        className="ui-choice__input sr-only"
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-describedby={descriptionId}
        {...inputProps}
      />
      {icon && <span className="ui-choice__icon" aria-hidden="true">{icon}</span>}
      <span className="ui-choice__text">
        <span className="ui-choice__title">{title}</span>
        {description && <span className="ui-choice__description" id={descriptionId}>{description}</span>}
      </span>
      <span className="ui-choice__indicator" aria-hidden="true">
        {checked && <Check size={16} strokeWidth={3} />}
      </span>
    </label>
  );
}
