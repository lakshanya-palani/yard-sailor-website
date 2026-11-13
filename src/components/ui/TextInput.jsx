import "./TextInput.css";

export function TextInput({ leadingIcon, trailing, invalid, size = "md", className, type = "text", ...inputProps }) {
  const isInvalid = Boolean(invalid || inputProps["aria-invalid"]);
  const classes = [
    "ui-input",
    `ui-input--${size}`,
    leadingIcon && "ui-input--has-leading",
    trailing && "ui-input--has-trailing",
    isInvalid && "is-invalid",
    inputProps.disabled && "is-disabled",
    className,
  ].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {leadingIcon && <span className="ui-input__leading" aria-hidden="true">{leadingIcon}</span>}
      <input className="ui-input__control" type={type} {...inputProps} aria-invalid={isInvalid || undefined} />
      {trailing && <span className="ui-input__trailing">{trailing}</span>}
    </div>
  );
}
