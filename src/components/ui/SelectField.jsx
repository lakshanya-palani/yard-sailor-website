import { Children } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import "./SelectField.css";

// Radix items can't use "" as a value, so a selectable "" option (e.g. "Any condition")
// is mapped to this sentinel internally and back to "" in onChange.
const EMPTY = "__empty__";

export function SelectField({ className = "", children, value, onChange, name, required, disabled, id, emptyOptionSelectable = false, ...props }) {
  const options = Children.toArray(children).filter(child => child.type === "option");
  const emptyOption = options.find(option => option.props.value === "");
  const placeholder = emptyOption?.props.children;
  const listed = emptyOptionSelectable ? options : options.filter(option => option.props.value !== "");
  const toInternal = next => (emptyOptionSelectable && !next ? EMPTY : next || "");
  return <Select.Root value={toInternal(value)} onValueChange={next => onChange?.({ target: { name, value: next === EMPTY ? "" : next } })} name={name} required={required} disabled={disabled}>
    <Select.Trigger id={id} className={`ui-select ${className}`} {...props}>
      <Select.Value placeholder={placeholder || "Select an option"} />
      <Select.Icon><ChevronDown className="ui-select-chevron" size={18} aria-hidden="true" /></Select.Icon>
    </Select.Trigger>
    <Select.Portal><Select.Content className="ui-select-menu" position="popper" side="bottom" sideOffset={6} align="start" collisionPadding={12}>
      <Select.Viewport className="ui-select-options">
        {listed.map(option => {
          const optionValue = option.props.value === "" ? EMPTY : String(option.props.value ?? option.props.children);
          return <Select.Item className="ui-select-option" key={optionValue} value={optionValue} disabled={option.props.disabled}>
            <Select.ItemText>{option.props.children}</Select.ItemText>
            <Select.ItemIndicator className="ui-select-check"><Check size={17} aria-hidden="true" /></Select.ItemIndicator>
          </Select.Item>;
        })}
      </Select.Viewport>
    </Select.Content></Select.Portal>
  </Select.Root>;
}
