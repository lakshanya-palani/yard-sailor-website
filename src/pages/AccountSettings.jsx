import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./AccountPages.css";

function AccountSettings() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ""));
  }, []);

  async function updatePassword(event) {
    event.preventDefault();
    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      console.error("Unable to update password:", error);
      alert(error.message);
      return;
    }
    setPassword("");
    alert("Password updated successfully.");
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Unable to sign out:", error);
      alert(error.message);
      return;
    }
    navigate("/");
  }

  return (
    <main className="account-page">
      <div className="account-container">
        <div className="account-heading"><h1>Account Settings</h1><p>Manage account security and preferences.</p></div>
        <section className="account-form-card">
          <form className="account-form" onSubmit={updatePassword}>
            <label>Email address<input type="email" value={email} disabled /></label>
            <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter a new password" /></label>
            <button className="account-button" disabled={saving}>{saving ? "Updating..." : "Change Password"}</button>
          </form>
          <div className="settings-list">
            <div className="settings-option">Notification preferences — coming soon</div>
            <div className="settings-option">Privacy preferences — coming soon</div>
          </div>
          <button className="account-button-danger" type="button" onClick={signOut}>Sign Out</button>
        </section>
      </div>
    </main>
  );
}

export default AccountSettings;
