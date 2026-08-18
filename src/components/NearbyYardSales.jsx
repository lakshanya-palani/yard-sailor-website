import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { calculateDistanceMiles, getPublicLocation, requestUserLocation } from "../utils/location";
import "./NearbyYardSales.css";

function NearbyYardSales() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [locationAvailable, setLocationAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSales() {
      const [{ data, error }, location] = await Promise.all([
        supabase
          .from("sales")
          .select("id, title, address, lat, lng, images, start_time, status")
          .in("status", ["upcoming", "live"])
          .not("lat", "is", null)
          .not("lng", "is", null)
          .order("created_at", { ascending: false }),
        requestUserLocation(),
      ]);

      if (error) {
        console.error("Unable to load nearby yard sales:", error);
        setSales([]);
      } else {
        const withDistances = (data || []).map((sale) => ({
          ...sale,
          distance: location
            ? calculateDistanceMiles(location.latitude, location.longitude, sale.lat, sale.lng)
            : null,
        }));
        if (location) {
          withDistances.sort(
            (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)
          );
        }
        setSales(withDistances);
      }
      setLocationAvailable(Boolean(location));
      setLoading(false);
    }

    loadSales();
    window.addEventListener("yardSailorYardSalesUpdated", loadSales);
    return () => window.removeEventListener("yardSailorYardSalesUpdated", loadSales);
  }, []);

  return (
    <section className="nearby-sales-section">
      <div className="nearby-sales-heading">
      <div>
      <h2>Nearby Yard Sales</h2>
      <p>{locationAvailable ? "Explore yard sales near you." : "Explore yard sales in your area."}</p>
        </div>
        <Link to="/post-yard-sale">Post a Yard Sale</Link>
      </div>
      {loading ? <p className="nearby-sales-message">Loading yard sales...</p> : sales.length === 0 ? <p className="nearby-sales-message">No active yard sales have been posted yet.</p> : (
        <div className="nearby-sales-grid">
          {sales.slice(0, 4).map((sale) => (
            <article className="nearby-sale-card" key={sale.id} tabIndex={0} role="link" onClick={() => navigate(`/yard-sale/${sale.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(`/yard-sale/${sale.id}`); }}>
              <div className="nearby-sale-image">{sale.images?.[0] ? <img src={sale.images[0]} alt={sale.title} /> : <span>Yard Sale</span>}</div>
              <div className="nearby-sale-info"><h3>{sale.title}</h3><p>{getPublicLocation(sale.address)}</p>{sale.distance != null && <strong>{sale.distance.toFixed(1)} miles away</strong>}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default NearbyYardSales;
