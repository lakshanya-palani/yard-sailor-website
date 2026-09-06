import { Link } from "react-router-dom";
import "./MarketplaceVisual.css";

export default function MarketplaceVisual({ products = [] }) {
  return <div className="marketplace-visual">
    <div className="marketplace-caption"><span>THE NEIGHBORHOOD EDIT</span><span>Yard Sailor ↗</span></div>
    <div className="marketplace-stack">
      {products.slice(0, 3).map((product, index) => <Link to={`/products/${product.id}`} className={`marketplace-item scene-layer marketplace-item-${index}`} key={product.id}>
        {product.image_urls?.[0] ? <img src={product.image_urls[0]} alt={product.title} loading="lazy" decoding="async" /> : <div className="marketplace-no-image">A second life starts here.</div>}
        <div><strong>{product.title}</strong><span>${Number(product.price).toFixed(2)}</span></div>
      </Link>)}
      {products.length === 0 && <div className="marketplace-empty scene-layer"><img src="/images/logo_bubble_green.png" alt="" /><p>A little closer.<br />A little more possibility.</p><Link to="/shop">Explore the marketplace ↗</Link></div>}
    </div>
    <Link className="marketplace-local scene-layer" to="/find-yard-sale"><span aria-hidden="true">⌖</span><div><strong>Your next stop could be nearby.</strong><span>Explore local yard sales ↗</span></div></Link>
  </div>;
}
