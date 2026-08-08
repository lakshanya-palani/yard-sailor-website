import "./Navbar.css";

function Navbar() {
  return (
    <>
      {/* TOP BLACK BAR */}
      <div className="top-bar">
        <div className="top-bar-center">
          NEW DROP NOW LIVE
        </div>

        <div className="top-bar-right">
          <img src="/images/instagram.svg" alt="Instagram" />
          <img src="/images/facebook.svg" alt="Facebook" />
          <img src="/images/discord.svg" alt="Discord" />

          <div className="language-selector">
            <span>English</span>
            <span className="language-arrow"></span>
          </div>
        </div>
      </div>

      {/* MAIN NAVBAR */}
      <header className="navbar">
        <button className="search-button" aria-label="Search">
          <img src="/images/search.svg" alt="Search"/>
         </button>

        <nav className="navbar-links">
          <a href="/">Home</a>
          <a href="/shop">Shop</a>
        </nav>

        <a href="/" className="navbar-logo">
          <img
            src="/images/logo_bubble_green.png"
            alt="Yard Sailor logo"
          />
        </a>

        <nav className="navbar-links">
          <a href="/post-sale">Post Yard Sale</a>
          <a href="/contact">Contact</a>
        </nav>

        <div className="navbar-account">
          <a href="/login" className="login-link">
            <img
              src="/images/lock.png"
              alt=""
              className="lock-icon"
            />

            <span>Login/Sign Up</span>
          </a>

          <button className="cart-button" aria-label="Shopping cart">
            <img
              src="/images/cart.png"
              alt="Shopping cart"
            />
          </button>
        </div>
      </header>
    </>
  );
}

export default Navbar;