import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import { geocodeAddress } from "../utils/location";
import { validateSale, validImages, useUnsavedChanges } from "../lib/listingEditor";
import { uploadImage } from "../lib/uploads";
import { ListingFormPage, ListingFormStatus } from "../components/listing/ListingFormPage";
import { YardSaleFormFields } from "../components/listing/YardSaleFormFields";

// YardSaleFormFields uses the create form's keys; this page stores the database columns.
const FIELD_COLUMNS = { startTime: "start_time", endTime: "end_time" };

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function EditYardSale() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  if (loading) return <ListingFormStatus kind="loading">Loading…</ListingFormStatus>;
  if (!user) return <ListingFormStatus>Please log in to edit this listing.</ListingFormStatus>;
  return <EditYardSaleForm key={`${id}:${user.id}`} id={id} ownerId={user.id} />;
}

function EditYardSaleForm({ id, ownerId }) {
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

  const routeIdRef = useRef(id);
  useEffect(() => { routeIdRef.current = id; return () => { routeIdRef.current = null; }; }, [id]);
  const [hostId, setHostId] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [newImages, setNewImages] = useState([]);
  useUnsavedChanges(dirty);
  const savingRef = useRef(false);
  const [originalAddress, setOriginalAddress] = useState("");

  useEffect(() => {
    let active = true;
    async function loadSale() {
      const { data: authData } = await supabase.auth.getUser();
      if (!active) return;
      if (authData.user?.id !== ownerId) { setMessage("Please log in to edit this listing."); return; }
      setHostId(authData.user.id);

      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("id", id)
        .eq("host_id", authData.user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error("Unable to load yard sale:", error);
        setMessage("Unable to load this listing. Please try again.");
      } else if (!data) {
        setMessage("Yard sale not found or you do not have permission to edit it.");
      } else {
        setOriginalAddress(data.address || "");
        setForm({ ...data, start_time: toLocalInput(data.start_time), end_time: toLocalInput(data.end_time) });
      }
    }
    loadSale();
    return () => { active = false; };
  }, [id, ownerId]);

  function updateValue(name, value) {
    setDirty(true);
    setForm((current) => ({ ...current, [FIELD_COLUMNS[name] || name]: value }));
  }

  function selectImages(event) {
    const files = Array.from(event.target.files || []);
    if (!validImages(files)) { setMessage("Each image must be a JPEG, PNG, or WebP file no larger than 5 MB."); event.target.value = ""; return; }
    const remaining = 8 - (form.images || []).length - newImages.length;
    const additions = files.map((file) => ({ id: crypto.randomUUID(), file, preview: createPreview(file) }));
    setNewImages((current) => {
      const accepted = additions.slice(0, Math.max(0, Math.min(remaining, 8 - (form.images || []).length - current.length)));
      additions.slice(accepted.length).forEach((image) => URL.revokeObjectURL(image.preview));
      return [...current, ...accepted];
    });
    setDirty(true);
    event.target.value = "";
  }

  function removeImage(index) {
    const existingCount = (form.images || []).length;
    if (index < existingCount) {
      setForm((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }));
    } else {
      const image = newImages[index - existingCount];
      URL.revokeObjectURL(image.preview);
      setNewImages((current) => current.filter((item) => item.id !== image.id));
    }
    setDirty(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current || !form || String(form.id) !== String(id)) return;
    const validation = validateSale(form);
    if (validation) { setMessage(validation); return; }
    setMessage("");
    savingRef.current = true;
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || authData.user?.id !== hostId || String(routeIdRef.current) !== String(id)) throw new Error("Your session has changed. Please log in again.");
      const imageUrls = [...(form.images || [])];
      for (const { file } of newImages) {
        const { data: uploadAuth, error: uploadAuthError } = await supabase.auth.getUser();
        if (uploadAuthError || uploadAuth.user?.id !== hostId || String(routeIdRef.current) !== String(id)) throw new Error("Your session or listing has changed. Please reopen the editor.");
        imageUrls.push(await uploadImage(file, "yard-sales"));
      }
      const address = form.address.trim();
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        address,
        images: imageUrls,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      };
      if (address !== originalAddress.trim()) {
        const { latitude, longitude } = await geocodeAddress(address);
        Object.assign(payload, { lat: latitude, lng: longitude, location: `POINT(${longitude} ${latitude})` });
      }
      const { data: currentAuth, error: currentAuthError } = await supabase.auth.getUser();
      if (currentAuthError || currentAuth.user?.id !== hostId || String(routeIdRef.current) !== String(id)) throw new Error("Your session or listing has changed. Please reopen the editor.");
      const { data, error } = await supabase
        .from("sales")
        .update(payload)
        .eq("id", id)
        .eq("host_id", hostId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (String(routeIdRef.current) !== String(id)) return;
      if (!data) throw new Error("Yard sale not found or you do not have permission to edit it.");
      setDirty(false);
      navigate("/my-yard-sales");
    } catch (error) {
      console.error("Unable to update yard sale:", error);
      setMessage(error.message || "Unable to update yard sale. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!form || String(form.id) !== String(id)) return <ListingFormStatus kind={message ? "error" : "loading"}>{message || "Loading yard sale..."}</ListingFormStatus>;

  const imageItems = [
    ...(form.images || []).map((url, index) => ({ key: `${url}-${index}`, src: url })),
    ...newImages.map((image) => ({ key: image.id, src: image.preview })),
  ];

  return (
    <ListingFormPage
      title="Edit Yard Sale"
      subtitle="Update your hosted event details."
      backTo="/my-yard-sales"
      backLabel="My yard sales"
      onSubmit={handleSubmit}
      message={message}
      submitting={saving}
      submitLabel="Save Yard Sale"
      submittingLabel="Saving..."
      onCancel={() => navigate("/my-yard-sales")}
    >
      <YardSaleFormFields
        values={{ title: form.title, description: form.description, address: form.address, startTime: form.start_time, endTime: form.end_time }}
        onChange={updateValue}
        images={imageItems}
        maxImages={8}
        onSelectImages={selectImages}
        onRemoveImage={removeImage}
      />
    </ListingFormPage>
  );
}

export default EditYardSale;
