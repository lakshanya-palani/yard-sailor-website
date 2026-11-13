import { fetchProfilesByIds } from "../lib/profiles";
import { useAsync } from "../hooks/useAsync";
import { cancelProductPosting } from "../lib/productActions";
import SaveButton from "../components/SaveButton";
import { startCheckout, checkoutDestination, PaymentError } from "../lib/payments";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useCart } from "../context/CartContext";
import { commerceError, productLogin, startConversation } from "../lib/commerce";
import { PAYMENTS_ENABLED } from "../lib/features";
import { Button } from "../components/ui/Button";
import { Price } from "../components/ui/Price";
import { FormAlert } from "../components/ui/FormAlert";
import { StatusMessage } from "../components/ui/StatusMessage";
import { PageShell } from "../components/layout/PageShell";
import { DeliveryTags } from "../components/listing/DeliveryTags";
import { SellerChip } from "../components/listing/SellerChip";
import { ImageGallery } from "../components/listing/ImageGallery";
import { OwnerActions } from "../components/listing/OwnerActions";
import { DetailLayout } from "../components/listing/DetailLayout";
import { MetaList } from "../components/listing/MetaList";
import { useToast } from "../hooks/useToast";
import { categoryLabel } from "../lib/listingOptions";
import { formatDateTime } from "../lib/format";
import "./ProductDetail.css";

function ProductDetail() {
  const { id } = useParams();
  const { userId } = useCart();
  return <ProductDetailForListing key={`${id}:${userId || "signed-out"}`} id={id} />;
}

function ProductDetailForListing({ id }) {
  const location = useLocation();
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const [saveParams] = useSearchParams();
  const { add } = useCart();
  const [action, setAction] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const navigate = useNavigate();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  const { data: listing, loading, error: loadError, reload } = useAsync(async () => {
    const { data: product, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!product) return null;
    const [profiles, { data: authData }] = await Promise.all([
      fetchProfilesByIds([product.user_id]),
      supabase.auth.getSession(),
    ]);
    return { product, seller: profiles[product.user_id] || null, currentUserId: authData?.session?.user?.id || null };
  }, [id]);
  const { product = null, seller = null, currentUserId = null } = listing || {};

  async function purchaseAction(kind) {
    if (action || (kind === "buy" && !PAYMENTS_ENABLED)) return;
    setAction(kind); setFeedback(""); setActionError("");
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!active.current) return;
      if (error && error.name !== "AuthSessionMissingError") throw error;
      if (!user) { navigate(productLogin(id)); return; }
      if (user.id === product.user_id) throw new Error("You cannot buy or message your own listing.");
      if (kind === 'buy') {
        const result = await startCheckout([id], 'buy_now');
        if (active.current) checkoutDestination(result, navigate);
      }
      else if (kind === 'message') {
        const conversation = await startConversation(id);
        if (active.current) navigate(`/messages?conversation=${conversation}`);
      } else {
        const inserted = await add(id);
        if (active.current) setFeedback(inserted ? 'Added to your cart.' : 'This item is already in your cart.');
      }
    } catch (e) { if (active.current) setActionError(e instanceof PaymentError ? e.message : commerceError(e)); }
    finally { if (active.current) setAction(null); }
  }

  // Confirmation happens in <OwnerActions> (shared ConfirmDialog) before this runs.
  async function cancelPosting() {
    if (!active.current || !currentUserId || product.user_id !== currentUserId) {
      return;
    }

    setDeleting(true);
    const { error } = await cancelProductPosting(product.id, currentUserId);
    if (!active.current) return;
    setDeleting(false);

    if (error) {
      console.error("Unable to cancel posting:", error);
      toast.show(error.message, { tone: "error" });
      return;
    }

    toast.show("Your posting was cancelled.", { tone: "success" });
    navigate("/");
  }

  if (loading) {
    return <PageShell><StatusMessage kind="loading" title="Loading product..." /></PageShell>;
  }

  if (loadError) return <PageShell><StatusMessage kind="error" titleAs="h1" title="Unable to load product" onRetry={reload}>Please try again.</StatusMessage></PageShell>;

  if (!product) {
    return (
      <PageShell width="narrow">
        <StatusMessage
          kind="empty"
          titleAs="h1"
          title="Product not found"
          action={<Button variant="secondary" to="/">Return home</Button>}
        >
          <p>This posting may no longer be available.</p>
        </StatusMessage>
      </PageShell>
    );
  }

  const isOwner = product.user_id === currentUserId;
  const images = product.image_urls || [];

  return (
    <PageShell className="product-detail-page">
      <DetailLayout media={<ImageGallery images={images} alt={product.title} label="Product images" />}>
        {location.state?.confirmation === "Your listing was posted." && <FormAlert tone="success">Your listing was posted.</FormAlert>}

        <header className="product-detail-heading">
          <h1>{product.title}</h1>
          <Price value={product.price} className="product-detail-price" />
        </header>

        {saveParams.get("save") === "1" && <p className="product-detail-note">Use the heart below to finish saving this item. Saving does not reserve it.</p>}
        <SaveButton productId={product.id} title={product.title} detail />

        <MetaList
          items={[
            { label: "Brand", value: product.brand },
            { label: "Condition", value: product.condition || "Not specified" },
            { label: "Category", value: categoryLabel(product.category) },
            { label: "Listed", value: formatDateTime(product.created_at) },
          ]}
        />

        <section className="product-detail-description" aria-labelledby="product-description-heading">
          <h2 id="product-description-heading">Description</h2>
          <p>{product.description}</p>
        </section>

        <DeliveryTags pickup={product.pickup} shipping={product.shipping} />

        <SellerChip className="product-detail-seller" profile={seller} label="Listed by" size={42} />

        {isOwner ? (
          <OwnerActions
            editTo={`/products/${product.id}/edit`}
            onCancel={cancelPosting}
            busy={deleting}
            confirm={{
              title: "Cancel this posting?",
              body: "Are you sure you want to cancel this posting? It will be removed from Yard Sailor.",
              confirmLabel: "Cancel Posting",
            }}
          />
        ) : (
          <div className="product-detail-actions">
            {PAYMENTS_ENABLED && <>
              <p className="product-detail-note">Checkout is in test mode. No real purchase or seller payout.</p>
              <Button block disabled={!!action} loading={action === 'buy'} onClick={() => purchaseAction('buy')}>{action === 'buy' ? 'Opening…' : 'Buy Now'}</Button>
            </>}
            <div className="product-detail-actions__row">
              <Button variant={PAYMENTS_ENABLED ? "secondary" : "primary"} disabled={!!action} loading={action === 'cart'} onClick={() => purchaseAction('cart')}>{action === 'cart' ? 'Adding…' : 'Add to Cart'}</Button>
              <Button variant="secondary" disabled={!!action} loading={action === 'message'} onClick={() => purchaseAction('message')}>{action === 'message' ? 'Opening…' : 'Message Seller'}</Button>
            </div>
            {feedback && <FormAlert tone="success">{feedback} <Link to="/cart">View cart</Link></FormAlert>}
            {actionError && <FormAlert tone="error">{actionError}</FormAlert>}
          </div>
        )}
      </DetailLayout>
    </PageShell>
  );
}

export default ProductDetail;
