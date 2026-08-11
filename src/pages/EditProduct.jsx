import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./AccountPages.css";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      setUserId(authData.user.id);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (error) {
        console.error("Unable to load product:", error);
        alert(error.message);
      } else if (!data) {
        alert("Product not found or you do not have permission to edit it.");
        navigate("/my-postings", { replace: true });
      } else {
        setForm(data);
      }
    }
    loadProduct();
  }, [id, navigate]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const price = Number(form.price);
    if (!form.title.trim() || !form.description.trim() || !form.condition || !Number.isFinite(price) || price < 0) {
      alert("Please complete the title, valid price, condition, and description.");
      return;
    }
    if (!form.pickup && !form.shipping) {
      alert("Please choose pickup, shipping, or both.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        title: form.title.trim(),
        price,
        brand: form.brand?.trim() || null,
        condition: form.condition,
        description: form.description.trim(),
        pickup: form.pickup,
        shipping: form.shipping,
      })
      .eq("id", id)
      .eq("user_id", userId);
    setSaving(false);

    if (error) {
      console.error("Unable to update product:", error);
      alert(error.message);
      return;
    }
    window.dispatchEvent(new Event("yardSailorProductsUpdated"));
    navigate("/my-postings");
  }

  if (!form) return <main className="account-page"><p className="account-status">Loading product...</p></main>;

  return (
    <main className="account-page">
      <div className="account-container">
        <div className="account-heading"><h1>Edit Product</h1><p>Your existing product images will be preserved.</p></div>
        <section className="account-form-card">
          <form className="account-form" onSubmit={handleSubmit}>
            <label>Title<input name="title" value={form.title || ""} onChange={updateField} /></label>
            <label>Price<input name="price" type="number" min="0" step="0.01" value={form.price ?? ""} onChange={updateField} /></label>
            <label>Brand<input name="brand" value={form.brand || ""} onChange={updateField} /></label>
            <label>Condition<select name="condition" value={form.condition || ""} onChange={updateField}><option value="">Select condition</option><option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></select></label>
            <label>Description<textarea name="description" value={form.description || ""} onChange={updateField} /></label>
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
