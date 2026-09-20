import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Navbar.css";
import { useCart } from "../context/CartContext";
import LanguageDropdown from "./LanguageDropdown";
import { useAuth } from "../context/useAuth";
import { returnPath } from "../lib/authFlow";
import SearchBar from "./SearchBar";

function Navbar() {
  const { count } = useCart();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [failedAvatar, setFailedAvatar] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let request = 0;
    async function loadProfile() {
      const version = ++request;
      if (!user) { setProfile(null); return; }
      const { data, error } = await supabase.from("profiles")
        .select("username, avatar_url").eq("id", user.id).maybeSingle();
      if (active && version === request) setProfile(error ? null : { ...data, id: user.id });
    }
    void loadProfile();
    window.addEventListener("yardSailorProfileUpdated", loadProfile);
    return () => {
      active = false;
      window.removeEventListener("yardSailorProfileUpdated", loadProfile);
    };
  }, [user]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape" && menuRef.current?.contains(document.activeElement)) {
        menuRef.current.querySelector("button")?.focus();
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    setProfileMenuOpen(false);
    setLoggingOut(true);
    let error;
    try { ({ error } = await supabase.auth.signOut()); }
    catch { error = true; }
    setLoggingOut(false);

    if (error) {
      console.error("Unable to log out:", error);
      alert("Unable to sign out. Please try again.");
      return;
    }

    setProfile(null);
    navigate("/");
  }

  const ownProfile = profile?.id === user?.id ? profile : null;
  const metadata = user?.user_metadata;
  const displayName = [ownProfile?.username, metadata?.full_name, metadata?.name]
    .find(value => typeof value === "string" && value.trim())?.trim() || "My Profile";
  const candidateAvatar = ownProfile?.avatar_url || metadata?.avatar_url || metadata?.picture;
  const avatar = typeof candidateAvatar === 'string' && /^https:\/\//.test(candidateAvatar) && candidateAvatar !== failedAvatar ? candidateAvatar : null;
  const fallbackLetter = displayName.charAt(0).toUpperCase();

  return (
    <>
      <div className="top-bar">
        <div className="top-bar-center">
          YARD SAILOR NOW LIVE
        </div>

        <div className="top-bar-right">
          <img src="/images/instagram.svg" alt="Instagram" />
          <img src="/images/facebook.svg" alt="Facebook" />

          <LanguageDropdown />
        </div>
      </div>

      <header className="navbar">
        <SearchBar />

        <nav className="navbar-center" aria-label="Main navigation">
          <Link to="/">Home</Link>

          <Link to="/shop">Shop</Link>

          <Link to="/find-yard-sale">Find a Yard Sale</Link>

          <Link to="/" className="navbar-logo">
            <img
              src="/images/logo_bubble_green.png"
              alt="Yard Sailor logo"
            />
          </Link>

          <Link to="/post-sale">
            Post a Sale
          </Link>

          <Link to="/about">About</Link>

          <Link to="/contact">
            Contact
          </Link>
        </nav>

        <div className="navbar-account">
          {authLoading ? <span role="status">Loading account…</span> : user ? (
            <div className="profile-menu-container" ref={menuRef}>
              <button
                type="button"
                className="profile-menu-trigger"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-expanded={profileMenuOpen}
                aria-controls="account-links"
              >
                <span className="navbar-avatar" aria-hidden="true">
                  {avatar ? (
                    <img
                      src={avatar} onError={() => setFailedAvatar(avatar)}
                      alt=""
                    />
                  ) : (
                    fallbackLetter
                  )}
                </span>
                <span>{displayName}</span>
                <span className="profile-menu-arrow" aria-hidden="true">
                  {profileMenuOpen ? "▲" : "▼"}
                </span>
              </button>

              {profileMenuOpen && (
                <div className="profile-dropdown" id="account-links">
                  <div className="profile-dropdown-header">
                    <span className="dropdown-avatar" aria-hidden="true">
                      {avatar ? (
                        <img src={avatar} onError={() => setFailedAvatar(avatar)} alt="" />
                      ) : (
                        fallbackLetter
                      )}
                    </span>
                    <div>
                      <strong>{displayName}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>

                  <div className="profile-dropdown-links">
                    <Link to="/profile" onClick={() => setProfileMenuOpen(false)}>
                      Edit Profile
                    </Link>
                    <Link to="/my-postings" onClick={() => setProfileMenuOpen(false)}>
                      My Postings
                    </Link>
                    <Link to="/my-yard-sales" onClick={() => setProfileMenuOpen(false)}>
                      My Yard Sale Listings
                    </Link>
                    <Link to="/orders" onClick={() => setProfileMenuOpen(false)}>Orders</Link>
                    <Link to="/messages" onClick={() => setProfileMenuOpen(false)}>Direct Messages</Link>
                    <Link to="/saved" onClick={() => setProfileMenuOpen(false)}>
                      Saved Items
                    </Link>
                    <Link to="/settings" onClick={() => setProfileMenuOpen(false)}>
                      Account Settings
                    </Link>
                    <Link to="/help" onClick={() => setProfileMenuOpen(false)}>
                      Help &amp; Support
                    </Link>
                  </div>

                  <div className="profile-dropdown-footer">
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                    >
                      {loggingOut ? "Logging Out..." : "Log Out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to={`/login?redirect=${encodeURIComponent(returnPath(`${location.pathname}${location.search}${location.hash}`))}`} className="login-link">
              <img
                src="/images/lock.png"
                alt=""
                className="lock-icon"
              />

              <span>Login/Sign Up</span>
            </Link>
          )}

          <button
            className="cart-button"
            type="button"
            aria-label={`Shopping cart${count ? `, ${count} items` : ""}`}
            onClick={() => navigate("/cart")}
          >
            <img
              src="/images/cart.png"
              alt=""
            />
            {count > 0 && <span className="cart-count">{count}</span>}
          </button>
        </div>
      </header>
    </>
  );
}

export default Navbar;
