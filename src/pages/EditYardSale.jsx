import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import { geocodeAddress } from "../utils/location";
import { validateSale, validImages, useUnsavedChanges } from "../lib/listingEditor";
import { uploadImage } from "../lib/uploads";
import "./AccountPages.css";

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function EditYardSale() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  if (loading) return <main className="account-page"><p role="status">Loading…</p></main>;
  if (!user) return <main className="account-page"><p role="status">Please log in to edit this listing.</p></main>;
  return <EditYardSaleForm key={`${id}:${user.id}`} id={id} ownerId={user.id} />;
}

function EditYardSaleForm({ id, ownerId }) {
  const navigate = useNavigate();
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

  function updateField(event) {
    setDirty(true);
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function selectImages(event) {
    const files = Array.from(event.target.files || []);
    if (!validImages(files)) { setMessage("Each image must be a JPEG, PNG, or WebP file no larger than 5 MB."); event.target.value = ""; return; }
    const remaining = 8 - (form.images || []).length - newImages.length;
    setNewImages((current) => [...current, ...files.slice(0, Math.max(0, Math.min(remaining, 8 - (form.images || []).length - current.length)))]);
    setDirty(true);
    event.target.value = "";
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
      for (const file of newImages) {
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

  if (!form || String(form.id) !== String(id)) return <main className="account-page"><p className="account-status" role="status">{message || "Loading yard sale..."}</p></main>;

  return (
    <main className="account-page">
      <div className="account-container">
        <div className="account-heading"><h1>Edit Yard Sale</h1><p>Update your hosted event details.</p></div>
        <section className="account-form-card">
          <form className="account-form" onSubmit={handleSubmit}>
            {message && <p role="alert" className="listing-message">{message}</p>}
            <fieldset><legend>Photos ({(form.images || []).length + newImages.length}/8)</legend>
              {(form.images || []).map((url, index) => <div key={`${url}-${index}`}><img src={url} alt={`Listing photo ${index + 1}`} width="100" /><button type="button" onClick={() => { setForm((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) })); setDirty(true); }}>Remove photo</button></div>)}
              {newImages.map((file, index) => <div key={`${file.name}-${index}`}>{file.name} <button type="button" onClick={() => { setNewImages((current) => current.filter((_, i) => i !== index)); setDirty(true); }}>Remove photo</button></div>)}
              {(form.images || []).length + newImages.length < 8 && <label>Add photos<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={selectImages} /></label>}
            </fieldset>
            <label>Title<input name="title" maxLength={80} value={form.title || ""} onChange={updateField} /></label>
            <label>Description<textarea name="description" maxLength={1000} value={form.description || ""} onChange={updateField} /></label>
            <label>Address<input name="address" maxLength={500} value={form.address || ""} onChange={updateField} /></label>
            <label>Start time<input name="start_time" type="datetime-local" value={form.start_time} onChange={updateField} /></label>
            <label>End time<input name="end_time" type="datetime-local" value={form.end_time} onChange={updateField} /></label>
            <p>Times use your device’s time zone. The sale status updates automatically from these dates.</p>
            <div className="account-actions"><button className="account-button" disabled={saving}>{saving ? "Saving..." : "Save Yard Sale"}</button><button className="account-button-secondary" type="button" onClick={() => navigate("/my-yard-sales")}>Cancel</button></div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default EditYardSale;
