import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import { geocodeAddress, hasValidCoordinates } from "../utils/location";
import { ListingFormPage, ListingFormStatus } from "../components/listing/ListingFormPage";
import { YardSaleFormFields } from "../components/listing/YardSaleFormFields";
import { validateSale, validImages, useListingDraft, useUnsavedChanges } from "../lib/listingEditor";
import { uploadImage } from "../lib/uploads";


function PostYardSale() {
  const { user, loading } = useAuth();
  if (loading) return <ListingFormStatus kind="loading">Loading…</ListingFormStatus>;
  if (!user) return <ListingFormStatus>Please log in to post a listing.</ListingFormStatus>;
  return <PostYardSaleForm key={user.id} ownerId={user.id} />;
}

function PostYardSaleForm({ ownerId }) {
  const navigate = useNavigate();
  const previewUrls = useRef(new Set());
  useEffect(() => {
    const urls = previewUrls.current;
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);
  function createPreview(file) {
    const url = URL.createObjectURL(file);
    previewUrls.current.add(url);
    return url;
  }

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

  function updateValue(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function selectImages(event) {
    const files = Array.from(event.target.files || []).slice(0, 8 - images.length);
    if (!validImages(files)) {
      setMessage("Each image must be a JPEG, PNG, or WebP file no larger than 5 MB.");
      event.target.value = "";
      return;
    }
    const additions = files.map((file) => ({ id: crypto.randomUUID(), file, preview: createPreview(file) }));
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

  const imageItems = images.map((image) => ({ key: image.id, src: image.preview }));

  return (
    <ListingFormPage
      title="Post a Yard Sale"
      subtitle="Share your event so nearby sailors can discover it on the map."
      onSubmit={handleSubmit}
      locked={!draftReady}
      message={message}
      submitting={submitting}
      submitLabel="Post Yard Sale"
      submittingLabel="Posting..."
      onCancel={() => navigate("/")}
    >
      <YardSaleFormFields
        values={form}
        onChange={updateValue}
        images={imageItems}
        maxImages={8}
        onSelectImages={selectImages}
        onRemoveImage={(index) => removeImage(images[index])}
      />
    </ListingFormPage>
  );
}

export default PostYardSale;
