import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import { geocodeAddress, hasValidCoordinates } from "../utils/location";
import "./PostSale.css";
import { validateSale, validImages, useListingDraft, useUnsavedChanges } from "../lib/listingEditor";
import { uploadImage } from "../lib/uploads";


function PostYardSale() {
  const { user, loading } = useAuth();
  if (loading) return <main className="post-sale-page">Loading…</main>;
  if (!user) return <main className="post-sale-page">Please log in to post a listing.</main>;
  return <PostYardSaleForm key={user.id} ownerId={user.id} />;
}

function PostYardSaleForm({ ownerId }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", address: "", startTime: "", endTime: "" });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const activeRef = useRef(false);
  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);
  const [message, setMessage] = useState("");
  const { ready: draftReady, clear: clearDraft } = useListingDraft("yard-sale", ownerId, form, (saved) => setForm((current) => ({ ...current, ...saved })));
  useUnsavedChanges(Boolean(Object.values(form).some(Boolean) || images.length));

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function selectImages(event) {
    const files = Array.from(event.target.files || []).slice(0, 8 - images.length);
    if (!validImages(files)) {
      setMessage("Each image must be a JPEG, PNG, or WebP file no larger than 5 MB.");
      event.target.value = "";
      return;
    }
    const additions = files.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }));
    setImages((current) => {
      const accepted = additions.slice(0, Math.max(0, 8 - current.length));
      additions.slice(accepted.length).forEach((image) => URL.revokeObjectURL(image.preview));
      return [...current, ...accepted];
    });
    event.target.value = "";
  }

  function removeImage(image) {
    URL.revokeObjectURL(image.preview);
    setImages((current) => current.filter((item) => item.id !== image.id));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    const title = form.title.trim(), description = form.description.trim(), address = form.address.trim();
    const validation = validateSale(form) || (images.length === 0 ? "Please upload at least one yard sale image." : "");
    if (validation) { setMessage(validation); return; }
    setMessage("");
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!activeRef.current) return;
      if (authError || authData.user?.id !== ownerId) {
        setMessage("Your session has expired. Please log in again.");
        navigate("/login?redirect=/post-yard-sale", { replace: true });
        return;
      }

      let coordinates;
      try {
        coordinates = await geocodeAddress(address);
      } catch (error) {
        if (!activeRef.current) return;
        console.error("Yard sale address geocoding failed:", error);
        setMessage("Unable to save your changes. Please check the fields and try again.");
        return;
      }

      if (!activeRef.current) return;
      const latitude = Number(coordinates.latitude);
      const longitude = Number(coordinates.longitude);

      if (!hasValidCoordinates(latitude, longitude)) {
        setMessage("The address did not return valid map coordinates. Please check it and try again.");
        return;
      }

      const imageUrls = [];
      for (const image of images) {
        const { data: uploadAuth, error: uploadAuthError } = await supabase.auth.getUser();
        if (!activeRef.current) return;
        if (uploadAuthError || uploadAuth.user?.id !== ownerId) throw new Error("Your session has changed. Please log in again.");
        imageUrls.push(await uploadImage(image.file, 'yard-sales'));
      }

      const { data: currentAuth, error: currentAuthError } = await supabase.auth.getUser();
      if (!activeRef.current) return;
      if (currentAuthError || currentAuth.user?.id !== authData.user.id) throw new Error("Your session has changed. Please log in again.");

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

      if (!activeRef.current) return;
      if (error) {
        console.error("Yard sale insert failed:", error);
        setMessage("Unable to save your changes. Please check the fields and try again.");
        return;
      }
      if (!data?.id) throw new Error("The listing could not be confirmed.");
      clearDraft();
      window.dispatchEvent(new CustomEvent("yardSailorYardSalesUpdated", { detail: data }));
      navigate(`/yard-sale/${data.id}`, { state: { confirmation: "Your yard sale was posted." } });
    } catch (error) {
      if (!activeRef.current) return;
      console.error("Unexpected yard sale posting error:", error);
      setMessage("Unable to post your yard sale. Please try again.");
    } finally {
      submittingRef.current = false;
      if (activeRef.current) setSubmitting(false);
    }
  }

  return (
    <main className="post-sale-page">
      <div className="post-sale-container">
        <div className="post-sale-heading"><p className="post-sale-eyebrow">YARD SAILOR</p><h1>Post a Yard Sale</h1><p>Share your event so nearby sailors can discover it on the map.</p></div>
        <form className="post-sale-form" onSubmit={handleSubmit}>
          <fieldset disabled={!draftReady} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          {message && <p role="alert" className="listing-message">{message}</p>}
          <div className="form-section"><div className="section-heading"><h2>Photos</h2><span>{images.length}/8</span></div><p className="section-description">Add up to 8 photos. Your first photo will be the cover image.</p><div className="image-grid">{images.map((image, index) => <div className="image-preview" key={image.id}><img src={image.preview} alt={`Yard sale preview ${index + 1}`} />{index === 0 && <span className="cover-label">Cover</span>}<button className="remove-image" type="button" onClick={() => removeImage(image)} aria-label="Remove image"><X size={18} aria-hidden="true" /></button></div>)}{images.length < 8 && <label className="image-upload-box"><span className="upload-plus">+</span><span>Add Photo</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={selectImages} /></label>}</div></div>
          <div className="form-section"><label className="input-label" htmlFor="yard-sale-title">Title</label><input className="sale-input" id="yard-sale-title" name="title" value={form.title} onChange={updateField} maxLength={80} placeholder="Neighborhood garage sale" /></div>
          <div className="form-section"><label className="input-label" htmlFor="yard-sale-description">Description</label><textarea className="sale-textarea" id="yard-sale-description" name="description" value={form.description} onChange={updateField} maxLength={1000} placeholder="Tell visitors what they can find..." /></div>
          <div className="form-section"><label className="input-label" htmlFor="yard-sale-address">Yard Sale Address</label><input className="sale-input" id="yard-sale-address" name="address" maxLength={500} value={form.address} onChange={updateField} autoComplete="street-address" placeholder="123 Main St, Santa Cruz, CA 95060" /><p className="section-description">The address will be converted into a map location.</p></div>
          <p className="section-description">Times use your device’s time zone. Sales are shown until the end time.</p>
          <div className="sale-details-grid form-section"><div><label className="input-label" htmlFor="yard-sale-start">Start</label><input className="sale-input" id="yard-sale-start" name="startTime" type="datetime-local" value={form.startTime} onChange={updateField} /></div><div><label className="input-label" htmlFor="yard-sale-end">End</label><input className="sale-input" id="yard-sale-end" name="endTime" type="datetime-local" value={form.endTime} onChange={updateField} /></div></div>
          <div className="post-sale-actions"><button className="cancel-post-button" type="button" onClick={() => navigate("/")}>Cancel</button><button className="publish-sale-button" disabled={submitting}>{submitting ? "Posting..." : "Post Yard Sale"}</button></div>
          </fieldset>
        </form>
      </div>
    </main>
  );
}

export default PostYardSale;
