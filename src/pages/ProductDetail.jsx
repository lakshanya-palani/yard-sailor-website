import SaveButton from "../components/SaveButton";
import { startCheckout, checkoutDestination, PaymentError } from "../lib/payments";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useCart } from "../context/CartContext";
import { commerceError, productLogin, startConversation } from "../lib/commerce";
import "./ProductDetail.css";

function ProductDetail() {
  const { id } = useParams();
  const [saveParams] = useSearchParams();
  const { add } = useCart();
  const [action, setAction] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setNotFound(false);
      setFeedback("");
      setActionError("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Unable to load product:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProduct(data);
      setCurrentImageIndex(0);

      const [{ data: sellerData, error: sellerError }, { data: authData }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", data.user_id)
            .maybeSingle(),
          supabase.auth.getSession(),
        ]);

      if (sellerError) {
        console.error("Unable to load seller profile:", sellerError);
      }

      setSeller(sellerData || null);
      setCurrentUserId(authData?.session?.user?.id || null);
      setLoading(false);
    }

    loadProduct();
  }, [id]);

  async function purchaseAction(kind) {
    if (action) return;
    setAction(kind); setFeedback(""); setActionError("");
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error && error.name !== "AuthSessionMissingError") throw error;
      if (!user) { navigate(productLogin(id)); return; }
      if (user.id === product.user_id) throw new Error("You cannot buy or message your own listing.");
      if (kind === 'buy') checkoutDestination(await startCheckout([id], 'buy_now'), navigate);
      else if (kind === 'message') {
        const conversation = await startConversation(id);
        navigate(`/messages?conversation=${conversation}`);
      } else {
        const inserted = await add(id);
        setFeedback(inserted ? 'Added to your cart.' : 'This item is already in your cart.');
      }
    } catch (e) { setActionError(e instanceof PaymentError ? e.message : commerceError(e)); }
    finally { setAction(null); }
  }

  const images = product?.image_urls || [];

  function showPreviousImage() {
    setCurrentImageIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  }

  function showNextImage() {
    setCurrentImageIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  }

  async function cancelPosting() {
    if (
      !currentUserId ||
      product.user_id !== currentUserId ||
      !window.confirm("Are you sure you want to cancel this posting?")
    ) {
      return;
    }

    setDeleting(true);
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("user_id", currentUserId);
    setDeleting(false);

    if (error) {
      console.error("Unable to cancel posting:", error);
      alert(error.message);
      return;
    }

    window.dispatchEvent(new Event("yardSailorProductsUpdated"));
    navigate("/");
  }

  if (loading) {
    return <main className="product-detail-page"><p className="product-detail-status">Loading product...</p></main>;
  }

  if (notFound || !product) {
    return <main className="product-detail-page"><div className="product-detail-message"><h1>Product not found</h1><p>This posting may no longer be available.</p><Link to="/">Return home</Link></div></main>;
  }

  const sellerName = seller?.username?.trim() || "Yard Sailor seller";
  const sellerInitial = seller?.username?.trim()
    ? seller.username.trim().charAt(0).toUpperCase()
    : "Y";
  const isOwner = product.user_id === currentUserId;

  return (
    <main className="product-detail-page">
      <div className="product-detail-layout">
        <section className="product-gallery" aria-label="Product images">
          <div className="product-main-image-container">
            {images.length > 0 ? (
              <img
                className="product-detail-main-image"
                src={images[currentImageIndex]}
                alt={`${product.title} — image ${currentImageIndex + 1}`}
              />
            ) : (
              <div className="product-no-image">No image available</div>
            )}

            {images.length > 1 && (
              <>
                <button className="gallery-arrow gallery-arrow-previous" type="button" onClick={showPreviousImage} aria-label="Previous image">‹</button>
                <button className="gallery-arrow gallery-arrow-next" type="button" onClick={showNextImage} aria-label="Next image">›</button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="product-thumbnails">
              {images.map((image, index) => (
                <button
                  className={`product-thumbnail-button ${index === currentImageIndex ? "selected" : ""}`}
                  type="button"
                  key={image}
                  onClick={() => setCurrentImageIndex(index)}
                  aria-label={`Show image ${index + 1}`}
                >
                  <img className="product-thumbnail" src={image} alt={`${product.title} thumbnail ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="product-detail-information">
          <h1>{product.title}</h1>
          {saveParams.get("save") === "1" && <p>Use the heart below to finish saving this item. Saving does not reserve it.</p>}
          <SaveButton productId={product.id} title={product.title} detail />
          <p className="product-detail-price">${Number(product.price).toFixed(2)}</p>

          <dl className="product-detail-meta">
            {product.brand && <><dt>Brand</dt><dd>{product.brand}</dd></>}
            <dt>Condition</dt><dd>{product.condition || "Not specified"}</dd>
          </dl>

          <div className="product-detail-description">
            <h2>Description</h2>
            <p>{product.description}</p>
          </div>

          <div className="product-detail-tags">
            {product.pickup && <span>Pickup available</span>}
            {product.shipping && <span>Shipping available</span>}
          </div>

          <div className="product-seller">
            <p>Listed by</p>
            <div>
              <span className="product-seller-avatar">
                {seller?.avatar_url ? <img src={seller.avatar_url} alt="" /> : sellerInitial}
              </span>
              <strong>{sellerName}</strong>
            </div>
          </div>

          {isOwner ? (
            <div className="product-owner-actions">
              <Link to={`/products/${product.id}/edit`}>Edit Posting</Link>
              <button type="button" onClick={cancelPosting} disabled={deleting}>{deleting ? "Cancelling..." : "Cancel Posting"}</button>
            </div>
          ) : (
            <div className="product-buyer-actions">
              <p className="commerce-muted">Checkout is in test mode. No real purchase or seller payout.</p>
              <button className="product-buy-now" disabled={!!action} onClick={() => purchaseAction('buy')}>{action === 'buy' ? 'Opening…' : 'Buy Now'}</button>
              <button disabled={!!action} onClick={() => purchaseAction('cart')}>{action === 'cart' ? 'Adding…' : 'Add to Cart'}</button>
              <button disabled={!!action} onClick={() => purchaseAction('message')}>{action === 'message' ? 'Opening…' : 'Message Seller'}</button>
              {feedback && <p role="status">{feedback} <Link to="/cart">View cart</Link></p>}
              {actionError && <p role="alert">{actionError}</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProductDetail;
