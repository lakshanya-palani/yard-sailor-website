import "./SegmentedControl.css";

export function SegmentedControl({ options, value, onChange, label, size = "md", className }) {
  const classes = ["ui-segmented", `ui-segmented--${size}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="group" aria-label={label}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={["ui-segmented__option", selected && "is-selected"].filter(Boolean).join(" ")}
            aria-pressed={selected}
            disabled={option.disabled}
            onClick={() => { if (!selected) onChange?.(option.value); }}
          >
            {option.icon && <span className="ui-segmented__icon" aria-hidden="true">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
