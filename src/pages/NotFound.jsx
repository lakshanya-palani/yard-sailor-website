import { Link } from "react-router-dom";
import "./Shop.css";

export default function NotFound() {
  return <main className="shop-page"><div className="shop-container shop-empty"><h1>Page not found</h1><p>That page may have moved. Find something new or return home.</p><p><Link to="/shop">Browse the shop</Link> · <Link to="/">Go home</Link></p></div></main>;
}
