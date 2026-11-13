import { isValidElement, useState } from "react";
import { Link } from "react-router-dom";
import { Price } from "../ui/Price";
import "./ListingCard.css";

const VARIANTS = ["grid", "row", "compact"];

/** Card image with lazy loading and a labelled fallback panel when missing or broken. */
function ListingImage({ src, alt, fallbackLabel }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) {
    return <span className="listing-card__fallback">{fallbackLabel}</span>;
  }
  return <img className="listing-card__img" src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} />;
}

function isMetaObject(item) {
  return item && typeof item === "object" && !isValidElement(item) && "text" in item;
}

function renderPrice(price) {
  if (price == null || price === "" || price === false) return null;
  if (typeof price === "number" || typeof price === "string") return <Price value={price} className="listing-card__price" />;
  return <div className="listing-card__price">{price}</div>;
}

/**
 * Shared listing card. The title is a real <Link> whose ::after stretches over the
 * whole card, so the card is clickable while `overlay` and `actions` remain separate,
 * focusable controls (nothing interactive is nested inside the <a>).
 *
 * meta: array of nodes or { icon, text } items (falsy entries skipped).
 * price: number/string (dollars, formatted with Price) or a node.
 */
export function ListingCard({
  to,
  image,
  imageAlt = "",
  imageRatio = "1/1",
  fallbackLabel = "No image",
  title,
  price,
  badge,
  meta = [],
  footer,
  overlay,
  actions,
  variant = "grid",
  headingLevel = 3,
  className,
  children,
}) {
  const kind = VARIANTS.includes(variant) ? variant : "grid";
  const Heading = `h${Math.min(6, Math.max(1, headingLevel))}`;
  const metaItems = (meta || []).filter(Boolean);
  const classes = [
    "listing-card",
    `listing-card--${kind}`,
    overlay && "listing-card--has-overlay",
    actions && "listing-card--has-actions",
    className,
  ].filter(Boolean).join(" ");

  return (
    <article className={classes}>
      <div className="listing-card__media" style={kind === "row" ? undefined : { aspectRatio: imageRatio }}>
        <ListingImage src={image} alt={imageAlt} fallbackLabel={fallbackLabel} />
      </div>
      <div className="listing-card__body">
        {badge && <div className="listing-card__badge">{badge}</div>}
        <Heading className="listing-card__title">
          <Link to={to} className="listing-card__link">{title}</Link>
        </Heading>
        {renderPrice(price)}
        {metaItems.length > 0 && (
          <ul className="listing-card__meta">
            {metaItems.map((item, index) => (
              <li key={index} className="listing-card__meta-item">
                {isMetaObject(item) ? (
                  <>
                    {item.icon && <span className="listing-card__meta-icon" aria-hidden="true">{item.icon}</span>}
                    <span>{item.text}</span>
                  </>
                ) : item}
              </li>
            ))}
          </ul>
        )}
        {children}
        {footer && <div className="listing-card__footer">{footer}</div>}
      </div>
      {overlay && <div className="listing-card__overlay">{overlay}</div>}
      {actions && <div className="listing-card__actions">{actions}</div>}
    </article>
  );
}
