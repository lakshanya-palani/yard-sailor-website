import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      {/* Top newsletter section */}
      <div className="footer-newsletter">
        <h2>STAY IN THE LOOP</h2>

        <p>
          Sign up for updates on new yard sales, local finds, and more.
        </p>

        <form className="footer-newsletter-form">
          <input
            type="email"
            placeholder="Enter your email"
            aria-label="Email address"
          />

          <button type="submit">
            SUBSCRIBE
          </button>
        </form>
      </div>

      {/* Bottom footer section */}
      <div className="footer-bottom">
        {/* Links */}
        <div className="footer-links">
          <a href="/">HOME</a>
          <a href="/shop">SHOP</a>
          <a href="/contact">CONTACT US</a>
          <a href="/privacy">PRIVACY POLICY</a>
        </div>

        {/* Signup + social */}
        <div className="footer-info">
          <h3>SIGN UP & SAVE</h3>

          <p>
            Get updates on nearby yard sales, special finds, and Yard Sailor
            announcements.
          </p>

          <div className="footer-email">
            <input type="email" placeholder="Enter your email" />

            <button type="button" aria-label="Submit email">
              →
            </button>
          </div>

          <div className="footer-socials">
            <a href="#" aria-label="Instagram">
              <img src="/images/instagram.svg" alt="Instagram" />
            </a>

            <a href="#" aria-label="Facebook">
              <img src="/images/facebook.svg" alt="Facebook" />
            </a>
          </div>
        </div>

        {/* Branding */}
        <div className="footer-brand">
          <img
            src="/images/logo_bubble_green.png"
            alt="Yard Sailor"
          />

          <p>
            Find it. Bid on it. Sail away with it.
          </p>
        </div>
      </div>

      <div className="footer-copyright">
        © 2026 Yard Sailor. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;