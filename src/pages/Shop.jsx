import ShopProductCard from "../components/ShopProductCard";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SaleCard, { ProductSkeleton, SaleSkeleton } from "../components/SaleCard";
import { supabase } from "../lib/supabase";
import { getSaleStatus } from "../utils/saleTime";
import useSaleClock from "../utils/useSaleClock";
import "./Shop.css";

function SectionHeading({ id, title, link }) {
  return <div className="home-section-heading"><h2 id={id}>{title}</h2><Link to={link}>See all <ArrowRight size={17} aria-hidden="true" /></Link></div>;
}

function HomeYardSales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = useSaleClock();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    async function loadSales() {
      const { data, error } = await supabase
        .from("sales")
        .select("id, title, address, images, start_time, end_time, status")
        .in("status", ["upcoming", "live"])
        .order("start_time", { ascending: true });
      if (error) console.error("Unable to load home yard sales:", error);
      setError(Boolean(error));
      setSales(data || []);
      setLoading(false);
    }
    loadSales();
    window.addEventListener("yardSailorYardSalesUpdated", loadSales);
    return () => window.removeEventListener("yardSailorYardSalesUpdated", loadSales);
  }, [retry]);

  // Upcoming sales first, then the most recent past ones, so the section never sits empty.
  const open = sales.filter((sale) => ["upcoming", "live"].includes(getSaleStatus(sale, now)));
  const recent = sales.filter((sale) => !open.includes(sale)).sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  const shown = [...open, ...recent].slice(0, 4);

  return (
    <section className="home-section" aria-labelledby="home-sales-title">
      <SectionHeading id="home-sales-title" title={open.length ? "Upcoming yard sales" : "Recent yard sales"} link="/find-yard-sale" />
      {loading ? <div className="shop-grid">{[0, 1, 2, 3].map((i) => <SaleSkeleton key={i} />)}</div>
        : error ? <p className="shop-error">Unable to load yard sales. <button type="button" onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Try again</button></p>
        : shown.length ? <div className="shop-grid">{shown.map((sale) => <SaleCard key={sale.id} sale={sale} now={now} />)}</div>
        : <p className="home-empty">No yard sales yet. <Link to="/post-yard-sale">Host the first one</Link>.</p>}
    </section>
  );
}

function Shop({ home = false }) {
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState({});
  const [searchParams, setSearchParams] = useSearchParams();
  const search = home ? "" : (searchParams.get("q") ?? searchParams.get("search") ?? "");
  const sort = home ? "newest" : (searchParams.get("sort") || "newest");
  const condition = searchParams.get("condition") || "";
  const category = home ? "" : (searchParams.get("category") || "");  const min = searchParams.get("min") || "";
  const max = searchParams.get("max") || "";
  const queryKey = JSON.stringify([home, search, sort, condition, category, min, max]);
  const [pagination, setPagination] = useState({ key: queryKey, page: 0 });
  const page = pagination.key === queryKey ? pagination.page : 0;
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const updateFilter = (name, value) => setSearchParams(current => {
    const next = new URLSearchParams(current);
    if (value) next.set(name, value); else next.delete(name);
    return next;
  }, { replace: true });

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      setLoading(true);
      setError("");
      let query = supabase.from("products")
        .select("id,title,description,price,image_urls,user_id,created_at,condition,pickup,shipping", { count: "exact" });
      if (search.trim()) {
        const term = search.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        query = query.or(`title.ilike."%${term}%",description.ilike."%${term}%"`);
      }
      if (!home && condition) query = query.eq("condition", condition);
      if (!home && category) query = query.eq("category", category);
      if (!home && min !== "" && Number.isFinite(Number(min)) && Number(min) >= 0) query = query.gte("price", Number(min));
      if (!home && max !== "" && Number.isFinite(Number(max)) && Number(max) >= 0) query = query.lte("price", Number(max));
      query = query.order(sort === "price-low" || sort === "price-high" ? "price" : "created_at", { ascending: sort === "price-low" })
        .order("id", { ascending: true }).range(home ? 0 : page * 24, home ? 7 : page * 24 + 23);
      const { data, error: productsError, count: total } = await query;
      if (!active) return;
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
        const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
        if (!active) return;
        if (profilesError) console.error("Unable to load shop sellers:", profilesError);
        setSellers(current => ({ ...(page ? current : {}), ...Object.fromEntries((profiles || []).map(profile => [profile.id, profile])) }));
      } else setSellers({});
      setLoading(false);
    }
    loadProducts();
    window.addEventListener("yardSailorProductsUpdated", loadProducts);
    return () => { active = false; window.removeEventListener("yardSailorProductsUpdated", loadProducts); };
  }, [home, search, sort, condition, category, min, max, page, retry]);

  return (
    <main className="shop-page">
      <div className="shop-container">
        {home ? <header className="home-intro">
          <h1>Find what’s around the corner.</h1>
          <Link to="/about">New here? See how it works <ArrowRight size={17} aria-hidden="true" /></Link>
        </header> : <div className="shop-heading"><h1>Shop</h1><p>Discover secondhand items from the community.</p></div>}
        {!home && <>
          {search && <p>Search results for “{search}”</p>}
          <div className="shop-controls">
            <label>Sort <select value={sort} onChange={event => updateFilter("sort", event.target.value)}><option value="newest">Newest</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option></select></label>
            <label>Condition <select value={condition} onChange={event => updateFilter("condition", event.target.value)}><option value="">Any condition</option>{["New", "Like New", "Good", "Fair", "Poor"].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Category <select value={searchParams.get("category") || ""} onChange={(event) => updateFilter("category", event.target.value)}> <option value="">All categories</option> <option value="furniture">Furniture</option> <option value="clothing">Clothing & Accessories</option> <option value="electronics">Electronics</option> <option value="collectibles">Collectibles</option> <option value="home & kitchen">Home & Kitchen</option> <option value="sports & outdoors">Sports & Outdoors</option> <option value="books & media">Books & Media</option> <option value="other">Other</option> </select> </label>            <label>Min price <input type="number" min="0" step="0.01" value={min} onChange={event => updateFilter("min", event.target.value)} /></label>
            <label>Max price <input type="number" min="0" step="0.01" value={max} onChange={event => updateFilter("max", event.target.value)} /></label>
            <button type="button" onClick={() => setSearchParams({})}>Reset</button>
          </div>
          {!loading && !error && <p className="shop-count" role="status">{count} {count === 1 ? "result" : "results"}</p>}
        </>}

        {home ? <section className="home-section" aria-labelledby="home-finds-title">
          <SectionHeading id="home-finds-title" title="Fresh finds" link="/shop" />
          {loading ? <div className="shop-grid">{[0, 1, 2, 3].map((i) => <ProductSkeleton key={i} />)}</div>
            : error ? <p className="shop-error">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></p>
            : products.length ? <div className="shop-grid">{products.slice(0, 8).map(product => <ShopProductCard key={product.id} product={product} seller={sellers[product.user_id]} />)}</div>
            : <p className="home-empty">No items yet. <Link to="/post-sale">Post the first one</Link>.</p>}
        </section> : loading ? <p className="shop-message">Loading products...</p> : error ? <p className="shop-error">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></p> : products.length === 0 ? <div className="shop-empty"><h2>No products found.</h2><p>Try changing your search or filters.</p></div> : (
          <div className="shop-grid">
            {products.map(product => <ShopProductCard key={product.id} product={product} seller={sellers[product.user_id]} />)}
          </div>
        )}
        {!home && !loading && !error && products.length < count && <button className="shop-load-more" type="button" onClick={() => setPagination({ key: queryKey, page: page + 1 })}>Load more</button>}
        {home && <HomeYardSales />}
        {home && <p className="home-sell">Have something to pass on? <Link to="/post-sale">Post an item</Link> or <Link to="/post-yard-sale">host a yard sale</Link>.</p>}
      </div>
    </main>
  );
}

export default Shop;
