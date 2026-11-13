import { getSaleStatus, saleStatusLabel } from "../../utils/saleTime";
import { Badge } from "../ui/Badge";

const TONES = { live: "live", upcoming: "upcoming", ended: "ended", completed: "ended", cancelled: "danger", draft: "neutral", unknown: "neutral" };

// `openOnly` hides the badge for sales that aren't upcoming or live (card usage).
export function SaleStatusBadge({ sale, now, openOnly = false, className }) {
  const status = getSaleStatus(sale, now);
  if (openOnly && !["upcoming", "live"].includes(status)) return null;
  return <Badge tone={TONES[status] || "neutral"} className={className}>{saleStatusLabel(sale, now)}</Badge>;
}
