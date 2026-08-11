import { Link } from "react-router-dom";
import "./AccountPages.css";

function HelpSupport() {
  return <main className="account-page"><div className="account-container"><div className="account-heading"><h1>Help &amp; Support</h1><p>Find answers or get in touch with Yard Sailor.</p></div><div className="account-grid"><section className="account-placeholder-card"><h2>Contact Yard Sailor</h2><p>Need personal help with your account or posting?</p><Link className="account-button" to="/contact">Contact Us</Link></section><section className="account-placeholder-card"><h2>Frequently Asked Questions</h2><p className="account-empty">Answers to common buying, selling, and yard-sale questions are coming soon.</p></section><section className="account-placeholder-card"><h2>Report a Problem</h2><p>Tell us when something is not working as expected.</p><Link className="account-button-secondary" to="/contact">Report a Problem</Link></section></div></div></main>;
}

export default HelpSupport;
