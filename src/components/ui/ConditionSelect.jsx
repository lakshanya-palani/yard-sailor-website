import { SelectField } from "./SelectField";
import { PRODUCT_CONDITIONS } from "../../lib/listingOptions";

export function ConditionSelect({ allowAll = false, placeholder = "Select condition", ...selectProps }) {
  return (
    <SelectField emptyOptionSelectable={allowAll} {...selectProps}>
      <option value="">{allowAll ? "Any condition" : placeholder}</option>
      {PRODUCT_CONDITIONS.map(condition => <option key={condition} value={condition}>{condition}</option>)}
    </SelectField>
  );
}
