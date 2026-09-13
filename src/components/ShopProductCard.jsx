import {Link,useNavigate} from 'react-router-dom';
import SaveButton from './SaveButton';
export default function ShopProductCard({product,seller,unavailable=false}) {
 const navigate=useNavigate();const name=seller?.username?.trim()||'Yard Sailor seller';
 return <article className="shop-card" onClick={()=>navigate(`/products/${product.id}`)}>
  <div className="shop-card-image">{product.image_urls?.[0]?<img src={product.image_urls[0]} alt={product.title} loading="lazy"/>:<span>No image</span>}<SaveButton productId={product.id} title={product.title}/></div>
  <div className="shop-card-info"><h2><Link to={`/products/${product.id}`}>{product.title}</Link></h2><p className="shop-card-price">${Number(product.price).toFixed(2)}</p><div className="shop-card-seller"><span>{seller?.avatar_url?<img src={seller.avatar_url} alt=""/>:name.charAt(0).toUpperCase()}</span><strong>{name}</strong></div>{unavailable&&<p className="saved-availability">Currently unavailable for checkout</p>}</div>
 </article>;
}
