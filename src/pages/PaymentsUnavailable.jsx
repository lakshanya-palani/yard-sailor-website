import { Link } from "react-router-dom";
import "./Commerce.css";

export default function PaymentsUnavailable() {
  return <main className="commerce-page"><div className="commerce-width"><h1>Payments are unavailable</h1><p>You can save items in your cart and message sellers to arrange a purchase.</p><p><Link to="/cart">View your cart</Link> · <Link to="/shop">Browse the shop</Link></p></div></main>;
}
