import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, ShoppingCart, UserRound, X } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Navbar.css";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/useAuth";
import { returnPath } from "../lib/authFlow";
import { visibleAccountLinks } from "../lib/accountLinks";
import { useDismissable } from "../hooks/useDismissable";
import { useToast } from "../hooks/useToast";
import { Avatar } from "./ui/Avatar";
import { DropdownMenu } from "./ui/DropdownMenu";
import SearchBar from "./SearchBar";

const SELL_ITEMS = [
  { label: "Post an item", to: "/post-sale" },
  { label: "Post a yard sale", to: "/post-yard-sale" },
];
const MORE_ITEMS = [
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];
const DESKTOP_QUERY = "(min-width: 1024px)";

function Navbar() {
  const { count } = useCart();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  // The drawer is open only for the location it was opened on, so any route
  // change (including re-clicking the current page) closes it.
  const [navOpenKey, setNavOpenKey] = useState(null);
  const navOpen = navOpenKey !== null && navOpenKey === location.key;
  const navRef = useRef(null);
  const navButtonRef = useRef(null);

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

  const closeNav = () => setNavOpenKey(null);

  useDismissable(navRef, navOpen, (reason) => {
    closeNav();
    if (reason === "escape") navButtonRef.current?.focus();
  }, { ignoreRefs: [navButtonRef] });

  // The backdrop makes this a modal drawer: keep keyboard and assistive
  // technology focus on its links and close button until it is dismissed.
  useEffect(() => {
    if (!navOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const background = Array.from(document.querySelectorAll("main, footer, .navbar-logo, .navbar-search, .navbar-account"));
    const inertBefore = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    const controls = () => [
      ...Array.from(navRef.current?.querySelectorAll("a[href], button:not(:disabled)") || [])
        .filter(element => element.getClientRects().length > 0),
      navButtonRef.current,
    ].filter(Boolean);
    controls()[0]?.focus();
    const keepFocus = event => {
      if (!navRef.current?.contains(event.target) && event.target !== navButtonRef.current) controls()[0]?.focus();
    };
    const handleTab = event => {
      if (event.key !== "Tab") return;
      const items = controls();
      const index = items.indexOf(document.activeElement);
      if (index < 0 || (event.shiftKey && index === 0) || (!event.shiftKey && index === items.length - 1)) {
        event.preventDefault();
        (event.shiftKey ? items.at(-1) : items[0])?.focus();
      }
    };
    document.addEventListener("focusin", keepFocus);
    document.addEventListener("keydown", handleTab);
    return () => {
      document.body.style.overflow = previous;
      background.forEach((element, index) => { element.inert = inertBefore[index]; });
      document.removeEventListener("focusin", keepFocus);
      document.removeEventListener("keydown", handleTab);
    };
  }, [navOpen]);

  // The drawer only exists below the desktop breakpoint; close it if the window grows past it.
  useEffect(() => {
    if (!navOpen || typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event) => { if (event.matches) setNavOpenKey(null); };
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [navOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    let error;
    try { ({ error } = await supabase.auth.signOut()); }
    catch { error = true; }
    setLoggingOut(false);

    if (error) {
      console.error("Unable to log out:", error);
      toast.show("Unable to sign out. Please try again.", { tone: "error" });
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
  const avatar = typeof candidateAvatar === "string" && /^https:\/\//.test(candidateAvatar) ? candidateAvatar : null;

  const accountItems = [
    ...visibleAccountLinks().map(({ to, label, icon: Icon }) => ({
      to,
      label,
      icon: <Icon size={18} strokeWidth={2} />,
    })),
    { divider: true },
    {
      label: loggingOut ? "Signing out…" : "Sign out",
      icon: <LogOut size={18} strokeWidth={2} />,
      onSelect: handleLogout,
      disabled: loggingOut,
      danger: true,
    },
  ];

  const isCurrent = (paths) => (paths.includes(location.pathname) ? " is-current" : "");

  return (
    <>
      {navOpen && <div className="navbar-backdrop" aria-hidden="true" />}
      <header className={`navbar${navOpen ? " is-nav-open" : ""}`} role={navOpen ? "dialog" : undefined} aria-modal={navOpen || undefined} aria-label={navOpen ? "Main menu" : undefined}>
        <Link to="/" className="navbar-logo" aria-label="Yard Sailor home" onClick={closeNav}>
          <img src="/images/logo_bubble_green.png" alt="" />
        </Link>

        <SearchBar className="navbar-search" onFocus={closeNav} />

        <nav ref={navRef} id="main-navigation" className={`navbar-center${navOpen ? " is-open" : ""}`} aria-label="Main navigation">
          <NavLink to="/shop" onClick={closeNav}>Shop</NavLink>
          <NavLink to="/find-yard-sale" onClick={closeNav}>Yard Sales</NavLink>
          {user && <><NavLink to="/saved" onClick={closeNav}>Saved</NavLink><NavLink to="/messages" onClick={closeNav}>Messages</NavLink></>}
          <div className="desktop-nav-menus">
            <DropdownMenu
              label={<>Sell <ChevronDown size={16} aria-hidden="true" /></>}
              triggerClassName={`nav-menu-trigger${isCurrent(["/post-sale", "/post-yard-sale"])}`}
              items={SELL_ITEMS}
              menuLabel="Sell"
            />
            <DropdownMenu
              label={<>More <ChevronDown size={16} aria-hidden="true" /></>}
              triggerClassName={`nav-menu-trigger${isCurrent(["/about", "/contact"])}`}
              items={MORE_ITEMS}
              menuLabel="More"
            />
          </div>
          <div className="mobile-nav-links">
            <NavLink to="/post-sale" onClick={closeNav}>Post an item</NavLink>
            <NavLink to="/post-yard-sale" onClick={closeNav}>Post a yard sale</NavLink>
            <NavLink to="/about" onClick={closeNav}>About</NavLink>
            <NavLink to="/contact" onClick={closeNav}>Contact</NavLink>
          </div>
        </nav>

        <div className="navbar-account">
          {authLoading ? <span className="navbar-account-loading" role="status">Loading account…</span> : user ? (
            <DropdownMenu
              className="nav-account-menu"
              align="end"
              triggerClassName="nav-account-trigger"
              triggerLabel={`Account menu for ${displayName}`}
              menuLabel="Account"
              label={<>
                <span aria-hidden="true"><Avatar className="navbar-avatar" src={avatar} name={displayName} size={32} alt="" /></span>
                <span className="nav-account-name">{displayName}</span>
                <ChevronDown className="nav-account-chevron" size={16} strokeWidth={2} aria-hidden="true" />
              </>}
              header={<div className="nav-account-header">
                <span aria-hidden="true"><Avatar className="navbar-avatar" src={avatar} name={displayName} size={42} alt="" /></span>
                <span className="nav-account-header__text">
                  <strong>{displayName}</strong>
                  <span>{user.email}</span>
                </span>
              </div>}
              items={accountItems}
            />
          ) : (
            <Link to={`/login?redirect=${encodeURIComponent(returnPath(`${location.pathname}${location.search}${location.hash}`))}`} className="login-link" aria-label="Sign in or sign up" onClick={closeNav}>
              <UserRound size={22} strokeWidth={2} aria-hidden="true" />
              <span>Sign in</span>
            </Link>
          )}

          <button
            className="cart-button"
            type="button"
            aria-label={`Shopping cart${count ? `, ${count} items` : ""}`}
            onClick={() => { closeNav(); navigate("/cart"); }}
          >
            <ShoppingCart size={22} strokeWidth={2} aria-hidden="true" />
            {count > 0 && <span className="cart-count">{count}</span>}
          </button>
        </div>
        <button
          ref={navButtonRef}
          className="navbar-menu-button"
          type="button"
          aria-label={navOpen ? "Close menu" : "Open menu"}
          aria-expanded={navOpen}
          aria-controls="main-navigation"
          onClick={() => setNavOpenKey(navOpen ? null : location.key)}
        >
          {navOpen ? <X size={22} strokeWidth={2} aria-hidden="true" /> : <Menu size={22} strokeWidth={2} aria-hidden="true" />}
        </button>
      </header>
    </>
  );
}

export default Navbar;
