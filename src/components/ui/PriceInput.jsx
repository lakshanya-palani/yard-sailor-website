import { TextInput } from "./TextInput";

export function PriceInput({ min = 0, step = 0.01, placeholder = "0.00", ...props }) {
  return (
    <TextInput
      leadingIcon="$"
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      placeholder={placeholder}
      {...props}
    />
  );
}
