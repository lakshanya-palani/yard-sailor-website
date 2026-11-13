import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import { validateProduct, validImages, useUnsavedChanges } from "../lib/listingEditor";
import { uploadImage } from "../lib/uploads";
import { ListingFormPage, ListingFormStatus } from "../components/listing/ListingFormPage";
import { ProductFormFields } from "../components/listing/ProductFormFields";

function EditProduct() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  if (loading) return <ListingFormStatus kind="loading">Loading…</ListingFormStatus>;
  if (!user) return <ListingFormStatus>Please log in to edit this listing.</ListingFormStatus>;
  return <EditProductForm key={`${id}:${user.id}`} id={id} ownerId={user.id} />;
}

function EditProductForm({ id, ownerId }) {
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

  function updateValue(name, value) {
    setDirty(true);
    setForm((current) => ({ ...current, [name]: value }));
  }

  function selectImages(event) {
    const files = Array.from(event.target.files || []);
    if (!validImages(files)) { setMessage("Each image must be a JPEG, PNG, or WebP file no larger than 5 MB."); event.target.value = ""; return; }
    const remaining = 8 - (form.image_urls || []).length - newImages.length;
    const additions = files.map((file) => ({ id: crypto.randomUUID(), file, preview: createPreview(file) }));
    setNewImages((current) => {
      const accepted = additions.slice(0, Math.max(0, Math.min(remaining, 8 - (form.image_urls || []).length - current.length)));
      additions.slice(accepted.length).forEach((image) => URL.revokeObjectURL(image.preview));
      return [...current, ...accepted];
    });
    setDirty(true);
    event.target.value = "";
  }

  function removeImage(index) {
    const existingCount = (form.image_urls || []).length;
    if (index < existingCount) {
      setForm((current) => ({ ...current, image_urls: current.image_urls.filter((_, i) => i !== index) }));
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
    const validation = validateProduct(form);
    if (validation) { setMessage(validation); return; }
    setMessage("");
    savingRef.current = true;
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || authData.user?.id !== userId || String(routeIdRef.current) !== String(id)) throw new Error("Your session has changed. Please log in again.");
      const imageUrls = [...(form.image_urls || [])];
      for (const { file } of newImages) {
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

  if (!form || String(form.id) !== String(id)) return <ListingFormStatus kind={message ? "error" : "loading"}>{message || "Loading product..."}</ListingFormStatus>;

  const imageItems = [
    ...(form.image_urls || []).map((url, index) => ({ key: `${url}-${index}`, src: url })),
    ...newImages.map((image) => ({ key: image.id, src: image.preview })),
  ];

  return (
    <ListingFormPage
      title="Edit Product"
      subtitle="Your existing product images will be preserved."
      backTo="/my-postings"
      backLabel="My postings"
      onSubmit={handleSubmit}
      message={message}
      submitting={saving}
      submitLabel="Save Product"
      submittingLabel="Saving..."
      onCancel={() => navigate("/my-postings")}
    >
      <ProductFormFields
        values={form}
        onChange={updateValue}
        images={imageItems}
        maxImages={8}
        onSelectImages={selectImages}
        onRemoveImage={removeImage}
      />
    </ListingFormPage>
  );
}

export default EditProduct;
