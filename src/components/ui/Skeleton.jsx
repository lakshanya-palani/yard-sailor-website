import "./Skeleton.css";

const toSize = (value) => (typeof value === "number" ? `${value}px` : value);

/** A single shimmering placeholder block. Decorative: always aria-hidden. */
export function Skeleton({ width, height, radius, className = "" }) {
  const style = {};
  if (width != null) style.width = toSize(width);
  if (height != null) style.height = toSize(height);
  if (radius != null) style.borderRadius = toSize(radius);
  return <span className={`ui-skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

/** Placeholder shaped like a listing card (square image + text lines). */
export function SkeletonCard({ variant = "product" }) {
  return (
    <div className={`ui-skeleton-card ui-skeleton-card--${variant}`} aria-hidden="true">
      <Skeleton className="ui-skeleton-card__media" radius={0} />
      <div className="ui-skeleton-card__body">
        <Skeleton width="72%" height={18} />
        {variant === "product" ? (
          <>
            <Skeleton width="38%" height={18} />
            <div className="ui-skeleton-card__seller">
              <Skeleton width={26} height={26} radius="50%" />
              <Skeleton width="42%" height={14} />
            </div>
          </>
        ) : (
          <>
            <Skeleton width="58%" height={14} />
            <Skeleton width="46%" height={14} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * A grid of SkeletonCards. Uses the same grid class as CardGrid so the layout
 * doesn't shift when real cards arrive. Announces loading once for screen readers.
 */
export function SkeletonGrid({ variant = "product", count = 4, className = "ui-card-grid", label = "Loading…" }) {
  return (
    <div className={className} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} variant={variant} />)}
    </div>
  );
}
