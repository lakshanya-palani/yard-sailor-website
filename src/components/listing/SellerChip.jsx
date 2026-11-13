import { Avatar } from "../ui/Avatar";
import "./SellerChip.css";

// "Listed by" / "Hosted by" row. `profile` is a profiles row ({ username, avatar_url }) or null.
export function SellerChip({ profile, label, size = 32, fallbackName = "Yard Sailor seller", className }) {
  const name = profile?.username?.trim() || fallbackName;
  return <div className={["listing-seller", className].filter(Boolean).join(" ")}>
    <Avatar src={profile?.avatar_url} name={name} size={size} alt="" />
    <span className="listing-seller__text">
      {label && <span className="listing-seller__label">{label}</span>}
      <strong className="listing-seller__name">{name}</strong>
    </span>
  </div>;
}
