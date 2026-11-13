import { useAuth } from "../context/useAuth";
import { useState } from "react";
import { AccountLayout } from "../components/layout/AccountLayout";
import { CardGrid } from "../components/layout/CardGrid";
import { ProductCard } from "../components/listing/ProductCard";
import { OwnerActions } from "../components/listing/OwnerActions";
import { ListingSkeletonGroup } from "../components/listing/ListingSkeleton";
import { StatusMessage } from "../components/ui/StatusMessage";
import { Button } from "../components/ui/Button";
import { useOwnedRows } from "../hooks/useOwnedRows";
import { useToast } from "../hooks/useToast";
import { cancelProductPosting } from "../lib/productActions";

function MyPostings() {
  const { user } = useAuth();
  return <MyPostingsForUser key={user?.id || "signed-out"} />;
}

function MyPostingsForUser() {
  const { user, rows: products, loading, error, reload, setRows: setProducts } = useOwnedRows({
    table: "products",
    ownerColumn: "user_id",
    ownerLog: "Unable to load posting owner:",
    rowsLog: "Unable to load postings:",
  });
  const [cancellingId, setCancellingId] = useState(null);
  const toast = useToast();

  // Confirmation happens in <OwnerActions> (shared ConfirmDialog) before this runs.
  async function cancelPosting(product) {
    if (!user) return;

    setCancellingId(product.id);
    const { error: cancelError } = await cancelProductPosting(product.id, user.id);
    setCancellingId(null);

    if (cancelError) {
      toast.show(cancelError.message, { tone: "error" });
      return;
    }

    setProducts((items) => items.filter((item) => item.id !== product.id));
  }

  return (
    <AccountLayout title="My Postings" subtitle="Manage the individual marketplace items you have posted.">
      {loading ? (
        <ListingSkeletonGroup count={3} seller={false} label="Loading your postings..." />
      ) : error ? (
        <StatusMessage kind="error" title="Your postings could not be loaded" onRetry={reload}>
          <p>{error.message}</p>
        </StatusMessage>
      ) : products.length === 0 ? (
        <StatusMessage
          title="No postings yet"
          action={<Button to="/post-sale">Post an Item</Button>}
        >
          <p>Your marketplace products will appear here.</p>
        </StatusMessage>
      ) : (
        <CardGrid columns={3}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showSeller={false}
              showSave={false}
              headingLevel={2}
              actions={
                <OwnerActions
                  size="sm"
                  editTo={`/products/${product.id}/edit`}
                  onCancel={() => cancelPosting(product)}
                  busy={cancellingId === product.id}
                  confirm={{
                    title: "Cancel this posting?",
                    body: "Are you sure you want to cancel this posting? It will be removed from Yard Sailor.",
                    confirmLabel: "Cancel Posting",
                  }}
                />
              }
            />
          ))}
        </CardGrid>
      )}
    </AccountLayout>
  );
}

export default MyPostings;
