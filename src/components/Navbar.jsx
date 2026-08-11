import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Navbar.css";
import LanguageDropdown from "./LanguageDropdown";
import SearchBar from "./SearchBar";

function Navbar() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
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

  async function handleLogout() {
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
            <div className="authenticated-account">
              <Link to="/profile" className="profile-link">
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
              </Link>

              <button
                type="button"
                className="logout-button"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging Out..." : "Log Out"}
              </button>
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
