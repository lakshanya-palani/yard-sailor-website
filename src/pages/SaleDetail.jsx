import { fetchProfilesByIds } from "../lib/profiles";
import { useAsync } from "../hooks/useAsync";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { calculateDistanceMiles, requestUserLocation } from "../utils/location";
import { formatDistance, formatSaleRange } from "../lib/format";
import { Button } from "../components/ui/Button";
import { FormAlert } from "../components/ui/FormAlert";
import { StatusMessage } from "../components/ui/StatusMessage";
import { PageShell } from "../components/layout/PageShell";
import { SaleStatusBadge } from "../components/listing/SaleStatusBadge";
import { SellerChip } from "../components/listing/SellerChip";
import { ImageGallery } from "../components/listing/ImageGallery";
import { DetailLayout } from "../components/listing/DetailLayout";
import { MetaList } from "../components/listing/MetaList";
import "./SaleDetail.css";

function SaleDetail() {
  const { id } = useParams();
  return <SaleDetailForListing key={id} id={id} />;
}

function SaleDetailForListing({ id }) {
  const location = useLocation();
  const { data: listing, loading, error: loadError, reload } = useAsync(async () => {
    const { data: sale, error } = await supabase.from("sales").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!sale) return null;
    const [profiles, userLocation] = await Promise.all([
      fetchProfilesByIds([sale.host_id]),
      requestUserLocation(),
    ]);
    const distance = userLocation ? calculateDistanceMiles(userLocation.latitude, userLocation.longitude, sale.lat, sale.lng) : null;
    return { sale, seller: profiles[sale.host_id] || null, distance };
  }, [id]);
  const { sale = null, seller = null, distance = null } = listing || {};

  if (loading) return <PageShell><StatusMessage kind="loading" title="Loading yard sale..." /></PageShell>;
  if (loadError) return <PageShell><StatusMessage kind="error" titleAs="h1" title="Unable to load yard sale" onRetry={reload}>Please try again.</StatusMessage></PageShell>;
  if (!sale) {
    return (
      <PageShell width="narrow">
        <StatusMessage kind="empty" titleAs="h1" title="Yard sale not found" action={<Button variant="secondary" to="/">Return home</Button>}>
          <p>This yard sale may no longer be available.</p>
        </StatusMessage>
      </PageShell>
    );
  }

  const images = sale.images || [];
  const distanceLabel = formatDistance(distance);

  return (
    <PageShell className="yard-sale-detail-page">
      <DetailLayout media={<ImageGallery images={images} alt={sale.title} label="Yard sale images" />}>
        {location.state?.confirmation === "Your yard sale was posted." && <FormAlert tone="success">Your yard sale was posted.</FormAlert>}

        <header className="yard-sale-detail-heading">
          <p className="yard-sale-detail-eyebrow">Yard sale</p>
          <h1>{sale.title}</h1>
          <div className="yard-sale-detail-facts">
            <SaleStatusBadge sale={sale} />
            {distanceLabel && <span className="yard-sale-detail-distance">{distanceLabel}</span>}
          </div>
        </header>

        <MetaList
          items={[
            { label: "When", value: formatSaleRange(sale.start_time, sale.end_time, "Not specified") },
            { label: "Address", value: sale.address },
          ]}
        />

        <section className="yard-sale-detail-description" aria-labelledby="yard-sale-about-heading">
          <h2 id="yard-sale-about-heading">About this yard sale</h2>
          <p>{sale.description}</p>
        </section>

        <SellerChip className="yard-sale-detail-host" profile={seller} label="Hosted by" fallbackName="Yard Sailor host" size={44} />
      </DetailLayout>
    </PageShell>
  );
}

export default SaleDetail;
