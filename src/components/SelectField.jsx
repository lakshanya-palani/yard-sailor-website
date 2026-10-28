import { Children } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import "./ui.css";

export default function SelectField({ className = "", children, value, onChange, name, required, disabled, id, menuVariant = "", ...props }) {
  const options = Children.toArray(children).filter(child => child.type === "option");
  const placeholder = options.find(option => option.props.value === "")?.props.children;
  return <Select.Root value={value || ""} onValueChange={next => onChange?.({ target: { name, value: next } })} name={name} required={required} disabled={disabled}>
    <Select.Trigger id={id} className={`ui-select ${className}`} {...props}>
      <Select.Value placeholder={placeholder || "Select an option"} />
      <Select.Icon><ChevronDown className="ui-select-chevron" size={18} aria-hidden="true" /></Select.Icon>
    </Select.Trigger>
    <Select.Portal><Select.Content className={`ui-select-menu ${menuVariant ? `ui-select-menu-${menuVariant}` : ""}`} position={menuVariant === "language" ? "popper" : "item-aligned"} sideOffset={menuVariant === "language" ? 8 : undefined} align="end" collisionPadding={12}>
      {menuVariant === "language" && <div className="language-menu-heading">Language</div>}
      <Select.Viewport className="ui-select-options">
        {options.filter(option => option.props.value !== "").map(option => {
          const optionValue = String(option.props.value ?? option.props.children);
          return <Select.Item className="ui-select-option" key={optionValue} value={optionValue} disabled={option.props.disabled}>
            <Select.ItemText>{option.props.children}</Select.ItemText>
            <Select.ItemIndicator className="ui-select-check"><Check size={17} aria-hidden="true" /></Select.ItemIndicator>
          </Select.Item>;
        })}
      </Select.Viewport>
      {menuVariant === "language" && <div className="language-menu-notice">Translation is not available yet.</div>}
    </Select.Content></Select.Portal>
  </Select.Root>;
}
