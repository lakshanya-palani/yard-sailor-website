import SelectField from "../components/SelectField";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import { validateProduct, validImages, useUnsavedChanges } from "../lib/listingEditor";
import { uploadImage } from "../lib/uploads";
import "./AccountPages.css";

function EditProduct() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  if (loading) return <main className="account-page"><p role="status">Loading…</p></main>;
  if (!user) return <main className="account-page"><p role="status">Please log in to edit this listing.</p></main>;
  return <EditProductForm key={`${id}:${user.id}`} id={id} ownerId={user.id} />;
}

function EditProductForm({ id, ownerId }) {
  const navigate = useNavigate();
  const routeIdRef = useRef(id);
  useEffect(() => { routeIdRef.current = id; return () => { routeIdRef.current = null; }; }, [id]);
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [newImages, setNewImages] = useState([]);
  useUnsavedChanges(dirty);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function loadProduct() {
      const { data: authData } = await supabase.auth.getUser();
      if (!active) return;
      if (authData.user?.id !== ownerId) { setMessage("Please log in to edit this listing."); return; }
      setUserId(authData.user.id);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error("Unable to load product:", error);
        setMessage("Unable to load this listing. Please try again.");
      } else if (!data) {
        setMessage("Product not found or you do not have permission to edit it.");
      } else {
        setForm(data);
      }
    }
    loadProduct();
    return () => { active = false; };
  }, [id, ownerId]);

  function updateField(event) {
    setDirty(true);
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function selectImages(event) {
    const files = Array.from(event.target.files || []);
    if (!validImages(files)) { setMessage("Each image must be a JPEG, PNG, or WebP file no larger than 5 MB."); event.target.value = ""; return; }
    const remaining = 8 - (form.image_urls || []).length - newImages.length;
    setNewImages((current) => [...current, ...files.slice(0, Math.max(0, Math.min(remaining, 8 - (form.image_urls || []).length - current.length)))]);
    setDirty(true);
    event.target.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current || !form || String(form.id) !== String(id)) return;
    const validation = validateProduct(form);
    if (validation) { setMessage(validation); return; }
    setMessage("");
    savingRef.current = true;
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || authData.user?.id !== userId || String(routeIdRef.current) !== String(id)) throw new Error("Your session has changed. Please log in again.");
      const imageUrls = [...(form.image_urls || [])];
      for (const file of newImages) {
        const { data: uploadAuth, error: uploadAuthError } = await supabase.auth.getUser();
        if (uploadAuthError || uploadAuth.user?.id !== userId || String(routeIdRef.current) !== String(id)) throw new Error("Your session or listing has changed. Please reopen the editor.");
        imageUrls.push(await uploadImage(file, "products"));
      }
      const { data: currentAuth, error: currentAuthError } = await supabase.auth.getUser();
      if (currentAuthError || currentAuth.user?.id !== userId || String(routeIdRef.current) !== String(id)) throw new Error("Your session or listing has changed. Please reopen the editor.");
      const { data, error } = await supabase.from("products").update({
        title: form.title.trim(), price: Number(form.price), brand: form.brand?.trim() || null,
        category: form.category, condition: form.condition, description: form.description.trim(), pickup: form.pickup,
        shipping: form.shipping, image_urls: imageUrls,
      }).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
      if (error) throw error;
      if (String(routeIdRef.current) !== String(id)) return;
      if (!data) throw new Error("Product not found or you do not have permission to edit it.");
      setDirty(false);
      window.dispatchEvent(new Event("yardSailorProductsUpdated"));
      navigate("/my-postings");
    } catch (error) {
      console.error("Unable to update product:", error);
      setMessage(error.message || "Unable to update product. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!form || String(form.id) !== String(id)) return <main className="account-page"><p className="account-status" role="status">{message || "Loading product..."}</p></main>;

  return (
    <main className="account-page">
      <div className="account-container">
        <div className="account-heading"><h1>Edit Product</h1><p>Your existing product images will be preserved.</p></div>
        <section className="account-form-card">
          <form className="account-form" onSubmit={handleSubmit}>
            {message && <p role="alert" className="listing-message">{message}</p>}
            <fieldset><legend>Photos ({(form.image_urls || []).length + newImages.length}/8)</legend>
              {(form.image_urls || []).map((url, index) => <div key={`${url}-${index}`}><img src={url} alt={`Listing photo ${index + 1}`} width="100" /><button type="button" onClick={() => { setForm((current) => ({ ...current, image_urls: current.image_urls.filter((_, i) => i !== index) })); setDirty(true); }}>Remove photo</button></div>)}
              {newImages.map((file, index) => <div key={`${file.name}-${index}`}>{file.name} <button type="button" onClick={() => { setNewImages((current) => current.filter((_, i) => i !== index)); setDirty(true); }}>Remove photo</button></div>)}
              {(form.image_urls || []).length + newImages.length < 8 && <label>Add photos<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={selectImages} /></label>}
            </fieldset>
            <label>Title<input name="title" maxLength={70} value={form.title || ""} onChange={updateField} /></label>
            <label>Price<input name="price" type="number" min="0" step="0.01" value={form.price ?? ""} onChange={updateField} /></label>
            <label>Brand<input name="brand" maxLength={100} value={form.brand || ""} onChange={updateField} /></label>
            <label htmlFor="edit-condition">Condition</label><SelectField id="edit-condition" name="condition" value={form.condition || ""} onChange={updateField}><option value="">Select condition</option><option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></SelectField>
            <label htmlFor="edit-category">Category</label><SelectField id="edit-category" name="category" value={form.category || ""} onChange={updateField} required><option value="">Select category</option><option value="furniture">Furniture</option><option value="clothing">Clothing & Accessories</option><option value="electronics">Electronics</option><option value="collectibles">Collectibles</option><option value="home & kitchen">Home & Kitchen</option><option value="sports & outdoors">Sports & Outdoors</option><option value="books & media">Books & Media</option><option value="other">Other</option></SelectField>
            <label>Description<textarea name="description" maxLength={500} value={form.description || ""} onChange={updateField} /></label>
            <label><span><input name="pickup" type="checkbox" checked={Boolean(form.pickup)} onChange={updateField} /> Pickup</span></label>
            <label><span><input name="shipping" type="checkbox" checked={Boolean(form.shipping)} onChange={updateField} /> Shipping</span></label>
            <div className="account-actions"><button className="account-button" disabled={saving}>{saving ? "Saving..." : "Save Product"}</button><button className="account-button-secondary" type="button" onClick={() => navigate("/my-postings")}>Cancel</button></div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default EditProduct;
