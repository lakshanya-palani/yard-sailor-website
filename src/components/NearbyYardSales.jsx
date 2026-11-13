import { useAsync } from "../hooks/useAsync";
import { supabase } from "../lib/supabase";
import { calculateDistanceMiles, requestUserLocation } from "../utils/location";
import { getSaleStatus } from "../utils/saleTime";
import useSaleClock from "../utils/useSaleClock";
import { SectionHeader } from "./layout/SectionHeader";
import { CardGrid } from "./layout/CardGrid";
import { SaleListingCard } from "./listing/SaleListingCard";
import { ListingSkeletonGroup } from "./listing/ListingSkeleton";
import { Button } from "./ui/Button";
import { StatusMessage } from "./ui/StatusMessage";
import "./NearbyYardSales.css";

function NearbyYardSales({ requestLocation = true }) {
  const { data: result, loading, error, reload } = useAsync(async () => {
    const [{ data, error }, location] = await Promise.all([
      supabase.from("sales")
        .select("id, title, address, lat, lng, images, start_time, end_time, status")
        .in("status", ["upcoming", "live"])
        .not("lat", "is", null).not("lng", "is", null)
        .order("created_at", { ascending: false }),
      requestLocation ? requestUserLocation() : Promise.resolve(null),
    ]);
    if (error) throw error;
    const sales = (data || []).map(sale => ({
      ...sale,
      distance: location ? calculateDistanceMiles(location.latitude, location.longitude, sale.lat, sale.lng) : null,
    }));
    if (location) sales.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    return { sales, locationAvailable: Boolean(location) };
  }, [requestLocation], { refetchOnEvents: ["yardSailorYardSalesUpdated"] });
  const sales = result?.sales || [];
  const locationAvailable = result?.locationAvailable || false;
  const now = useSaleClock(sales);

  const visibleSales = sales.filter(sale => ["upcoming", "live"].includes(getSaleStatus(sale, now)));
  return (
    <section className="nearby-sales-section">
      <div className="nearby-sales-inner">
        <SectionHeader
          title={locationAvailable ? "Nearby Yard Sales" : "Explore Yard Sales"}
          subtitle={locationAvailable ? "Explore yard sales near you." : "Discover yard sales and plan your next stop."}
          linkTo="/find-yard-sale"
          linkLabel="Explore the map"
        />
        {loading ? (
          <ListingSkeletonGroup count={4} seller={false} label="Loading yard sales…" />
        ) : error ? (
          <StatusMessage kind="error" compact title="Unable to load yard sales. Please try again later." onRetry={reload} />
        ) : visibleSales.length === 0 ? (
          <StatusMessage
            title="No upcoming yard sales yet"
            action={<Button to="/post-yard-sale">Post a yard sale</Button>}
          >
            <p>Hosting one? Share it with your neighborhood.</p>
          </StatusMessage>
        ) : (
          <CardGrid columns={{ base: 1, md: 2, lg: 4 }} limit={4}>
            {visibleSales.map((sale) => (
              <SaleListingCard key={sale.id} sale={sale} now={now} variant="compact" />
            ))}
          </CardGrid>
        )}
      </div>
    </section>
  );
}

export default NearbyYardSales;
