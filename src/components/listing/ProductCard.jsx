import SaveButton from "../SaveButton";
import { DeliveryTags } from "./DeliveryTags";
import { ListingCard } from "./ListingCard";
import { SellerChip } from "./SellerChip";

/**
 * A products row ({ id, title, price, image_urls, condition, brand, pickup, shipping, user_id })
 * as a ListingCard. `seller` is the profiles row for product.user_id (or null).
 * A `now` prop is accepted (ignored) for symmetry with SaleListingCard.
 */
export function ProductCard({ product, seller, showSeller = true, showSave = true, showDescription = false, actions, unavailable = false, variant = "grid", headingLevel = 3, className }) {
  if (!product) return null;
  const details = [product.condition || "Condition not specified", product.brand?.trim()].filter(Boolean).join(" · ");
  return (
    <ListingCard
      to={`/products/${product.id}`}
      image={product.image_urls?.[0]}
      imageAlt=""
      fallbackLabel="No image"
      title={product.title}
      price={product.price}
      meta={[details]}
      footer={showSeller ? <SellerChip profile={seller} size={26} /> : null}
      overlay={showSave ? <SaveButton productId={product.id} title={product.title} /> : null}
      actions={actions}
      variant={variant}
      headingLevel={headingLevel}
      className={className}
    >
      {showDescription && product.description && <p className="listing-card__description">{product.description}</p>}
      <DeliveryTags pickup={product.pickup} shipping={product.shipping} />
      {unavailable && <p className="listing-card__note saved-availability">Currently unavailable for checkout</p>}
    </ListingCard>
  );
}
