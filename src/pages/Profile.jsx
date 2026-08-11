import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "./Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(userError);
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    setUser(user);

    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
    }

    if (data) {
      setUsername(data.username || "");
      setAvatarUrl(data.avatar_url || "");
    }

    setLoading(false);
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];

    if (!file || !user) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }

    setUploading(true);

    const fileExtension =
      file.name.split(".").pop() || "jpg";

    const filePath =
      `${user.id}/avatar-${Date.now()}.${fileExtension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("avatars")
        .upload(filePath, file);

    if (uploadError) {
      setUploading(false);
      alert(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    setAvatarUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (!user) {
      return;
    }

    if (!username.trim()) {
      alert("Please enter a username.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        username: username.trim(),
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.dispatchEvent(
      new Event("yardSailorProfileUpdated")
    );

    alert("Profile saved!");
  }

  if (loading) {
    return (
      <main className="profile-page">
        <p className="profile-loading">
          Loading profile...
        </p>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <section className="profile-card">
        <div className="profile-heading">
          <h1>Your Profile</h1>

          <p>
            Add a profile picture and choose the username
            other sailors will see.
          </p>
        </div>

        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
              />
            ) : (
              <span>
                {username
                  ? username.charAt(0).toUpperCase()
                  : "Y"}
              </span>
            )}
          </div>

          <label className="profile-upload-button">
            {uploading
              ? "Uploading..."
              : "Upload Photo"}

            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <form
          className="profile-form"
          onSubmit={handleSaveProfile}
        >
          <label htmlFor="profile-username">
            Username
          </label>

          <input
            id="profile-username"
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            maxLength={30}
          />

          <label htmlFor="profile-email">
            Email
          </label>

          <input
            id="profile-email"
            type="email"
            value={user?.email || ""}
            disabled
          />

          <button
            type="submit"
            className="profile-save-button"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Save Profile"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Profile;