import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Store } from 'lucide-react';
import SailingHero from '../components/SailingHero';
import ShopProductCard from '../components/ShopProductCard';
import SaleCard, { ProductSkeleton, SaleSkeleton } from '../components/SaleCard';
import { supabase } from '../lib/supabase';
import { getSaleStatus } from '../utils/saleTime';
import useSaleClock from '../utils/useSaleClock';
import '../components/ui.css';
import './Shop.css';
import './PostSale.css';
import './About.css';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useAboutData() {
  const [data, setData] = useState({ products: [], sellers: {}, sales: [], productCount: null, loading: true });
  useEffect(() => {
    let active = true;
    (async () => {
      const [products, sales] = await Promise.all([
        supabase.from('products').select('id,title,price,image_urls,user_id,brand,condition,pickup,shipping', { count: 'exact' }).order('created_at', { ascending: false }).limit(8),
        supabase.from('sales').select('id,title,address,images,start_time,end_time,status').in('status', ['upcoming', 'live']).order('start_time', { ascending: false }),
      ]);
      if (products.error) console.error('Unable to load about products:', products.error);
      if (sales.error) console.error('Unable to load about yard sales:', sales.error);
      const productRows = products.data || [];
      const sellerIds = [...new Set(productRows.map(product => product.user_id).filter(Boolean))];
      const profiles = sellerIds.length ? await supabase.from('profiles').select('id, username, avatar_url').in('id', sellerIds) : { data: [] };
      if (!active) return;
      setData({
        products: productRows,
        sellers: Object.fromEntries((profiles.data || []).map(profile => [profile.id, profile])),
        sales: sales.data || [],
        productCount: products.error ? null : products.count ?? productRows.length,
        loading: false,
      });
    })();
    return () => { active = false; };
  }, []);
  return data;
}

function useCountUp(target) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null || prefersReducedMotion()) return;
    let frame;
    const start = performance.now();
    const tick = now => {
      const t = Math.min((now - start) / 900, 1);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return prefersReducedMotion() ? target : value;
}

function Stat({ value, label }) {
  const shown = useCountUp(value);
  return <div className="about-stat"><strong>{value == null ? '—' : shown.toLocaleString()}</strong><span>{label}</span></div>;
}

// A static, filled-in copy of the real sell form, built from the same markup and styles.
function SellFormPreview({ product }) {
  const photos = product.image_urls?.slice(0, 3) || [];
  return <div className="about-sell-preview">
    <div className="form-section">
      <div className="section-heading"><h2>Photos</h2><span>{photos.length}/8</span></div>
      <div className="image-grid">
        {photos.map((url, index) => <div className="image-preview" key={url}><img src={url} alt=""/>{index === 0 && <span className="cover-label">Cover</span>}</div>)}
        <div className="image-upload-box"><span className="upload-plus">+</span><span>Add Photo</span></div>
      </div>
    </div>
    <div className="sale-details-grid form-section">
      <div><span className="input-label">Price</span><div className="sale-input">{product.price != null ? Number(product.price).toFixed(2) : '\u00a0'}</div></div>
      <div><span className="input-label">Brand</span><div className="sale-input">{product.brand || 'Brand (optional)'}</div></div>
      <div><span className="input-label">Condition</span><div className="sale-input">{product.condition || '\u00a0'}</div></div>
    </div>
    <div className="form-section"><span className="input-label">Title</span><div className="sale-input">{product.title || '\u00a0'}</div></div>
    <div className="form-section">
      <h2>How can buyers get it?</h2>
      <div className="delivery-options">
        <div className={`delivery-option ${product.pickup !== false ? 'selected' : ''}`}><div><strong>Local Pickup</strong><span>Buyer picks it up from you</span></div><div className="delivery-check">{product.pickup !== false && '✓'}</div></div>
        <div className={`delivery-option ${product.shipping ? 'selected' : ''}`}><div><strong>Shipping</strong><span>Ship the item to the buyer</span></div><div className="delivery-check">{product.shipping && '✓'}</div></div>
      </div>
    </div>
  </div>;
}

function FeatureRow({ title, copy, link, action, path, children }) {
  return <section className="about-feature-row about-width" data-reveal aria-label={title}>
    <div className="about-feature-copy">
      <h3>{title}</h3>
      <p>{copy}</p>
      <Link className="ui-button" to={link}>{action} <ArrowRight size={18} aria-hidden="true"/></Link>
    </div>
    <figure className="about-visual">
      <div className="about-visual-bar" aria-hidden="true"><span/><span/><span/><code>{path}</code></div>
      <div className="about-visual-body">{children}</div>
    </figure>
  </section>;
}

export default function About() {
  const page = useRef(null);
  const { products, sellers, sales, productCount, loading } = useAboutData();
  const now = useSaleClock(sales);
  const openSales = sales.filter(sale => ['upcoming', 'live'].includes(getSaleStatus(sale, now)));
  // Upcoming sales first, then the most recent past postings, so real listings always show.
  const featuredSales = [...openSales, ...sales.filter(sale => !openSales.includes(sale))];
  const heroSale = featuredSales.find(sale => sale.images?.[0]) || featuredSales[0];
  const heroProduct = products.find(product => product.image_urls?.[0]) || products[0];

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .15 });
    page.current.querySelectorAll('[data-reveal]').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return <main className="about-page" ref={page}>
    <header className="about-hero">
      <div className="about-hero-inner about-width">
        <div className="about-hero-copy">
          <h1>Yard sales and secondhand finds, <span>near you.</span></h1>
          <p className="about-lede">Yard Sailor is a local marketplace. Find yard sales to visit, buy single items from neighbors, or sell your own.</p>
          <div className="about-hero-actions"><Link className="ui-button about-button-red" to="/find-yard-sale"><MapPin size={18} aria-hidden="true"/> Find a yard sale</Link><Link className="ui-button ui-button-secondary" to="/shop"><Store size={18} aria-hidden="true"/> Shop items</Link></div>
          <div className="about-stats"><Stat value={loading ? null : productCount} label="Items for sale"/>{(loading || openSales.length > 0) && <Stat value={loading ? null : openSales.length} label="Upcoming yard sales"/>}</div>
        </div>
        {(loading || heroSale || heroProduct) && <div className="about-hero-cards">
          {/* One slot per card, so the entrance animation runs once and only the contents swap. */}
          {(loading || heroSale) && <figure className="about-hero-card"><figcaption>A yard sale</figcaption>{heroSale ? <SaleCard sale={heroSale} now={now}/> : <SaleSkeleton/>}</figure>}
          {(loading || heroProduct) && <figure className="about-hero-card"><figcaption>An item for sale</figcaption>{heroProduct ? <ShopProductCard product={heroProduct} seller={sellers[heroProduct.user_id]}/> : <ProductSkeleton/>}</figure>}
        </div>}
      </div>
    </header>

    <h2 className="about-features-title about-width">What you can do on Yard Sailor</h2>

    <FeatureRow title="Find yard sales" copy="See local yard sales with dates, times, and photos, then plan your stops." link="/find-yard-sale" action="Open the map" path="/find-yard-sale">
      {loading ? <div className="about-sale-list"><SaleSkeleton/><SaleSkeleton/></div> : featuredSales.length ? <div className="about-sale-list">{featuredSales.slice(0, 2).map(sale => <SaleCard key={sale.id} sale={sale} now={now}/>)}</div> : <p className="about-muted">No yard sales yet. <Link to="/post-yard-sale">Post the first one</Link>.</p>}
    </FeatureRow>

    <FeatureRow title="Shop secondhand items" copy="Browse single items from people nearby. Save favorites and message the seller." link="/shop" action="Browse the shop" path="/shop">
      {loading ? <div className="shop-grid about-items-grid"><ProductSkeleton/><ProductSkeleton/><ProductSkeleton/></div> : products.length ? <div className="shop-grid about-items-grid">{products.slice(0, 3).map(product => <ShopProductCard key={product.id} product={product} seller={sellers[product.user_id]}/>)}</div> : <p className="about-muted">No items yet. <Link to="/post-sale">Post the first one</Link>.</p>}
    </FeatureRow>

    <FeatureRow title="Sell your stuff" copy="Add photos, a price, and how buyers can get it. Hosting a yard sale? Put it on the map instead." link="/post-sale" action="Post an item" path="/post-sale">
      <div aria-hidden="true"><SellFormPreview product={heroProduct || (loading ? {} : { title: 'What are you selling?', price: 0 })}/></div>
    </FeatureRow>

    <section className="about-cta about-width" data-reveal aria-labelledby="about-cta-title">
      <SailingHero/>
      <div className="about-cta-copy"><h2 id="about-cta-title">Set sail this weekend.</h2><p>Your next favorite thing is probably a few streets away.</p><div className="about-hero-actions"><Link className="ui-button about-button-cream" to="/find-yard-sale">Find a yard sale <ArrowRight size={18} aria-hidden="true"/></Link><Link className="ui-button about-button-ghost" to="/shop">Shop items</Link></div></div>
    </section>
  </main>;
}
