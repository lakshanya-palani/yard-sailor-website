import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./PostSale.css";

const SALE_IMAGES_BUCKET = "sale-images";

function PostSale() {
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

  const handleImageUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const invalidFile = selectedFiles.find(
      (file) =>
        !allowedTypes.includes(file.type) ||
        file.size > 5 * 1024 * 1024
    );

    if (invalidFile) {
      alert(
        "Each image must be a JPEG, PNG, or WebP file no larger than 5 MB."
      );
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
        ]);
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

    if (submitting) return;

    const numericPrice = Number(price);

    if (!title.trim()) {
      alert("Please enter a title.");
      return;
    }

    if (price === "" || !Number.isFinite(numericPrice) || numericPrice < 0) {
      alert("Please enter a valid, non-negative price.");
      return;
    }

    if (!condition) {
      alert("Please select a condition.");
      return;
    }

    if (!description.trim()) {
      alert("Please enter a description.");
      return;
    }

    if (images.length === 0) {
      alert("Please upload at least one image.");
      return;
    }

    if (!pickup && !shipping) {
      alert("Please choose pickup, shipping, or both.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Unable to verify sale owner:", userError);
        alert("Your session has expired. Please log in again.");
        navigate("/login?redirect=/post-sale", { replace: true });
        return;
      }

      const imageUrls = [];
      console.log(`Using bucket: ${SALE_IMAGES_BUCKET}`);

      for (const image of images) {
        const extension = (image.file.name.split(".").pop() || "jpg")
          .toLowerCase();
        const filePath =
          `${user.id}/${crypto.randomUUID()}.${extension}`;
        console.log("Uploading path:", filePath);

        const { error: uploadError } = await supabase.storage
          .from(SALE_IMAGES_BUCKET)
          .upload(filePath, image.file, {
            cacheControl: "3600",
            contentType: image.file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Sale image upload failed:", uploadError);
          const bucketHelp = uploadError.message
            .toLowerCase()
            .includes("bucket not found")
            ? " Create a public Supabase Storage bucket named sale-images."
            : "";
          alert(`Unable to upload image: ${uploadError.message}.${bucketHelp}`);
          return;
        }

        const { data: urlData } = supabase.storage
          .from(SALE_IMAGES_BUCKET)
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          console.error("No public URL returned for sale image:", filePath);
          alert("An image uploaded, but its public URL could not be created.");
          return;
        }

        const publicUrl = urlData.publicUrl;
        console.log("Product image URL:", publicUrl);
        imageUrls.push(publicUrl);
      }

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

      if (insertError) {
        console.error("Product insert failed:", insertError);
        alert(insertError.message);
        return;
      }

      console.log("Product posted:", insertedProduct.id);
      window.dispatchEvent(
        new CustomEvent("yardSailorProductsUpdated", {
          detail: insertedProduct,
        })
      );
      navigate("/");
    } catch (error) {
      console.error("Unexpected error while posting sale:", error);
      alert("Unable to post your sale. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="post-sale-page">
      <div className="post-sale-container">
        <div className="post-sale-heading">
          <p className="post-sale-eyebrow">YARD SAILOR</p>

          <h1>Post a Sale</h1>

          <p>
            Give your treasure a new home. Add photos and details
            so nearby sailors can discover it.
          </p>
        </div>

        <form className="post-sale-form" onSubmit={handleSubmit}>
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
                    ×
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
                maxLength={60}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label" htmlFor="sale-condition">
                Condition
              </label>

              <select
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
              </select>
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
        </form>
      </div>
    </main>
  );
}

export default PostSale;
