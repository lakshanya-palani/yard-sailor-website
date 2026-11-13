import { ProductCard } from "./listing/ProductCard";

/** Shop/Saved/About product card, now the shared marketplace listing card. */
export default function ShopProductCard({ product, seller, unavailable = false }) {
  return <ProductCard product={product} seller={seller} unavailable={unavailable} />;
}
