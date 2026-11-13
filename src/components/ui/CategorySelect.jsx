import { SelectField } from "./SelectField";
import { PRODUCT_CATEGORIES, categoryLabel } from "../../lib/listingOptions";

export function CategorySelect({ allowAll = false, placeholder = "Select category", ...selectProps }) {
  return (
    <SelectField emptyOptionSelectable={allowAll} {...selectProps}>
      <option value="">{allowAll ? "All categories" : placeholder}</option>
      {PRODUCT_CATEGORIES.map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}
    </SelectField>
  );
}
