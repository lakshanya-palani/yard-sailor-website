import { Link } from "react-router-dom";
import SaveButton from "./SaveButton";

export default function ShopProductCard({ product, seller, unavailable = false }) {
  const name = seller?.username?.trim() || "Yard Sailor seller";
  const destination = `/products/${product.id}`;
  return <article className="shop-card ui-card">
    <div className="shop-card-image"><Link to={destination} aria-label={`View ${product.title}`}>{product.image_urls?.[0] ? <img src={product.image_urls[0]} alt="" loading="lazy" /> : <span>No image</span>}</Link><SaveButton productId={product.id} title={product.title} /></div>
    <div className="shop-card-info"><h2><Link to={destination}>{product.title}</Link></h2><p className="shop-card-price">${Number(product.price).toFixed(2)}</p><p className="shop-card-details">{product.condition || "Condition not specified"}{product.pickup && " · Pickup"}{product.shipping && " · Shipping"}</p><div className="shop-card-seller"><span>{seller?.avatar_url ? <img src={seller.avatar_url} alt="" /> : name.charAt(0).toUpperCase()}</span><strong>{name}</strong></div>{unavailable && <p className="saved-availability">Currently unavailable for checkout</p>}</div>
  </article>;
}
