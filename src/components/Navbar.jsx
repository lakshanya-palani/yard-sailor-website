import "./Navbar.css";
import LanguageDropdown from "./LanguageDropdown";
import SearchBar from "./SearchBar";

function Navbar() {
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
          <a href="/">Home</a>

          <a href="/shop">Shop</a>

          <a href="/" className="navbar-logo">
            <img
              src="/images/logo_bubble_green.png"
              alt="Yard Sailor logo"
            />
          </a>

          <a href="/post-sale">
            Post Yard Sale
          </a>

          <a href="/contact">
            Contact
          </a>
        </div>

        <div className="navbar-account">
          <a href="/login" className="login-link">
            <img
              src="/images/lock.png"
              alt=""
              className="lock-icon"
            />

            <span>Login/Sign Up</span>
          </a>

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