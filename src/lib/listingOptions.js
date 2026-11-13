export { PRODUCT_CATEGORIES } from "./listingEditor";

export const PRODUCT_CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"];

// Display labels for the stored (lowercase) category values.
export const PRODUCT_CATEGORY_LABELS = {
  furniture: "Furniture",
  clothing: "Clothing & Accessories",
  electronics: "Electronics",
  collectibles: "Collectibles",
  "home & kitchen": "Home & Kitchen",
  "sports & outdoors": "Sports & Outdoors",
  "books & media": "Books & Media",
  other: "Other",
};

export function categoryLabel(value) {
  if (!value) return "";
  return PRODUCT_CATEGORY_LABELS[value] || value.replace(/\b\w/g, char => char.toUpperCase());
}
