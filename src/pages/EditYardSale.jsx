import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./AccountPages.css";

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function EditYardSale() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hostId, setHostId] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSale() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      setHostId(authData.user.id);

      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("id", id)
        .eq("host_id", authData.user.id)
        .maybeSingle();

      if (error) {
        console.error("Unable to load yard sale:", error);
        alert(error.message);
      } else if (!data) {
        alert("Yard sale not found or you do not have permission to edit it.");
        navigate("/my-yard-sales", { replace: true });
      } else {
        setForm({ ...data, start_time: toLocalInput(data.start_time), end_time: toLocalInput(data.end_time) });
      }
    }
    loadSale();
  }, [id, navigate]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.address.trim() || !form.start_time || !form.end_time) {
      alert("Please complete the title, address, start time, and end time.");
      return;
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      alert("The end time must be after the start time.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("sales")
      .update({
        title: form.title.trim(),
        description: form.description?.trim() || null,
        address: form.address.trim(),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        status: form.status,
      })
      .eq("id", id)
      .eq("host_id", hostId);
    setSaving(false);

    if (error) {
      console.error("Unable to update yard sale:", error);
      alert(error.message);
      return;
    }
    navigate("/my-yard-sales");
  }

  if (!form) return <main className="account-page"><p className="account-status">Loading yard sale...</p></main>;

  return (
    <main className="account-page">
      <div className="account-container">
        <div className="account-heading"><h1>Edit Yard Sale</h1><p>Update your hosted event details.</p></div>
        <section className="account-form-card">
          <form className="account-form" onSubmit={handleSubmit}>
            <label>Title<input name="title" value={form.title || ""} onChange={updateField} /></label>
            <label>Description<textarea name="description" value={form.description || ""} onChange={updateField} /></label>
            <label>Address<input name="address" value={form.address || ""} onChange={updateField} /></label>
            <label>Start time<input name="start_time" type="datetime-local" value={form.start_time} onChange={updateField} /></label>
            <label>End time<input name="end_time" type="datetime-local" value={form.end_time} onChange={updateField} /></label>
            <label>Status<select name="status" value={form.status || "active"} onChange={updateField}><option value="active">Active</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></select></label>
            <div className="account-actions"><button className="account-button" disabled={saving}>{saving ? "Saving..." : "Save Yard Sale"}</button><button className="account-button-secondary" type="button" onClick={() => navigate("/my-yard-sales")}>Cancel</button></div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default EditYardSale;
