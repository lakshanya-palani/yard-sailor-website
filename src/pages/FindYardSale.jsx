import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SaleMap from "../components/SaleMap";
import { supabase } from "../lib/supabase";
import {
  calculateDistanceMiles,
  geocodeAddress,
  getPublicLocation,
  hasValidCoordinates,
  requestUserLocation,
} from "../utils/location";
import "./FindYardSale.css";

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isThisWeekend(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  const day = now.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  const saturday = new Date(now);
  saturday.setHours(0, 0, 0, 0);
  saturday.setDate(now.getDate() + daysUntilSaturday);
  const monday = new Date(saturday);
  monday.setDate(saturday.getDate() + 2);
  return date >= saturday && date < monday;
}

function FindYardSale() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSales() {
      const { data, error: salesError } = await supabase
        .from("sales")
        .select("id, title, description, address, lat, lng, images, start_time, end_time, status")
        .in("status", ["upcoming", "live"])
        .order("start_time", { ascending: true });

      if (salesError) {
        console.error("Unable to load yard sales:", salesError);
        setError("Unable to load yard sales. Please try again.");
      } else {
        setSales((data || []).filter((sale) => hasValidCoordinates(sale.lat, sale.lng)));
      }
      setLoading(false);
    }

    loadSales();
    requestUserLocation().then((location) => {
      if (location) {
        setOrigin(location);
        setMapCenter(location);
      }
    });
    window.addEventListener("yardSailorYardSalesUpdated", loadSales);
    return () => window.removeEventListener("yardSailorYardSalesUpdated", loadSales);
  }, []);

  const displayedSales = useMemo(() => {
    const filtered = sales.filter((sale) => {
      if (filter === "today") return isToday(sale.start_time);
      if (filter === "weekend") return isThisWeekend(sale.start_time);
      return true;
    });

    const withDistance = filtered.map((sale) => ({
      ...sale,
      distance: origin
        ? calculateDistanceMiles(origin.latitude, origin.longitude, sale.lat, sale.lng)
        : null,
    }));

    if (origin) {
      withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    return withDistance;
  }, [filter, origin, sales]);

  async function searchLocation(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const result = await geocodeAddress(query.trim());
      const location = { latitude: result.latitude, longitude: result.longitude };
      setOrigin(location);
      setMapCenter(location);
      setSelectedSaleId(null);
    } catch (searchError) {
      console.error("Location search failed:", searchError);
      setError(searchError.message);
    } finally {
      setSearching(false);
    }
  }

  async function useMyLocation() {
    const location = await requestUserLocation();
    if (!location) {
      setError("Location is unavailable. You can still search by city, ZIP code, or address.");
      return;
    }
    setError("");
    setOrigin(location);
    setMapCenter(location);
    setSelectedSaleId(null);
  }

  function selectSale(sale) {
    setSelectedSaleId(sale.id);
    setMapCenter({ latitude: Number(sale.lat), longitude: Number(sale.lng) });
  }

  return (
    <main className="find-yard-sale-page">
      <div className="find-yard-sale-header">
        <h1>Find a Yard Sale</h1>
        <form onSubmit={searchLocation} className="yard-sale-search-form">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search city, ZIP code, or address" aria-label="Search city, ZIP code, or address" />
          <button type="submit" disabled={searching}>{searching ? "Searching..." : "Search"}</button>
          <button type="button" className="use-location-button" onClick={useMyLocation}>Use My Location</button>
        </form>
        {error && <p className="find-yard-sale-error">{error}</p>}
      </div>

      <div className="yard-sale-filters" aria-label="Yard sale date filters">
        <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>All Yard Sales</button>
        <button className={filter === "today" ? "selected" : ""} onClick={() => setFilter("today")}>Today</button>
        <button className={filter === "weekend" ? "selected" : ""} onClick={() => setFilter("weekend")}>This Weekend</button>
      </div>

      <div className="find-yard-sale-layout">
        <SaleMap sales={displayedSales} selectedSaleId={selectedSaleId} onSelectSale={setSelectedSaleId} center={mapCenter} className="find-yard-sale-map" />
        <aside className="yard-sale-results">
          <div className="yard-sale-results-heading"><h2>Yard Sale Results</h2><span>{displayedSales.length}</span></div>
          {loading ? <p className="yard-sale-results-message">Loading yard sales...</p> : displayedSales.length === 0 ? <p className="yard-sale-results-message">No yard sales match this search or filter.</p> : displayedSales.map((sale) => (
            <article key={sale.id} className={`yard-sale-result-card ${sale.id === selectedSaleId ? "selected" : ""}`} onClick={() => selectSale(sale)}>
              <div className="yard-sale-result-image">{sale.images?.[0] ? <img src={sale.images[0]} alt={sale.title} /> : <span>Yard Sale</span>}</div>
              <div className="yard-sale-result-info"><h3>{sale.title}</h3><p>{getPublicLocation(sale.address)}</p>{sale.distance != null && <strong>{sale.distance.toFixed(1)} miles away</strong>}<time>{sale.start_time ? new Date(sale.start_time).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Time not specified"}</time><span className="yard-sale-result-status">{sale.status}</span><button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/yard-sale/${sale.id}`); }}>View Yard Sale</button></div>
            </article>
          ))}
        </aside>
      </div>
    </main>
  );
}

export default FindYardSale;
