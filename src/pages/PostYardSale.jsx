import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { geocodeAddress, hasValidCoordinates } from "../utils/location";
import "./PostSale.css";

const SALE_IMAGES_BUCKET = "sale-images";

function PostYardSale() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", address: "", startTime: "", endTime: "" });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function selectImages(event) {
    const files = Array.from(event.target.files || []).slice(0, 8 - images.length);
    const invalid = files.find((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) {
      alert("Each image must be a JPEG, PNG, or WebP file no larger than 5 MB.");
      event.target.value = "";
      return;
    }
    const additions = files.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }));
    setImages((current) => [...current, ...additions]);
    event.target.value = "";
  }

  function removeImage(image) {
    URL.revokeObjectURL(image.preview);
    setImages((current) => current.filter((item) => item.id !== image.id));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const title = form.title.trim();
    const description = form.description.trim();
    const address = form.address.trim();

    if (!title || !description || !address || !form.startTime || !form.endTime) {
      alert("Please complete the title, description, address, start time, and end time.");
      return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      alert("The yard sale end time must be after its start time.");
      return;
    }
    if (images.length === 0) {
      alert("Please upload at least one yard sale image.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        alert("Your session has expired. Please log in again.");
        navigate("/login?redirect=/post-yard-sale", { replace: true });
        return;
      }

      let coordinates;
      try {
        coordinates = await geocodeAddress(address);
      } catch (error) {
        console.error("Yard sale address geocoding failed:", error);
        alert(error.message);
        return;
      }

      const latitude = Number(coordinates.latitude);
      const longitude = Number(coordinates.longitude);

      if (!hasValidCoordinates(latitude, longitude)) {
        alert("The address did not return valid map coordinates. Please check it and try again.");
        return;
      }

      const imageUrls = [];
      for (const image of images) {
        const extension = (image.file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${authData.user.id}/yard-sales/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(SALE_IMAGES_BUCKET).upload(path, image.file, {
          cacheControl: "3600",
          contentType: image.file.type,
          upsert: false,
        });
        if (uploadError) {
          console.error("Yard sale image upload failed:", uploadError);
          alert(`Unable to upload image: ${uploadError.message}`);
          return;
        }
        const { data: urlData } = supabase.storage.from(SALE_IMAGES_BUCKET).getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }

      const { data, error } = await supabase
        .from("sales")
        .insert({
          host_id: authData.user.id,
          title,
          description,
          address: coordinates.placeName || address,
          location: `POINT(${longitude} ${latitude})`,
          lat: latitude,
          lng: longitude,
          start_time: new Date(form.startTime).toISOString(),
          end_time: new Date(form.endTime).toISOString(),
          status: "upcoming",
          images: imageUrls,
        })
        .select()
        .single();

      if (error) {
        console.error("Yard sale insert failed:", error);
        alert(error.message);
        return;
      }
      window.dispatchEvent(new CustomEvent("yardSailorYardSalesUpdated", { detail: data }));
      navigate(`/yard-sale/${data.id}`);
    } catch (error) {
      console.error("Unexpected yard sale posting error:", error);
      alert("Unable to post your yard sale. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="post-sale-page">
      <div className="post-sale-container">
        <div className="post-sale-heading"><p className="post-sale-eyebrow">YARD SAILOR</p><h1>Post a Yard Sale</h1><p>Share your event so nearby sailors can discover it on the map.</p></div>
        <form className="post-sale-form" onSubmit={handleSubmit}>
          <div className="form-section"><div className="section-heading"><h2>Photos</h2><span>{images.length}/8</span></div><p className="section-description">Add up to 8 photos. Your first photo will be the cover image.</p><div className="image-grid">{images.map((image, index) => <div className="image-preview" key={image.id}><img src={image.preview} alt={`Yard sale preview ${index + 1}`} />{index === 0 && <span className="cover-label">Cover</span>}<button className="remove-image" type="button" onClick={() => removeImage(image)} aria-label="Remove image">×</button></div>)}{images.length < 8 && <label className="image-upload-box"><span className="upload-plus">+</span><span>Add Photo</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={selectImages} /></label>}</div></div>
          <div className="form-section"><label className="input-label" htmlFor="yard-sale-title">Title</label><input className="sale-input" id="yard-sale-title" name="title" value={form.title} onChange={updateField} maxLength={80} placeholder="Neighborhood garage sale" /></div>
          <div className="form-section"><label className="input-label" htmlFor="yard-sale-description">Description</label><textarea className="sale-textarea" id="yard-sale-description" name="description" value={form.description} onChange={updateField} maxLength={1000} placeholder="Tell visitors what they can find..." /></div>
          <div className="form-section"><label className="input-label" htmlFor="yard-sale-address">Yard Sale Address</label><input className="sale-input" id="yard-sale-address" name="address" value={form.address} onChange={updateField} autoComplete="street-address" placeholder="123 Main St, Santa Cruz, CA 95060" /><p className="section-description">The address will be converted into a map location.</p></div>
          <div className="sale-details-grid form-section"><div><label className="input-label" htmlFor="yard-sale-start">Start</label><input className="sale-input" id="yard-sale-start" name="startTime" type="datetime-local" value={form.startTime} onChange={updateField} /></div><div><label className="input-label" htmlFor="yard-sale-end">End</label><input className="sale-input" id="yard-sale-end" name="endTime" type="datetime-local" value={form.endTime} onChange={updateField} /></div></div>
          <div className="post-sale-actions"><button className="cancel-post-button" type="button" onClick={() => navigate("/")}>Cancel</button><button className="publish-sale-button" disabled={submitting}>{submitting ? "Posting..." : "Post Yard Sale"}</button></div>
        </form>
      </div>
    </main>
  );
}

export default PostYardSale;
