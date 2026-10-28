import { useEffect, useRef, useState } from "react";
import { ChevronDown, UserRound, Menu, ShoppingCart, X } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
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
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef(null);
  const [desktopMenu, setDesktopMenu] = useState(null);
  const desktopMenuRef = useRef(null);
  const navButtonRef = useRef(null);
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

  useEffect(() => {
    function closeOnOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target) && !event.target.closest(".ui-select-menu")) setNavOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape" && navOpen) { setNavOpen(false); navButtonRef.current?.focus(); }
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [navOpen]);

  useEffect(() => {
    function outside(event) {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target) && !event.target.closest(".ui-select-menu")) setDesktopMenu(null);
    }
    function escape(event) {
      if (event.key === "Escape" && desktopMenu && !event.target.closest(".ui-select-menu")) {
        document.getElementById(`nav-${desktopMenu}-button`)?.focus();
        setDesktopMenu(null);
      }
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, [desktopMenu]);

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
      <header className="navbar" ref={navRef}>
        <Link to="/" className="navbar-logo" aria-label="Yard Sailor home" onClick={() => setNavOpen(false)}>
          <img src="/images/logo_bubble_green.png" alt="" />
        </Link>

        <SearchBar onFocus={() => setNavOpen(false)} />

        <nav id="main-navigation" className={`navbar-center${navOpen ? " is-open" : ""}`} aria-label="Main navigation">
          <NavLink to="/shop" onClick={() => setNavOpen(false)}>Shop</NavLink>
          <NavLink to="/find-yard-sale" onClick={() => setNavOpen(false)}>Find a Yard Sale</NavLink>
          <div className="desktop-nav-menus" ref={desktopMenuRef}>
            <div className="nav-menu-group">
              <button id="nav-post-button" className={`nav-menu-trigger${["/post-sale", "/post-yard-sale"].includes(location.pathname) ? " is-current" : ""}`} type="button" aria-expanded={desktopMenu === "post"} aria-controls="nav-post-menu" onClick={() => setDesktopMenu(current => current === "post" ? null : "post")}>Post <ChevronDown size={16} aria-hidden="true" /></button>
              {desktopMenu === "post" && <div id="nav-post-menu" className="nav-menu-panel"><NavLink to="/post-sale" onClick={() => setDesktopMenu(null)}>Post an item</NavLink><NavLink to="/post-yard-sale" onClick={() => setDesktopMenu(null)}>Post a yard sale</NavLink></div>}
            </div>
            <div className="nav-menu-group">
              <button id="nav-more-button" className={`nav-menu-trigger${["/about", "/contact"].includes(location.pathname) ? " is-current" : ""}`} type="button" aria-expanded={desktopMenu === "more"} aria-controls="nav-more-menu" onClick={() => setDesktopMenu(current => current === "more" ? null : "more")}>More <ChevronDown size={16} aria-hidden="true" /></button>
              {desktopMenu === "more" && <div id="nav-more-menu" className="nav-menu-panel"><NavLink to="/about" onClick={() => setDesktopMenu(null)}>About</NavLink><NavLink to="/contact" onClick={() => setDesktopMenu(null)}>Contact</NavLink><div className="nav-menu-language"><LanguageDropdown /></div></div>}
            </div>
          </div>
          <div className="mobile-nav-links">
            <NavLink to="/post-sale" onClick={() => setNavOpen(false)}>Post an item</NavLink>
            <NavLink to="/post-yard-sale" onClick={() => setNavOpen(false)}>Post a yard sale</NavLink>
            <NavLink to="/about" onClick={() => setNavOpen(false)}>About</NavLink>
            <NavLink to="/contact" onClick={() => setNavOpen(false)}>Contact</NavLink>
          </div>
          <div className="mobile-language"><LanguageDropdown /></div>
        </nav>

        <div className="navbar-account">
          {authLoading ? <span role="status">Loading account…</span> : user ? (
            <div className="profile-menu-container" ref={menuRef}>
              <button
                type="button"
                className="profile-menu-trigger"
                aria-label={`Account menu for ${displayName}`}
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
                  <ChevronDown size={16} strokeWidth={2} className={profileMenuOpen ? "icon-rotated" : ""} />
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
            <Link to={`/login?redirect=${encodeURIComponent(returnPath(`${location.pathname}${location.search}${location.hash}`))}`} className="login-link" aria-label="Sign in or sign up" onClick={() => setNavOpen(false)}>
              <UserRound size={22} strokeWidth={2} aria-hidden="true" />

              <span>Sign in</span>
            </Link>
          )}

          <button
            className="cart-button"
            type="button"
            aria-label={`Shopping cart${count ? `, ${count} items` : ""}`}
            onClick={() => { setNavOpen(false); navigate("/cart"); }}
          >
            <ShoppingCart size={22} strokeWidth={2} aria-hidden="true" />
            {count > 0 && <span className="cart-count">{count}</span>}
          </button>
        </div>
        <button ref={navButtonRef} className="navbar-menu-button" type="button" aria-label={navOpen ? "Close menu" : "Open menu"} aria-expanded={navOpen} aria-controls="main-navigation" onClick={() => setNavOpen(open => !open)}>
          {navOpen ? <X size={22} strokeWidth={2} aria-hidden="true" /> : <Menu size={22} strokeWidth={2} aria-hidden="true" />}
        </button>
      </header>
    </>
  );
}

export default Navbar;
