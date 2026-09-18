import ShopProductCard from "../components/ShopProductCard";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Shop.css";
import { ITEM_CATEGORIES } from "../lib/itemCategories";
import { filterShopProducts } from "../lib/shopFilters";

function Shop() {
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState({});
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? searchParams.get("search") ?? "";
  const updateSearch = (value) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("search");
      if (value.trim()) next.set("q", value);
      else next.delete("q");
      return next;
    }, { replace: true });
  };
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const { data, error: productsError } = await supabase
        .from("products")
        .select("id,title,description,price,image_urls,user_id,created_at,category")
        .order("created_at", { ascending: false });

      if (productsError) {
        console.error("Unable to load shop products:", productsError);
        setError("Unable to load products. Please try again.");
        setLoading(false);
        return;
      }

      const productRows = data || [];
      setProducts(productRows);
      const sellerIds = [...new Set(productRows.map((product) => product.user_id).filter(Boolean))];

      if (sellerIds.length > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", sellerIds);

        if (profilesError) {
          console.error("Unable to load shop sellers:", profilesError);
        } else {
          setSellers(Object.fromEntries((profileRows || []).map((profile) => [profile.id, profile])));
        }
      }
      setLoading(false);
    }

    loadProducts();
    window.addEventListener("yardSailorProductsUpdated", loadProducts);
    return () => window.removeEventListener("yardSailorProductsUpdated", loadProducts);
  }, []);

  const displayedProducts = useMemo(() => {
    const filtered = filterShopProducts(products, { search, category });

    return [...filtered].sort((a, b) => {
      if (sort === "price-low") return Number(a.price) - Number(b.price);
      if (sort === "price-high") return Number(b.price) - Number(a.price);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [products, search, category, sort]);

  return (
    <main className="shop-page">
      <div className="shop-container">
        <div className="shop-heading"><h1>Shop</h1><p>Discover items from sellers near you.</p></div>
        <div className="shop-controls">
          <input value={search} onChange={(event) => updateSearch(event.target.value)} onBlur={() => updateSearch(search.trim())} onKeyDown={(event) => { if (event.key === "Enter") updateSearch(search.trim()); }} placeholder="Search products..." aria-label="Search products" />
          <select aria-label="Item category" className={category !== "all" ? "shop-category-active" : undefined} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All</option>
            {ITEM_CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products">
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        <p className="shop-result-count" role="status">{!loading && !error ? `${displayedProducts.length} ${displayedProducts.length === 1 ? "item" : "items"} found` : ""}</p>
        {loading ? <p className="shop-message">Loading products...</p> : error ? <p className="shop-error">{error}</p> : displayedProducts.length === 0 ? <div className="shop-empty" role="status"><h2>{category === "all" ? "No products found." : "No items found in this category."}</h2><p>Try changing your search or filters.</p></div> : (
          <div className="shop-grid">
            {displayedProducts.map(product => <ShopProductCard key={product.id} product={product} seller={sellers[product.user_id]} />)}
          </div>
        )}
      </div>
    </main>
  );
}

export default Shop;
