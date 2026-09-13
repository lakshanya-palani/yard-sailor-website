import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      {/* Bottom footer section */}
      <div className="footer-bottom">
        {/* Links */}
        <div className="footer-links">
          <a href="/">HOME</a>
          <a href="/shop">SHOP</a>
          <a href="/contact">CONTACT US</a>
          <a href="/privacy">PRIVACY POLICY</a>
          <a href="/accessibility">ACCESSIBILITY</a>
        </div>

        {/* Signup + social */}
        <div className="footer-info">
          <h2>STAY IN THE LOOP</h2>

          <p>
            Get updates on nearby yard sales, special finds, and Yard Sailor
            announcements.
          </p>

          <div className="footer-email">
            <input type="email" aria-label="Newsletter email (signup not yet available)" disabled placeholder="Enter your email" />

            <button type="button" aria-label="Newsletter signup not yet available" disabled>
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
