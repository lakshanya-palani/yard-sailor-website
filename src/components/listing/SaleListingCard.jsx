import { CalendarDays, MapPin, Navigation } from "lucide-react";
import { formatDistance, formatSaleStart } from "../../lib/format";
import { getPublicLocation } from "../../utils/location";
import { isSaleOpen } from "../../utils/saleStatus";
import { ListingCard } from "./ListingCard";
import { SaleStatusBadge } from "./SaleStatusBadge";

/**
 * A yard_sales row ({ id, title, images, start_time, end_time, address, status }) as a ListingCard.
 * Grid/compact show the status badge only while upcoming/live (like SaleCard); row always shows it
 * (like FindYardSale results). `distance` is miles and defaults to sale.distance.
 * `number` renders a map pin badge ("Map pin 3" for screen readers).
 */
export function SaleListingCard({ sale, now, variant = "grid", distance = sale?.distance, actions, number, headingLevel = 3, imageRatio, className }) {
  if (!sale) return null;
  const isRow = variant === "row";
  const distanceText = formatDistance(distance);
  const status = isRow || isSaleOpen(sale, now) ? <SaleStatusBadge sale={sale} now={now} /> : null;
  const pin = number != null ? <span className="listing-pin"><span className="sr-only">Map pin </span>{number}</span> : null;
  const badge = pin || status ? <>{pin}{status}</> : null;

  return (
    <ListingCard
      to={`/yard-sale/${sale.id}`}
      image={sale.images?.[0]}
      imageAlt=""
      imageRatio={imageRatio || (variant === "compact" ? "16/10" : "1/1")}
      fallbackLabel="Yard Sale"
      title={sale.title}
      badge={badge}
      meta={[
        { icon: <CalendarDays />, text: formatSaleStart(sale, isRow ? "Time not specified" : undefined) },
        { icon: <MapPin />, text: getPublicLocation(sale.address) },
        distanceText && { icon: <Navigation />, text: distanceText },
      ]}
      actions={actions}
      variant={variant}
      headingLevel={headingLevel}
      className={className}
    />
  );
}
