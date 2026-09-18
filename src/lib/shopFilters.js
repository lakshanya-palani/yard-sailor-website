// Keep independent filter predicates together so additional filters compose with search.
export function filterShopProducts(products, { search = "", category = "all" } = {}) {
  const term = search.trim().toLowerCase();
  return products.filter((product) => {
    const matchesSearch = !term || product.title?.toLowerCase().includes(term)
      || product.description?.toLowerCase().includes(term);
    const matchesCategory = category === "all" || (product.category || "other") === category;
    return matchesSearch && matchesCategory;
  });
}
