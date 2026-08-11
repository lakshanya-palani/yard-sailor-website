import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PostSale.css";

function PostSale() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [pickup, setPickup] = useState(true);
  const [shipping, setShipping] = useState(false);

  const [images, setImages] = useState([]);

  const handleImageUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);

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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter a title.");
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

    const newSale = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      images: images.map((image) => image.src),
      pickup,
      shipping,
      createdAt: new Date().toISOString(),
    };

    const existingSales =
      JSON.parse(localStorage.getItem("yardSailorSales")) || [];

    const updatedSales = [newSale, ...existingSales];

    localStorage.setItem(
      "yardSailorSales",
      JSON.stringify(updatedSales)
    );

    window.dispatchEvent(new Event("yardSailorSalesUpdated"));

    navigate("/");
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
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                  />
                </label>
              )}
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
            >
              Post Sale
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default PostSale;