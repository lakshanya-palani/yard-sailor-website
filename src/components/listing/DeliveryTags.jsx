import { Package, Truck } from "lucide-react";
import { Badge } from "../ui/Badge";
import "./DeliveryTags.css";

// Shows how a buyer can receive an item. Renders nothing when neither is offered.
export function DeliveryTags({ pickup, shipping, className }) {
  if (!pickup && !shipping) return null;
  return <ul className={["listing-delivery", className].filter(Boolean).join(" ")} aria-label="Delivery options">
    {pickup && <li><Badge tone="success" icon={<Package size={13} />}>Pickup</Badge></li>}
    {shipping && <li><Badge tone="success" icon={<Truck size={13} />}>Shipping</Badge></li>}
  </ul>;
}
