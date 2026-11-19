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
import { SelectField } from "../components/ui/SelectField";
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
import AdvertisementLayout from "../components/AdvertisementLayout";
import "./FindYardSale.css";

const DATE_FILTERS = [
  { value: "all", label: "All Yard Sales" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "weekend", label: "This Weekend" },
  { value: "week", label: "Next 7 Days" },
  { value: "custom", label: "Custom Date" },
];

const DISTANCE_FILTERS = [
  { value: "all", label: "Any Distance" },
  { value: "5", label: "5 miles" },
  { value: "10", label: "10 miles" },
  { value: "25", label: "25 miles" },
  { value: "50", label: "50 miles" },
];

const SORT_OPTIONS = [
  { value: "nearest", label: "Nearest" },
  { value: "soonest", label: "Soonest Upcoming" },
  { value: "farthest", label: "Farthest" },
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
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [sort, setSort] = useState("nearest");
  const [customDate, setCustomDate] = useState("");
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

      if (filter === "tomorrow" || filter === "week" || (filter === "custom" && customDate)) {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);

        if (filter === "tomorrow") {
          start.setDate(start.getDate() + 1);
        }

        if (filter === "custom") {
          const [year, month, day] = customDate.split("-").map(Number);
          start.setFullYear(year, month - 1, day);
        }

        const end = new Date(start);
        end.setDate(end.getDate() + (filter === "week" ? 7 : 1));

        return new Date(sale.start_time) < end &&
          new Date(sale.end_time) > start;
      }

      return true;
    });

    const withDistance = filtered.map((sale) => ({
      ...sale,
      distance: origin
        ? calculateDistanceMiles(origin.latitude, origin.longitude, sale.lat, sale.lng)
        : null,
    }));

    const withinDistance = origin && distanceFilter !== "all"
      ? withDistance.filter((sale) =>
          sale.distance !== null &&
          sale.distance <= Number(distanceFilter)
        )
      : withDistance;

    if (sort === "nearest" && origin) {
      withinDistance.sort((a, b) => a.distance - b.distance);
    } else if (sort === "farthest" && origin) {
      withinDistance.sort((a, b) => b.distance - a.distance);
    } else {
      withinDistance.sort((a, b) =>
        new Date(a.start_time) - new Date(b.start_time)
      );
    }

    return withinDistance;
  }, [filter, distanceFilter, sort, customDate, origin, sales, now]);

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
    <AdvertisementLayout>
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

        <div className="yard-sale-filter-controls">
          <label>
            Date
            <SelectField value={filter} onChange={event => setFilter(event.target.value)}>
              {DATE_FILTERS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </SelectField>
          </label>

          <label>
            Distance
            <SelectField disabled={!origin} value={distanceFilter} onChange={event => setDistanceFilter(event.target.value)}>
              {DISTANCE_FILTERS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </SelectField>
          </label>

          <label>
            Sort
            <SelectField value={origin ? sort : "soonest"} onChange={event => setSort(event.target.value)}>
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value} disabled={!origin && option.value !== "soonest"}>{option.label}</option>
              ))}
            </SelectField>
          </label>

          <Button type="button" variant="secondary" onClick={() => {
            setFilter("all");
            setDistanceFilter("all");
            setSort("nearest");
            setCustomDate("");
          }}>
            Reset
          </Button>

          {filter === "custom" && (
            <label className="yard-sale-custom-date">
              Choose a date
              <input type="date" value={customDate} onChange={event => setCustomDate(event.target.value)} />
            </label>
          )}

          {!origin && (
            <small className="yard-sale-filter-hint">Search for a location to enable distance filtering.</small>
          )}
        </div>

        <div className="yard-sale-summary">
          <p role="status">{loading ? "Loading yard sales…" : `${displayedSales.length} ${displayedSales.length === 1 ? "yard sale" : "yard sales"}`} {locationLabel && `near ${locationLabel}`}</p>
          <SegmentedControl className="yard-sale-view-toggle" size="sm" label="Results view" options={VIEWS} value={view} onChange={setView} />
        </div>

        <p className={`yard-sale-map-hint is-${view}`}>Choose a numbered pin or select “Show on map” to explore a sale. The list includes all matching sales, even outside the current map view.</p>

        <div className={`find-yard-sale-layout view-${view}`}>
          <div className="yard-sale-map-container" ref={mapSectionRef}>
            <SaleMap sales={displayedSales} selectedSaleId={selectedSaleId} selectionRequest={selectionRequest} onSelectSale={setSelectedSaleId} center={mapCenter} className="find-yard-sale-map" />
          </div>

          <section className="yard-sale-results" aria-labelledby="yard-sale-results-title">
            <SectionHeader title={<span id="yard-sale-results-title">Yard Sale Results</span>} count={displayedSales.length} />
            {results}
          </section>
        </div>
      </PageShell>
    </AdvertisementLayout>
  );
}

export default FindYardSale;

