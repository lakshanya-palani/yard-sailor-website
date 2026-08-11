import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./ProductDetail.css";

function ProductDetail() {
  const { id } = useParams();
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
            <button className="contact-seller-placeholder" type="button" disabled>Contact Seller — Coming Soon</button>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProductDetail;
