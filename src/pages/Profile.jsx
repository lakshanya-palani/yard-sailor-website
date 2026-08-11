import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Profile.css";

function Profile({ setup = false }) {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUploadFailed, setAvatarUploadFailed] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Unable to load authenticated user:", userError);
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
      console.error("Unable to load profile:", error);
      alert("Your profile could not be loaded. Please try again.");
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

    console.log("Selected avatar file:", file);

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Profile pictures must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setAvatarUploadFailed(false);

    const fileExtension = (file.name.split(".").pop() || "jpg")
      .toLowerCase();

    const filePath =
      `${user.id}/${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

    if (uploadError) {
      setUploading(false);
      setAvatarUploadFailed(true);
      console.error("Avatar upload failed:", uploadError);
      alert(uploadError.message);
      event.target.value = "";
      return;
    }

    console.log("Uploaded avatar path:", filePath);

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      setUploading(false);
      setAvatarUploadFailed(true);
      console.error("Supabase did not return a public URL for:", filePath);
      alert("The picture uploaded, but its public URL could not be created.");
      event.target.value = "";
      return;
    }

    console.log("Supabase public avatar URL:", publicUrl);
    setAvatarUrl(publicUrl);
    setUploading(false);
    event.target.value = "";
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    const cleanUsername = username.trim();

    if (!user) {
      alert("Your session has expired. Please log in again.");
      return;
    }

    if (!cleanUsername) {
      alert("Please enter a username.");
      return;
    }

    const usernameRegex = /^[A-Za-z0-9_]{3,20}$/;

    if (!usernameRegex.test(cleanUsername)) {
      alert(
        "Username must be 3–20 characters and contain only letters, numbers, and underscores."
      );
      return;
    }

    if (uploading) {
      alert("Please wait for your profile picture to finish uploading.");
      return;
    }

    if (avatarUploadFailed) {
      alert("Your profile picture did not upload. Please select it again before saving.");
      return;
    }

    setSaving(true);

    // Escape LIKE wildcards so underscores are checked as literal characters.
    const usernamePattern = cleanUsername.replace(
      /[\\%_]/g,
      "\\$&"
    );

    const { data: existingUser, error: usernameCheckError } =
      await supabase
        .from("profiles")
        .select("id")
        .ilike("username", usernamePattern)
        .neq("id", user.id)
        .limit(1)
        .maybeSingle();

    if (usernameCheckError) {
      setSaving(false);
      console.error("Username check failed:", usernameCheckError);
      alert("Unable to check username availability. Please try again.");
      return;
    }

    if (existingUser) {
      setSaving(false);
      alert("This username is already taken. Please choose another.");
      return;
    }

    const finalAvatarUrl = avatarUrl;
    console.log("Saving avatar_url:", finalAvatarUrl);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        username: cleanUsername,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      });

    setSaving(false);

    if (error) {
      console.error("Profile save failed:", error);
      if (error.code === "23505") {
        alert("This username is already taken. Please choose another.");
      } else {
        alert(error.message);
      }
      return;
    }

    window.dispatchEvent(
      new Event("yardSailorProfileUpdated")
    );

    if (setup) {
      const requestedRedirect = searchParams.get("redirect");
      const redirect = requestedRedirect?.startsWith("/")
        ? requestedRedirect
        : "/";
      navigate(redirect, { replace: true });
    } else {
      navigate("/");
    }
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
          <h1>{setup ? "Set Up Your Profile" : "Your Profile"}</h1>

          <p>
            {setup
              ? "Choose the username other sailors will see. You can add a profile picture now or later."
              : "Add a profile picture and choose the username other sailors will see."}
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
            disabled={saving || uploading}
          >
            {saving
              ? "Saving..."
              : setup
                ? "Complete Profile"
                : "Save Profile"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Profile;
