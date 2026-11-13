import { useAuth } from "../context/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { cancelProductPosting } from "../lib/productActions";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../hooks/useToast";
import { SectionHeader } from "./layout/SectionHeader";
import { CardGrid } from "./layout/CardGrid";
import { ProductCard } from "./listing/ProductCard";
import { ListingSkeletonGroup } from "./listing/ListingSkeleton";
import { OwnerActions } from "./listing/OwnerActions";
import { Button } from "./ui/Button";
import { StatusMessage } from "./ui/StatusMessage";
import "./products.css";

const NO_PRODUCTS = [];

function Products({ onProductsLoaded, previewLimit = 10 }) {
  const toast = useToast();
  const { user } = useAuth();
  const [cancellingId, setCancellingId] = useState(null);
  const { data, error, loading, reload, setData } = useAsync(async () => {
    const { data, error } = await
      supabase
        .from("products")
        .select("id,title,description,price,image_urls,user_id,brand,condition,pickup,shipping")
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
      console.error("Unable to load sales:", error);
      throw error;
    }

    return {
      products: data || [],
    };
  }, [], { refetchOnEvents: ["yardSailorProductsUpdated"] });

  const products = error ? NO_PRODUCTS : data?.products ?? NO_PRODUCTS;
  const currentUserId = user?.id ?? null;

  useEffect(() => {
    onProductsLoaded?.(products);
  }, [products, onProductsLoaded]);

  async function cancelSale(product) {
    if (!currentUserId || product.user_id !== currentUserId) {
      toast.show("Only the seller can cancel this sale.", { tone: "error" });
      return;
    }

    setCancellingId(product.id);
    const { error: deleteError } = await cancelProductPosting(product.id, currentUserId);
    setCancellingId(null);

    if (deleteError) {
      toast.show(deleteError.message, { tone: "error" });
      return;
    }

    setData((current) => current && {
      ...current,
      products: current.products.filter((row) => row.id !== product.id),
    });
  }

  return (
    <section className="products-section">
      <SectionHeader
        className="products-heading"
        title="Newest Sailor Products"
        linkTo="/shop"
        linkLabel="View All"
      />

      {loading && !data ? (
        <ListingSkeletonGroup className="ui-card-grid products-grid" count={previewLimit} label="Loading products…" />
      ) : error ? (
        <StatusMessage
          className="products-status"
          kind="error"
          title="Unable to load products."
          onRetry={reload}
        />
      ) : products.length === 0 ? (
        <StatusMessage
          className="products-status"
          title="No products yet"
          action={<Button to="/post-sale">Post an item</Button>}
        >
          <p>Be the first to list a secondhand find.</p>
        </StatusMessage>
      ) : (
        <CardGrid className="products-grid" min={200} limit={previewLimit}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showSeller={false}
              showDescription
              actions={product.user_id === currentUserId ? (
                <OwnerActions
                  size="sm"
                  cancelLabel="Cancel Sale"
                  busyLabel="Cancelling..."
                  busy={cancellingId === product.id}
                  onCancel={() => cancelSale(product)}
                />
              ) : null}
            />
          ))}
        </CardGrid>
      )}
    </section>
  );
}

export default Products;
