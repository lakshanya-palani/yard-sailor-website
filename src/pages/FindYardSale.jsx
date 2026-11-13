import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { MapPinned } from "lucide-react";
import SaleMap from "../components/SaleMap";
import { PageShell } from "../components/layout/PageShell";
import { PageHeader } from "../components/layout/PageHeader";
import { SectionHeader } from "../components/layout/SectionHeader";
import { LocationSearch } from "../components/listing/LocationSearch";
import { SaleListingCard } from "../components/listing/SaleListingCard";
import { ListingSkeletonGroup } from "../components/listing/ListingSkeleton";
import { Button } from "../components/ui/Button";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { StatusMessage } from "../components/ui/StatusMessage";
import { getSaleStatus, saleOverlapsLocalWindow } from "../utils/saleTime";
import useSaleClock from "../utils/useSaleClock";
import { supabase } from "../lib/supabase";
import {
  calculateDistanceMiles,
  geocodeAddress,
  hasValidCoordinates,
  requestUserLocation,
} from "../utils/location";
import "./FindYardSale.css";

const DATE_FILTERS = [
  { value: "all", label: "All Yard Sales" },
  { value: "today", label: "Today" },
  { value: "weekend", label: "This Weekend" },
];

const VIEWS = [
  { value: "list", label: "List" },
  { value: "map", label: "Map" },
];

function FindYardSale() {
  const routeLocation = useLocation();
  const requestedLocation = routeLocation.state?.requestedLocation;
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("q") || "";
  const mapSectionRef = useRef(null);
  const [sales, setSales] = useState([]);
  const now = useSaleClock(sales);
  const [origin, setOrigin] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [selectionRequest, setSelectionRequest] = useState(0);
  const [query, setQuery] = useState(initialSearch);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("list");
  const [locationLabel, setLocationLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [salesError, setSalesError] = useState(false);
  const [salesRetry, setSalesRetry] = useState(0);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  // A location handed over by the homepage ("Use my location") is applied once per
  // navigation state object, during render rather than in an effect.
  const [appliedRequestedLocation, setAppliedRequestedLocation] = useState(null);
  if ((requestedLocation ?? null) !== appliedRequestedLocation) {
    setAppliedRequestedLocation(requestedLocation ?? null);
    if (requestedLocation && hasValidCoordinates(requestedLocation.latitude, requestedLocation.longitude)) {
      setOrigin(requestedLocation);
      setMapCenter(requestedLocation);
      setLocationLabel("Your location");
      setSelectedSaleId(null);
    }
  }

  useEffect(() => {
    const search = searchParams.get("q")?.trim();
    if (!search) return;
    let active = true;
    async function searchFromHomepage() {
      setSearching(true);
      setError("");
      try {
        const result = await geocodeAddress(search);
        if (!active) return;
        const location = {
          latitude: result.latitude,
          longitude: result.longitude,
        };
        setOrigin(location);
        setMapCenter(location);
        setLocationLabel(result.placeName || search);
        setSelectedSaleId(null);
      } catch (searchError) {
        if (!active) return;
        console.error("Homepage location search failed:", searchError);
        setError(searchError.message);
      } finally {
        if (active) setSearching(false);
      }
    }
    searchFromHomepage();
    return () => {
      active = false;
    };
  }, [searchParams]);

  // Read at effect time (latest render), so a retry still skips auto-locating when the
  // visitor arrived with a search or a location.
  const shouldAutoLocate = useEffectEvent(() => !initialSearch && !requestedLocation);

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
    if (shouldAutoLocate()) {
      requestUserLocation().then((location) => {
        if (location) {
          setOrigin(location);
          setMapCenter(location);
          setLocationLabel("Your location");
        }
      });
    }
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
    setLocating(true);
    let location;
    try {
      location = await requestUserLocation({ refresh: true });
    } finally {
      setLocating(false);
    }
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

  let results;
  if (loading) {
    results = <ListingSkeletonGroup variant="row" count={3} seller={false} label="Loading yard sales…" />;
  } else if (salesError) {
    results = <StatusMessage kind="error" compact title="Unable to load yard sales." onRetry={() => { setLoading(true); setSalesRetry(value => value + 1); }} />;
  } else if (displayedSales.length === 0) {
    results = <StatusMessage compact title="No yard sales match this search or filter." />;
  } else {
    results = (
      <ol className="yard-sale-result-list">
        {displayedSales.map((sale, index) => (
          <li key={sale.id}>
            <SaleListingCard
              sale={sale}
              now={now}
              variant="row"
              number={index + 1}
              className={sale.id === selectedSaleId ? "yard-sale-result is-selected" : "yard-sale-result"}
              actions={(
                <Button size="sm" variant="secondary" className="show-on-map" icon={<MapPinned size={16} />} onClick={() => selectSale(sale)} aria-label={`Show ${sale.title} on map`}>
                  Show on map
                </Button>
              )}
            />
          </li>
        ))}
      </ol>
    );
  }

  return (
    <PageShell width="wide" className="find-yard-sale-page">
      <PageHeader title="Find a Yard Sale" />
      <LocationSearch
        value={query}
        onChange={setQuery}
        onSubmit={searchLocation}
        onUseLocation={useMyLocation}
        searching={searching}
        locating={locating}
        error={error}
      />

      <SegmentedControl className="yard-sale-filters" label="Yard sale date filters" options={DATE_FILTERS} value={filter} onChange={setFilter} />

      <div className="yard-sale-summary">
        <p role="status">{loading ? "Loading yard sales…" : `${displayedSales.length} ${displayedSales.length === 1 ? "yard sale" : "yard sales"}`} {locationLabel && `near ${locationLabel}`}</p>
        <SegmentedControl className="yard-sale-view-toggle" size="sm" label="Results view" options={VIEWS} value={view} onChange={setView} />
      </div>
      <p className={`yard-sale-map-hint is-${view}`}>Choose a numbered pin or select “Show on map” to explore a sale. The list includes all matching sales, even outside the current map view.</p>
      <div className={`find-yard-sale-layout view-${view}`}>
        <div className="yard-sale-map-container" ref={mapSectionRef}><SaleMap sales={displayedSales} selectedSaleId={selectedSaleId} selectionRequest={selectionRequest} onSelectSale={setSelectedSaleId} center={mapCenter} className="find-yard-sale-map" /></div>
        <section className="yard-sale-results" aria-labelledby="yard-sale-results-title">
          <SectionHeader title={<span id="yard-sale-results-title">Yard Sale Results</span>} count={displayedSales.length} />
          {results}
        </section>
      </div>
    </PageShell>
  );
}

export default FindYardSale;
