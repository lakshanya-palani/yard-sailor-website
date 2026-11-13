import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { fetchProfilesByIds } from "../lib/profiles";
import { SelectField } from "../components/ui/SelectField";
import ShopProductCard from "../components/ShopProductCard";
import { PageShell } from "../components/layout/PageShell";
import { PageHeader } from "../components/layout/PageHeader";
import { CardGrid } from "../components/layout/CardGrid";
import { CategorySelect } from "../components/ui/CategorySelect";
import { ConditionSelect } from "../components/ui/ConditionSelect";
import { PriceInput } from "../components/ui/PriceInput";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { ListingSkeletonGroup } from "../components/listing/ListingSkeleton";
import "./Shop.css";

function Shop() {
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState({});
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") || "newest";
  const condition = searchParams.get("condition") || "";
  const category = searchParams.get("category") || "";
  const min = searchParams.get("min") || "";
  const max = searchParams.get("max") || "";
  const queryKey = JSON.stringify([search, sort, condition, category, min, max]);
  const [pagination, setPagination] = useState({ key: queryKey, page: 0 });
  const page = pagination.key === queryKey ? pagination.page : 0;
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const requestRef = useRef(0);
  const updateFilter = (name, value) => setSearchParams(current => {
    const next = new URLSearchParams(current);
    if (value) next.set(name, value); else next.delete(name);
    return next;
  }, { replace: true });

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      // The event listener can fire while a previous load is still in flight;
      // only the newest request may write state.
      const request = ++requestRef.current;
      const isCurrent = () => active && request === requestRef.current;
      setLoading(true);
      setError("");
      let query = supabase.from("products")
        .select("id,title,description,price,image_urls,user_id,created_at,condition,pickup,shipping", { count: "exact" });
      if (search.trim()) {
        const term = search.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        query = query.or(`title.ilike."%${term}%",description.ilike."%${term}%"`);
      }
      if (condition) query = query.eq("condition", condition);
      if (category) query = query.eq("category", category);
      if (min !== "" && Number.isFinite(Number(min)) && Number(min) >= 0) query = query.gte("price", Number(min));
      if (max !== "" && Number.isFinite(Number(max)) && Number(max) >= 0) query = query.lte("price", Number(max));
      query = query.order(sort === "price-low" || sort === "price-high" ? "price" : "created_at", { ascending: sort === "price-low" })
        .order("id", { ascending: true }).range(page * 24, page * 24 + 23);
      const { data, error: productsError, count: total } = await query;
      if (!isCurrent()) return;
      if (productsError) {
        console.error("Unable to load shop products:", productsError);
        setError("Unable to load products. Please try again.");
        setLoading(false);
        return;
      }
      const rows = data || [];
      setProducts(current => page === 0 ? rows : [...current.slice(0, page * 24), ...rows]);
      setCount(total ?? rows.length);
      const ids = [...new Set(rows.map(product => product.user_id).filter(Boolean))];
      if (ids.length) {
        const profiles = await fetchProfilesByIds(ids, { errorLog: "Unable to load shop sellers:" });
        if (!isCurrent()) return;
        setSellers(current => ({ ...(page ? current : {}), ...profiles }));
      } else setSellers({});
      setLoading(false);
    }
    loadProducts();
    window.addEventListener("yardSailorProductsUpdated", loadProducts);
    return () => { active = false; window.removeEventListener("yardSailorProductsUpdated", loadProducts); };
  }, [search, sort, condition, category, min, max, page, retry]);

  return (
    <PageShell>
      <PageHeader title="Shop" subtitle="Discover secondhand items from the community." />
      {search && <p>Search results for “{search}”</p>}
      <div className="shop-controls">
        <label>Sort <SelectField value={sort} onChange={event => updateFilter("sort", event.target.value)}><option value="newest">Newest</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option></SelectField></label>
        <label>Condition <ConditionSelect allowAll value={condition} onChange={event => updateFilter("condition", event.target.value)} /></label>
        <label>Category <CategorySelect allowAll value={category} onChange={event => updateFilter("category", event.target.value)} /></label>
        <label>Min price <PriceInput min="0" step="0.01" value={min} onChange={event => updateFilter("min", event.target.value)} /></label>
        <label>Max price <PriceInput min="0" step="0.01" value={max} onChange={event => updateFilter("max", event.target.value)} /></label>
        <Button type="button" variant="secondary" onClick={() => setSearchParams({})}>Reset</Button>
      </div>
      {!loading && !error && <p className="shop-count" role="status">{count} {count === 1 ? "result" : "results"}</p>}
      {loading ? <ListingSkeletonGroup count={8} label="Loading products…" /> : error ? <StatusMessage kind="error" title={error} onRetry={() => setRetry(value => value + 1)} /> : products.length === 0 ? <StatusMessage title="No products found."><p>Try changing your search or filters.</p></StatusMessage> : (
        <CardGrid columns={{ base: 2, md: 3, lg: 4 }}>
          {products.map(product => <ShopProductCard key={product.id} product={product} seller={sellers[product.user_id]} />)}
        </CardGrid>
      )}
      {!loading && !error && products.length < count && <Button className="shop-load-more" variant="secondary" onClick={() => setPagination({ key: queryKey, page: page + 1 })}>Load more</Button>}
    </PageShell>
  );
}

export default Shop;
