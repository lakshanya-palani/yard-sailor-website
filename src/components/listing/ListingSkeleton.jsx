import { Skeleton } from "../ui/Skeleton";
import "./ListingCard.css";

/**
 * Placeholder built on the ListingCard frame (same classes), so grid/row/compact
 * dimensions match the real card. Decorative: aria-hidden.
 */
export function ListingSkeleton({ variant = "grid", imageRatio = "1/1", seller = variant !== "compact", lines = 1 }) {
  const isRow = variant === "row";
  return (
    <div className={`listing-card listing-card--${variant} listing-skeleton`} aria-hidden="true">
      <div className="listing-card__media" style={isRow ? undefined : { aspectRatio: imageRatio }}>
        <Skeleton />
      </div>
      <div className="listing-card__body">
        <Skeleton width="78%" height={18} />
        <Skeleton width="34%" height={18} />
        {Array.from({ length: lines }, (_, i) => <Skeleton key={i} width={`${58 - i * 12}%`} height={14} />)}
        {seller && (
          <div className="listing-card__footer listing-skeleton__seller">
            <Skeleton width={26} height={26} radius="50%" />
            <Skeleton width="42%" height={14} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * `count` skeletons with one loading announcement. Defaults to the CardGrid class for grid
 * (pass the real grid's className to match), or a stacked list for row.
 */
export function ListingSkeletonGroup({ variant = "grid", count = 4, className, label = "Loading…", ...cardProps }) {
  const classes = [variant === "row" ? "listing-skeleton-group listing-skeleton-group--row" : "ui-card-grid", className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => <ListingSkeleton key={i} variant={variant} {...cardProps} />)}
    </div>
  );
}
