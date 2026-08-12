import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./PostYardSale.css";

const YARD_SALE_IMAGES_BUCKET = "yard-sale-images";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

function PostYardSale() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

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

    if (!title.trim()) {
      alert("Please give your yard sale a title.");
      return;
    }

    if (!description.trim()) {
      alert("Please enter a description.");
      return;
    }

    if (!street.trim() || !city.trim() || !state || !zip.trim()) {
      alert("Please fill out the full address so sailors can find you.");
      return;
    }

    if (images.length === 0) {
      alert("Please upload at least one photo of your yard sale.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Unable to verify yard sale owner:", userError);
        alert("Your session has expired. Please log in again.");
        navigate("/login?redirect=/post-yard-sale", { replace: true });
        return;
      }

      const imageUrls = [];
      console.log(`Using bucket: ${YARD_SALE_IMAGES_BUCKET}`);

      for (const image of images) {
        const extension = (image.file.name.split(".").pop() || "jpg")
          .toLowerCase();
        const filePath =
          `${user.id}/${crypto.randomUUID()}.${extension}`;
        console.log("Uploading path:", filePath);

        const { error: uploadError } = await supabase.storage
          .from(YARD_SALE_IMAGES_BUCKET)
          .upload(filePath, image.file, {
            cacheControl: "3600",
            contentType: image.file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Yard sale image upload failed:", uploadError);
          const bucketHelp = uploadError.message
            .toLowerCase()
            .includes("bucket not found")
            ? " Create a public Supabase Storage bucket named yard-sale-images."
            : "";
          alert(`Unable to upload image: ${uploadError.message}.${bucketHelp}`);
          return;
        }

        const { data: urlData } = supabase.storage
          .from(YARD_SALE_IMAGES_BUCKET)
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          console.error("No public URL returned for yard sale image:", filePath);
          alert("An image uploaded, but its public URL could not be created.");
          return;
        }

        const publicUrl = urlData.publicUrl;
        console.log("Yard sale image URL:", publicUrl);
        imageUrls.push(publicUrl);
      }

      const fullAddress = `${street.trim()}, ${city.trim()}, ${state} ${zip.trim()}`;

      const { data: insertedYardSale, error: insertError } = await supabase
        .from("yard_sales")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          street_address: street.trim(),
          city: city.trim(),
          state,
          zip_code: zip.trim(),
          full_address: fullAddress,
          image_urls: imageUrls,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Yard sale insert failed:", insertError);
        alert(insertError.message);
        return;
      }

      console.log("Yard sale posted:", insertedYardSale.id);
      window.dispatchEvent(
        new CustomEvent("yardSailorYardSalesUpdated", {
          detail: insertedYardSale,
        })
      );
      navigate("/");
    } catch (error) {
      console.error("Unexpected error while posting yard sale:", error);
      alert("Unable to post your yard sale. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="post-sale-page">
      <div className="post-sale-container">
        <div className="post-sale-heading">
          <p className="post-sale-eyebrow">YARD SAILOR</p>

          <h1>Post Your Yard Sale</h1>

          <p>
            Let nearby sailors know where to find you. Add a photo,
            tell them what to expect, and drop your address.
          </p>
        </div>

        <form className="post-sale-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="section-heading">
              <h2>Photos</h2>
              <span>{images.length}/8</span>
            </div>

            <p className="section-description">
              Add up to 8 photos of your yard sale. Your first photo
              will be used as the main listing image.
            </p>

            <div className="image-grid">
              {images.map((image, index) => (
                <div className="image-preview" key={image.id}>
                  <img
                    src={image.src}
                    alt={`Yard sale preview ${index + 1}`}
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

          <div className="form-section">
            <label className="input-label" htmlFor="sale-title">
              Title
            </label>

            <input
              id="sale-title"
              className="sale-input"
              type="text"
              placeholder="e.g. Multi-Family Saturday Sale"
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
              placeholder="Tell sailors what to expect — furniture, tools, kids' clothes, early birds welcome, cash only, etc..."
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="character-count">
              {description.length}/500
            </div>
          </div>

          <div className="form-section">
            <h2>Address</h2>
            <p className="section-description">
              This is the location that will appear on the map.
            </p>

            <label className="input-label" htmlFor="sale-street">
              Street Address
            </label>

            <input
              id="sale-street"
              className="sale-input"
              type="text"
              placeholder="123 Ocean View Ave"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
            />

            <div className="address-grid">
              <div>
                <label className="input-label" htmlFor="sale-city">
                  City
                </label>

                <input
                  id="sale-city"
                  className="sale-input"
                  type="text"
                  placeholder="Santa Cruz"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="input-label" htmlFor="sale-state">
                  State
                </label>

                <select
                  id="sale-state"
                  className="sale-input sale-select"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                >
                  <option value="">Select</option>
                  {US_STATES.map((abbr) => (
                    <option key={abbr} value={abbr}>
                      {abbr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sale-details-grid" style={{ marginTop: 16 }}>
              <div>
                <label className="input-label" htmlFor="sale-zip">
                  ZIP Code
                </label>

                <input
                  id="sale-zip"
                  className="sale-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="95060"
                  value={zip}
                  maxLength={10}
                  onChange={(e) => setZip(e.target.value)}
                  required
                />
              </div>
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
              {submitting ? "Posting..." : "Post Yard Sale"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default PostYardSale;
