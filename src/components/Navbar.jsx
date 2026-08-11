import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Navbar.css";
import LanguageDropdown from "./LanguageDropdown";
import SearchBar from "./SearchBar";

function Navbar() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const loadProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Unable to load navbar profile:", error);
      setProfile(null);
      return;
    }

    setProfile(data);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Unable to read auth session:", error);
      }

      if (active) {
        const currentUser = data?.session?.user ?? null;
        setUser(currentUser);
        loadProfile(currentUser);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // Let Supabase finish committing the new session before querying tables.
      setTimeout(() => {
        if (active) {
          loadProfile(currentUser);
        }
      }, 0);
    });

    const handleProfileUpdated = async () => {
      const { data } = await supabase.auth.getSession();
      loadProfile(data?.session?.user ?? null);
    };
    window.addEventListener(
      "yardSailorProfileUpdated",
      handleProfileUpdated
    );

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener(
        "yardSailorProfileUpdated",
        handleProfileUpdated
      );
    };
  }, [loadProfile]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
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
    const { error } = await supabase.auth.signOut();
    setLoggingOut(false);

    if (error) {
      console.error("Unable to log out:", error);
      alert(error.message);
      return;
    }

    setUser(null);
    setProfile(null);
    navigate("/");
  }

  const displayName = profile?.username?.trim() || "My Profile";
  const fallbackLetter = profile?.username?.trim()
    ? profile.username.trim().charAt(0).toUpperCase()
    : "Y";

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

        <div className="navbar-center">
          <Link to="/">Home</Link>

          <Link to="/shop">Shop</Link>

          <Link to="/" className="navbar-logo">
            <img
              src="/images/logo_bubble_green.png"
              alt="Yard Sailor logo"
            />
          </Link>

          <Link to="/post-sale">
            Post Yard Sale
          </Link>

          <Link to="/contact">
            Contact
          </Link>
        </div>

        <div className="navbar-account">
          {user ? (
            <div className="profile-menu-container" ref={menuRef}>
              <button
                type="button"
                className="profile-menu-trigger"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <span className="navbar-avatar" aria-hidden="true">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username || "Profile"}
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
                <div className="profile-dropdown" role="menu">
                  <div className="profile-dropdown-header">
                    <span className="dropdown-avatar" aria-hidden="true">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" />
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
            <Link to="/login" className="login-link">
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
            aria-label="Shopping cart"
          >
            <img
              src="/images/cart.png"
              alt=""
            />
          </button>
        </div>
      </header>
    </>
  );
}

export default Navbar;
