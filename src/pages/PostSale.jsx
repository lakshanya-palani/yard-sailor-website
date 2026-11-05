import SelectField from "../components/SelectField";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import "./PostSale.css";
import { validateProduct, validImages, useListingDraft, useUnsavedChanges } from "../lib/listingEditor";
import { uploadImage } from "../lib/uploads";


function PostSale() {
  const { user, loading } = useAuth();
  if (loading) return <main className="post-sale-page">Loading…</main>;
  if (!user) return <main className="post-sale-page">Please log in to post a listing.</main>;
  return <PostSaleForm key={user.id} ownerId={user.id} />;
}

function PostSaleForm({ ownerId }) {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");

  const [pickup, setPickup] = useState(true);
  const [shipping, setShipping] = useState(false);

  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const activeRef = useRef(false);
  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);
  const [message, setMessage] = useState("");
  const draft = { title, price, brand, condition, description, pickup, shipping };
  const { ready: draftReady, clear: clearDraft } = useListingDraft("product", ownerId, draft, (saved) => {
    setTitle(saved.title || ""); setPrice(saved.price || ""); setBrand(saved.brand || "");
    setCondition(saved.condition || ""); setDescription(saved.description || "");
    setPickup(saved.pickup !== false); setShipping(Boolean(saved.shipping));
  });
  useUnsavedChanges(Boolean(title || price || brand || condition || description || images.length));

  const handleImageUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);

    if (!validImages(selectedFiles)) {
      setMessage("Each image must be a JPEG, PNG, or WebP file no larger than 5 MB.");
      e.target.value = "";
      return;
    }

    const remainingSlots = 8 - images.length;

    if (remainingSlots <= 0) return;

    const filesToAdd = selectedFiles.slice(0, remainingSlots);

    filesToAdd.forEach((file) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        setImages((previousImages) => [
          ...previousImages,
          {
            id: crypto.randomUUID(),
            src: reader.result,
            file,
          },
        ].slice(0, 8));
      };

      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeImage = (id) => {
    setImages((previousImages) =>
      previousImages.filter((image) => image.id !== id)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submittingRef.current) return;
    const numericPrice = Number(price);
    const validation = validateProduct(draft) || (images.length === 0 ? "Please upload at least one image." : "");
    if (validation) { setMessage(validation); return; }
    setMessage("");
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!activeRef.current) return;
      if (userError || user?.id !== ownerId) {
        console.error("Unable to verify sale owner:", userError);
        setMessage("Your session has expired. Please log in again.");
        navigate("/login?redirect=/post-sale", { replace: true });
        return;
      }

      const imageUrls = [];
      for (const image of images) {
        const { data: uploadAuth, error: uploadAuthError } = await supabase.auth.getUser();
        if (!activeRef.current) return;
        if (uploadAuthError || uploadAuth.user?.id !== ownerId) throw new Error("Your session has changed. Please log in again.");
        imageUrls.push(await uploadImage(image.file, 'products'));
      }

      const { data: currentAuth, error: currentAuthError } = await supabase.auth.getUser();
      if (!activeRef.current) return;
      if (currentAuthError || currentAuth.user?.id !== user.id) throw new Error("Your session has changed. Please log in again.");

      const { data: insertedProduct, error: insertError } = await supabase
        .from("products")
        .insert({
          user_id: user.id,
          title: title.trim(),
          price: numericPrice,
          brand: brand.trim() || null,
          condition,
          description: description.trim(),
          pickup,
          shipping,
          image_urls: imageUrls,
        })
        .select()
        .single();

      if (!activeRef.current) return;
      if (insertError) {
        console.error("Product insert failed:", insertError);
        setMessage("Unable to post your sale. Please try again.");
        return;
      }
      if (!insertedProduct?.id) throw new Error("The listing could not be confirmed.");
      clearDraft();
      window.dispatchEvent(
        new CustomEvent("yardSailorProductsUpdated", {
          detail: insertedProduct,
        })
      );
      navigate(`/products/${insertedProduct.id}`, { state: { confirmation: "Your listing was posted." } });
    } catch (error) {
      if (!activeRef.current) return;
      console.error("Unexpected error while posting sale:", error);
      setMessage("Unable to post your sale. Please try again.");
    } finally {
      submittingRef.current = false;
      if (activeRef.current) setSubmitting(false);
    }
  };

  return (
    <main className="post-sale-page">
      <div className="post-sale-container">
        <div className="post-sale-heading">
          <p className="post-sale-eyebrow">YARD SAILOR</p>

          <h1>Post an Item</h1>

          <p>
            Give your treasure a new home. Add photos and details
            so nearby sailors can discover it.
          </p>
        </div>

        <form className="post-sale-form" onSubmit={handleSubmit}>
          <fieldset disabled={!draftReady} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          {message && <p role="alert" className="listing-message">{message}</p>}
          <div className="form-section">
            <div className="section-heading">
              <h2>Photos</h2>
              <span>{images.length}/8</span>
            </div>

            <p className="section-description">
              Add up to 8 photos. Your first photo will be used as
              the main listing image.
            </p>

            <div className="image-grid">
              {images.map((image, index) => (
                <div className="image-preview" key={image.id}>
                  <img
                    src={image.src}
                    alt={`Product preview ${index + 1}`}
                  />

                  {index === 0 && (
                    <span className="cover-label">Cover</span>
                  )}

                  <button
                    type="button"
                    className="remove-image"
                    onClick={() => removeImage(image.id)}
                    aria-label="Remove image"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              ))}

              {images.length < 8 && (
                <label className="image-upload-box">
                  <span className="upload-plus">+</span>
                  <span>Add Photo</span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="sale-details-grid form-section">
            <div>
              <label className="input-label" htmlFor="sale-price">
                Price
              </label>

              <input
                id="sale-price"
                className="sale-input"
                type="number"
                name="price"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="input-label" htmlFor="sale-brand">
                Brand
              </label>

              <input
                id="sale-brand"
                className="sale-input"
                type="text"
                name="brand"
                placeholder="Brand (optional)"
                value={brand}
                maxLength={100}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label" htmlFor="sale-condition">
                Condition
              </label>

              <SelectField
                id="sale-condition"
                className="sale-input sale-select"
                name="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
              >
                <option value="">Select condition</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </SelectField>
            </div>
          </div>

          <div className="form-section">
            <label className="input-label" htmlFor="sale-title">
              Title
            </label>

            <input
              id="sale-title"
              className="sale-input"
              type="text"
              placeholder="What are you selling?"
              value={title}
              maxLength={70}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="character-count">
              {title.length}/70
            </div>
          </div>

          <div className="form-section">
            <label
              className="input-label"
              htmlFor="sale-description"
            >
              Description
            </label>

            <textarea
              id="sale-description"
              className="sale-textarea"
              placeholder="Tell buyers about the item, condition, size, or anything else they should know..."
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="character-count">
              {description.length}/500
            </div>
          </div>

          <div className="form-section">
            <h2>How can buyers get it?</h2>

            <div className="delivery-options">
              <button
                type="button"
                className={`delivery-option ${
                  pickup ? "selected" : ""
                }`}
                onClick={() => setPickup((value) => !value)}
              >
                <div>
                  <strong>Local Pickup</strong>
                  <span>Buyer picks it up from you</span>
                </div>

                <div className="delivery-check">
                  {pickup && "✓"}
                </div>
              </button>

              <button
                type="button"
                className={`delivery-option ${
                  shipping ? "selected" : ""
                }`}
                onClick={() => setShipping((value) => !value)}
              >
                <div>
                  <strong>Shipping</strong>
                  <span>Ship the item to the buyer</span>
                </div>

                <div className="delivery-check">
                  {shipping && "✓"}
                </div>
              </button>
            </div>
          </div>

          <div className="post-sale-actions">
            <button
              type="button"
              className="cancel-post-button"
              onClick={() => navigate("/")}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="publish-sale-button"
              disabled={submitting}
            >
              {submitting ? "Posting..." : "Post Sale"}
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </main>
  );
}

export default PostSale;
