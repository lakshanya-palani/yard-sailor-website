import SelectField from "../components/SelectField";
import ShopProductCard from "../components/ShopProductCard";
import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    async function loadSales() {
      const { data, error } = await supabase
        .from("sales")
        .select("id, title, address, images, start_time, end_time, status")
        .in("status", ["upcoming", "live"])
        .order("start_time", { ascending: false });
      if (error) console.error("Unable to load home yard sales:", error);
      setSales(data || []);
      setLoading(false);
    }
    loadSales();
    window.addEventListener("yardSailorYardSalesUpdated", loadSales);
    return () => window.removeEventListener("yardSailorYardSalesUpdated", loadSales);
  }, []);

  // Upcoming sales first, then the most recent past ones, so the section never sits empty.
  const open = sales.filter((sale) => ["upcoming", "live"].includes(getSaleStatus(sale, now)));
  const shown = [...open, ...sales.filter((sale) => !open.includes(sale))].slice(0, 4);

  return (
    <section className="home-section" aria-labelledby="home-sales-title">
      <SectionHeading id="home-sales-title" title={open.length ? "Upcoming yard sales" : "Recent yard sales"} link="/find-yard-sale" />
      {loading ? <div className="shop-grid">{[0, 1, 2, 3].map((i) => <SaleSkeleton key={i} />)}</div>
        : shown.length ? <div className="shop-grid">{shown.map((sale) => <SaleCard key={sale.id} sale={sale} now={now} />)}</div>
        : <p className="home-empty">No yard sales yet. <Link to="/post-yard-sale">Host the first one</Link>.</p>}
    </section>
  );
}

function Shop({ home = false }) {
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
        .select("id,title,description,price,image_urls,user_id,created_at")
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
        {home ? <header className="home-intro">
          <h1>Find what’s around the corner.</h1>
          <Link to="/about">New here? See how it works <ArrowRight size={17} aria-hidden="true" /></Link>
        </header> : <div className="shop-heading"><h1>Shop</h1><p>Discover items from sellers near you.</p></div>}
        {!home && <div className="shop-controls">
          <input value={search} onChange={(event) => updateSearch(event.target.value)} onBlur={() => updateSearch(search.trim())} onKeyDown={(event) => { if (event.key === "Enter") updateSearch(search.trim()); }} placeholder="Search products..." aria-label="Search products" />
          <SelectField value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products">
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </SelectField>
        </div>}

        {home ? <section className="home-section" aria-labelledby="home-finds-title">
          <SectionHeading id="home-finds-title" title="Fresh finds" link="/shop" />
          {loading ? <div className="shop-grid">{[0, 1, 2, 3].map((i) => <ProductSkeleton key={i} />)}</div>
            : error ? <p className="shop-error">{error}</p>
            : products.length ? <div className="shop-grid">{products.slice(0, 8).map(product => <ShopProductCard key={product.id} product={product} seller={sellers[product.user_id]} />)}</div>
            : <p className="home-empty">No items yet. <Link to="/post-sale">Post the first one</Link>.</p>}
        </section> : loading ? <p className="shop-message">Loading products...</p> : error ? <p className="shop-error">{error}</p> : displayedProducts.length === 0 ? <div className="shop-empty"><h2>No products found.</h2><p>Try changing your search or filters.</p></div> : (
          <div className="shop-grid">
            {displayedProducts.map(product => <ShopProductCard key={product.id} product={product} seller={sellers[product.user_id]} />)}
          </div>
        )}
        {home && <HomeYardSales />}
        {home && <p className="home-sell">Have something to pass on? <Link to="/post-sale">Post an item</Link> or <Link to="/post-yard-sale">host a yard sale</Link>.</p>}
      </div>
    </main>
  );
}

export default Shop;
