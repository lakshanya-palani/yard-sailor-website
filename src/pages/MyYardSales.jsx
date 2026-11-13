import { useAuth } from "../context/useAuth";
import { useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { AccountLayout } from "../components/layout/AccountLayout";
import { CardGrid } from "../components/layout/CardGrid";
import { ListingCard } from "../components/listing/ListingCard";
import { SaleStatusBadge } from "../components/listing/SaleStatusBadge";
import { OwnerActions } from "../components/listing/OwnerActions";
import { ListingSkeletonGroup } from "../components/listing/ListingSkeleton";
import { StatusMessage } from "../components/ui/StatusMessage";
import { Button } from "../components/ui/Button";
import { useOwnedRows } from "../hooks/useOwnedRows";
import { useToast } from "../hooks/useToast";
import { supabase } from "../lib/supabase";
import { formatDateTime } from "../lib/format";
import "./AccountPages.css";

function MyYardSales() {
  const { user } = useAuth();
  return <MyYardSalesForUser key={user?.id || "signed-out"} />;
}

function MyYardSalesForUser() {
  const { user, rows: sales, loading, error, reload, setRows: setSales } = useOwnedRows({
    table: "sales",
    ownerColumn: "host_id",
    ownerLog: "Unable to load yard sale host:",
    rowsLog: "Unable to load yard sales:",
  });
  const [cancellingId, setCancellingId] = useState(null);
  const toast = useToast();

  // Confirmation happens in <OwnerActions> (shared ConfirmDialog) before this runs.
  async function cancelYardSale(sale) {
    if (!user) return;

    setCancellingId(sale.id);
    const { error: cancelError } = await supabase
      .from("sales")
      .update({ status: "cancelled" })
      .eq("id", sale.id)
      .eq("host_id", user.id);
    setCancellingId(null);

    if (cancelError) {
      console.error("Unable to cancel yard sale:", cancelError);
      toast.show(cancelError.message, { tone: "error" });
      return;
    }
    setSales((items) => items.map((item) => item.id === sale.id ? { ...item, status: "cancelled" } : item));
  }

  return (
    <AccountLayout
      title="My Yard Sale Listings"
      subtitle="Manage the yard sale events you host."
      actions={<Button to="/post-yard-sale">Post a Yard Sale</Button>}
    >
      {loading ? (
        <ListingSkeletonGroup variant="row" count={3} seller={false} label="Loading your yard sales..." />
      ) : error ? (
        <StatusMessage kind="error" title="Your yard sales could not be loaded" onRetry={reload}>
          <p>{error.message}</p>
        </StatusMessage>
      ) : sales.length === 0 ? (
        <StatusMessage title="No yard sales yet">
          <p>Your hosted yard sale events will appear here.</p>
        </StatusMessage>
      ) : (
        <CardGrid columns={{ base: 1, lg: 2 }}>
          {sales.map((sale) => (
            // ListingCard directly (not SaleListingCard) so the host sees the full
            // address and description, which SaleListingCard can't show.
            <ListingCard
              key={sale.id}
              variant="row"
              to={`/yard-sale/${sale.id}`}
              image={sale.images?.[0]}
              fallbackLabel="Yard Sale"
              title={sale.title}
              headingLevel={2}
              badge={<SaleStatusBadge sale={sale} />}
              meta={[
                { icon: <CalendarDays />, text: formatDateTime(sale.start_time, "Date not set") },
                sale.address && { icon: <MapPin />, text: sale.address },
              ]}
              actions={
                <OwnerActions
                  size="sm"
                  editTo={`/yard-sales/${sale.id}/edit`}
                  editLabel="Edit Yard Sale"
                  onCancel={sale.status !== "cancelled" ? () => cancelYardSale(sale) : undefined}
                  cancelLabel="Cancel Yard Sale"
                  busy={cancellingId === sale.id}
                  confirm={{
                    title: "Cancel this yard sale?",
                    body: "Are you sure you want to cancel this yard sale? It will be marked as cancelled.",
                    confirmLabel: "Cancel Yard Sale",
                  }}
                />
              }
            >
              {sale.description && <p className="account-sale-description">{sale.description}</p>}
            </ListingCard>
          ))}
        </CardGrid>
      )}
    </AccountLayout>
  );
}

export default MyYardSales;
