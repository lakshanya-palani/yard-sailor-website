import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { calculateDistanceMiles, getPublicLocation, requestUserLocation } from "../utils/location";
import "./NearbyYardSales.css";
import "./ui.css";
import { getSaleStatus } from "../utils/saleTime";
import useSaleClock from "../utils/useSaleClock";

function NearbyYardSales({ requestLocation = true }) {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const now = useSaleClock(sales);
  const [locationAvailable, setLocationAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadSales() {
      const [{ data, error }, location] = await Promise.all([
        supabase
          .from("sales")
          .select("id, title, address, lat, lng, images, start_time, end_time, status")
          .in("status", ["upcoming", "live"])
          .not("lat", "is", null)
          .not("lng", "is", null)
          .order("created_at", { ascending: false }),
        requestLocation ? requestUserLocation() : Promise.resolve(null),
      ]);

      setError(Boolean(error));
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
  }, [requestLocation]);

  const visibleSales = sales.filter(sale => ["upcoming", "live"].includes(getSaleStatus(sale, now)));
  return (
    <section className="nearby-sales-section">
      <div className="nearby-sales-heading">
      <div>
      <h2>{locationAvailable ? "Nearby Yard Sales" : "Explore Yard Sales"}</h2>
      <p>{locationAvailable ? "Explore yard sales near you." : "Discover yard sales and plan your next stop."}</p>
        </div>
        <Link to="/find-yard-sale">Explore the map →</Link>
      </div>
      {loading ? <p className="nearby-sales-message">Loading yard sales...</p> : error ? <p className="nearby-sales-message" role="alert">Unable to load yard sales. Please try again later.</p> : visibleSales.length === 0 ? <div className="nearby-sales-empty ui-card"><div><h3>No upcoming yard sales yet</h3><p>Hosting one? Share it with your neighborhood.</p></div><Link className="ui-button" to="/post-yard-sale">Post a yard sale</Link></div> : (
        <div className="nearby-sales-grid">
          {visibleSales.slice(0, 4).map((sale) => (
            <article className="nearby-sale-card ui-card" key={sale.id} tabIndex={0} role="link" onClick={() => navigate(`/yard-sale/${sale.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(`/yard-sale/${sale.id}`); }}>
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
