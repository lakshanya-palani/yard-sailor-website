import { useAsync } from "../hooks/useAsync";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchProfilesByIds } from "../lib/profiles";
import { useSaved } from "../context/SavedContext";
import ShopProductCard from "../components/ShopProductCard";
import SaveButton from "../components/SaveButton";
import { PageShell } from "../components/layout/PageShell";
import { PageHeader } from "../components/layout/PageHeader";
import { CardGrid } from "../components/layout/CardGrid";
import { Button } from "../components/ui/Button";
import { FormAlert } from "../components/ui/FormAlert";
import { StatusMessage } from "../components/ui/StatusMessage";
import { ListingSkeletonGroup } from "../components/listing/ListingSkeleton";
import "./Shop.css";

export default function SavedItems() {
  const { userId } = useSaved();
  return <SavedItemsForUser key={userId || "signed-out"} />;
}

function SavedItemsForUser() {
  const { userId, ids, loading: idsLoading, error: idsError, refresh, actionError } = useSaved();
  const { data: saved, loading, error: loadError, reload } = useAsync(async () => {
    if (!userId) return { rows: [], sellers: {}, availability: new Set() };
    const items = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from("saved_products")
        .select("product_id, products(id,title,price,image_urls,user_id)").eq("user_id", userId)
        .order("created_at", { ascending: false }).order("product_id").range(offset, offset + 999);
      if (error) throw error;
      items.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    const sellers = await fetchProfilesByIds(items.map(row => row.products?.user_id), { strict: true });
    const { data: states, error } = await supabase.rpc("saved_product_availability");
    if (error) throw error;
    return { rows: items, sellers, availability: new Set((states || []).filter(row => row.unavailable).map(row => row.product_id)) };
  }, [userId]);
  useEffect(() => {
    const focus = () => { if (document.visibilityState === "visible") reload(); };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [reload]);
  const rows = saved?.rows || [];
  const sellers = saved?.sellers || {};
  const availability = saved?.availability || new Set();
  const error = loadError ? "Unable to load saved items. Please retry." : "";

  const visible = rows.filter(row => ids.has(row.product_id));

  return (
    <PageShell>
      <PageHeader title="Saved Items" subtitle="Your finds, kept in one place. Saving an item does not reserve it." />
      {actionError && <FormAlert>{actionError}</FormAlert>}
      {loading || idsLoading ? (
        <ListingSkeletonGroup count={6} label="Loading saved items…" />
      ) : error || idsError ? (
        <StatusMessage
          kind="error"
          title={error || idsError}
          onRetry={() => { refresh(); reload(); }}
          retryLabel="Retry"
        />
      ) : !visible.length ? (
        <StatusMessage
          title="Nothing saved yet."
          action={<Button to="/shop">Explore the Shop</Button>}
        >
          <p>Explore the Shop and save items you love.</p>
        </StatusMessage>
      ) : (
        <CardGrid columns={{ base: 2, md: 3, lg: 4 }} className="saved-items-status">
          {visible.map(row => row.products ? (
            <ShopProductCard key={row.product_id} product={row.products} seller={sellers[row.products.user_id]} unavailable={availability.has(row.product_id)} />
          ) : (
            <article className="shop-card" key={row.product_id}>
              <div className="shop-card-info">
                <h2>Item unavailable</h2>
                <p>This listing is no longer accessible.</p>
                <SaveButton productId={row.product_id} title="Unavailable item" detail />
              </div>
            </article>
          ))}
        </CardGrid>
      )}
    </PageShell>
  );
}
