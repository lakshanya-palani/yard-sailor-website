import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SaleMap from "../components/SaleMap";
import { getSaleStatus, saleOverlapsLocalWindow, saleStatusLabel } from "../utils/saleTime";
import useSaleClock from "../utils/useSaleClock";
import { supabase } from "../lib/supabase";
import {
  calculateDistanceMiles,
  geocodeAddress,
  getPublicLocation,
  hasValidCoordinates,
  requestUserLocation,
} from "../utils/location";
import "./FindYardSale.css";

function FindYardSale() {
  const navigate = useNavigate();
  const mapSectionRef = useRef(null);
  const [sales, setSales] = useState([]);
  const now = useSaleClock(sales);
  const [origin, setOrigin] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [selectionRequest, setSelectionRequest] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("list");
  const [locationLabel, setLocationLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [salesError, setSalesError] = useState(false);
  const [salesRetry, setSalesRetry] = useState(0);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSales() {
      const { data, error: salesError } = await supabase
        .from("sales")
        .select("id, title, description, address, lat, lng, images, start_time, end_time, status")
        .in("status", ["upcoming", "live"])
        .order("start_time", { ascending: true });

      setSalesError(Boolean(salesError));
      if (salesError) {
        console.error("Unable to load yard sales:", salesError);
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
        setLocationLabel("Your location");
      }
    });
    window.addEventListener("yardSailorYardSalesUpdated", loadSales);
    return () => window.removeEventListener("yardSailorYardSalesUpdated", loadSales);
  }, [salesRetry]);

  const displayedSales = useMemo(() => {
    const filtered = sales.filter((sale) => {
      if (!["upcoming", "live"].includes(getSaleStatus(sale, now))) return false;
      if (filter === "today") return saleOverlapsLocalWindow(sale, "today", now);
      if (filter === "weekend") return saleOverlapsLocalWindow(sale, "weekend", now);
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
  }, [filter, origin, sales, now]);

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
      setLocationLabel(result.placeName || query.trim());
      setSelectedSaleId(null);
    } catch (searchError) {
      console.error("Location search failed:", searchError);
      setError(searchError.message);
    } finally {
      setSearching(false);
    }
  }

  async function useMyLocation() {
    const location = await requestUserLocation({ refresh: true });
    if (!location) {
      setError("Location is unavailable. You can still search by city, ZIP code, or address.");
      return;
    }
    setError("");
    setOrigin(location);
    setMapCenter(location);
    setLocationLabel("Your location");
    setSelectedSaleId(null);
  }

  useEffect(() => {
    if (!selectionRequest || view !== "map") return;
    const map = mapSectionRef.current;
    if (!map) return;
    const bounds = map.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
      map.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }, [view, selectionRequest]);

  function selectSale(sale) {
    setView("map");
    setSelectedSaleId(sale.id);
    setSelectionRequest(value => value + 1);
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
        <button aria-pressed={filter === "all"} className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>All Yard Sales</button>
        <button aria-pressed={filter === "today"} className={filter === "today" ? "selected" : ""} onClick={() => setFilter("today")}>Today</button>
        <button aria-pressed={filter === "weekend"} className={filter === "weekend" ? "selected" : ""} onClick={() => setFilter("weekend")}>This Weekend</button>
      </div>

      <div className="yard-sale-summary"><p role="status">{loading ? "Loading yard sales…" : `${displayedSales.length} ${displayedSales.length === 1 ? "yard sale" : "yard sales"}`} {locationLabel && `near ${locationLabel}`}</p><div className="yard-sale-view-toggle" aria-label="Results view"><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button><button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>Map</button></div></div>
      <p className="yard-sale-map-hint">Choose a numbered pin or select “Show on map” to explore a sale. The list includes all matching sales, even outside the current map view.</p>
      <div className={`find-yard-sale-layout view-${view}`}>
        <div className="yard-sale-map-container" ref={mapSectionRef}><SaleMap sales={displayedSales} selectedSaleId={selectedSaleId} selectionRequest={selectionRequest} onSelectSale={setSelectedSaleId} center={mapCenter} className="find-yard-sale-map" /></div>
        <aside className="yard-sale-results">
          <div className="yard-sale-results-heading"><h2>Yard Sale Results</h2><span>{displayedSales.length}</span></div>
          {loading ? <p className="yard-sale-results-message">Loading yard sales...</p> : salesError ? <p className="yard-sale-results-message">Unable to load yard sales. <button type="button" onClick={() => { setLoading(true); setSalesRetry(value => value + 1); }}>Try again</button></p> : displayedSales.length === 0 ? <p className="yard-sale-results-message">No yard sales match this search or filter.</p> : displayedSales.map((sale, index) => (
            <article key={sale.id} className={`yard-sale-result-card ${sale.id === selectedSaleId ? "selected" : ""}`}>
              <span className="yard-sale-result-number" aria-label={`Map pin ${index + 1}`}>{index + 1}</span>
              <div className="yard-sale-result-image">{sale.images?.[0] ? <img src={sale.images[0]} alt={sale.title} /> : <span>Yard Sale</span>}</div>
              <div className="yard-sale-result-info"><h3>{sale.title}</h3><p>{getPublicLocation(sale.address)}</p>{sale.distance != null && <strong>{sale.distance.toFixed(1)} miles away</strong>}<time>{sale.start_time ? new Date(sale.start_time).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Time not specified"}</time><span className="yard-sale-result-status">{saleStatusLabel(sale, now)}</span><div className="yard-sale-result-actions"><button type="button" className="show-on-map" onClick={() => selectSale(sale)} aria-label={`Show ${sale.title} on map`}>Show on map</button><button type="button" onClick={() => navigate(`/yard-sale/${sale.id}`)}>View Yard Sale</button></div></div>
            </article>
          ))}
        </aside>
      </div>
    </main>
  );
}

export default FindYardSale;
