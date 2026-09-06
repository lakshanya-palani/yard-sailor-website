import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Shop.css";

function Shop() {
  const navigate = useNavigate();
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
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const { data, error: productsError } = await supabase
        .from("products")
        .select("*")
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
    const term = search.trim().toLowerCase();
    const filtered = products.filter((product) =>
      !term || product.title?.toLowerCase().includes(term) || product.description?.toLowerCase().includes(term)
    );

    return [...filtered].sort((a, b) => {
      if (sort === "price-low") return Number(a.price) - Number(b.price);
      if (sort === "price-high") return Number(b.price) - Number(a.price);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [products, search, sort]);

  return (
    <main className="shop-page">
      <div className="shop-container">
        <div className="shop-heading"><h1>Shop</h1><p>Discover items from sellers near you.</p></div>
        <div className="shop-controls">
          <input value={search} onChange={(event) => updateSearch(event.target.value)} onBlur={() => updateSearch(search.trim())} onKeyDown={(event) => { if (event.key === "Enter") updateSearch(search.trim()); }} placeholder="Search products..." aria-label="Search products" />
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products">
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        {loading ? <p className="shop-message">Loading products...</p> : error ? <p className="shop-error">{error}</p> : displayedProducts.length === 0 ? <div className="shop-empty"><h2>No products found.</h2><p>Try changing your search or filters.</p></div> : (
          <div className="shop-grid">
            {displayedProducts.map((product) => {
              const seller = sellers[product.user_id];
              const sellerName = seller?.username?.trim() || "Yard Sailor seller";
              return (
                <article className="shop-card" key={product.id} tabIndex={0} role="link" onClick={() => navigate(`/products/${product.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(`/products/${product.id}`); } }}>
                  <div className="shop-card-image">{product.image_urls?.[0] ? <img src={product.image_urls[0]} alt={product.title} /> : <span>No image</span>}</div>
                  <div className="shop-card-info"><h2>{product.title}</h2><p className="shop-card-price">${Number(product.price).toFixed(2)}</p><div className="shop-card-seller"><span>{seller?.avatar_url ? <img src={seller.avatar_url} alt="" /> : sellerName.charAt(0).toUpperCase()}</span><strong>{sellerName}</strong></div></div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default Shop;
