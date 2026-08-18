import { Link } from "react-router-dom";
import "./About.css";

const features = [
  {
    icon: "⌖",
    title: "Discover",
    text: "Find nearby yard sales and see what is happening around your neighborhood.",
  },
  {
    icon: "◫",
    title: "Shop",
    text: "Browse unique secondhand items shared by local Yard Sailor sellers.",
  },
  {
    icon: "＋",
    title: "Sell",
    text: "Post an item or host a yard sale and give useful things a new destination.",
  },
];

const steps = [
  ["01", "Discover", "Search the map or browse local marketplace listings."],
  ["02", "Connect", "See what is available and learn more about each find or sale."],
  ["03", "Sail", "Visit the sale, shop locally, or list something of your own."],
];

function About() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="about-eyebrow">YARD SAILOR</p>
          <h1>
            Find treasures. Meet neighbors.
            <span>Give great items a second life.</span>
          </h1>
          <p className="about-hero-description">
            Yard Sailor makes it easier to discover local yard sales and
            secondhand finds nearby.
          </p>
          <div className="about-actions">
            <Link className="about-primary-button" to="/find-yard-sale">
              Find a Yard Sale
            </Link>
            <Link className="about-secondary-button" to="/shop">
              Shop
            </Link>
          </div>
        </div>

        <div className="about-visual" aria-label="Neighborhood discovery illustration">
          <div className="about-map-line line-one" />
          <div className="about-map-line line-two" />
          <div className="about-map-line line-three" />
          <span className="about-map-pin pin-one" aria-hidden="true" />
          <span className="about-map-pin pin-two" aria-hidden="true" />
          <span className="about-map-pin pin-three" aria-hidden="true" />
          <div className="about-visual-card visual-card-map">
            <span>NEARBY</span>
            <strong>Discover around the corner</strong>
          </div>
          <div className="about-visual-card visual-card-shop">
            <span>LOCAL</span>
            <strong>Shop secondhand finds</strong>
          </div>
          <img
            className="about-visual-logo"
            src="/images/logo_bubble_green.png"
            alt="Yard Sailor"
          />
        </div>
      </section>

      <section className="about-section about-features">
        <div className="about-section-heading">
          <p className="about-section-label">WHAT YARD SAILOR DOES</p>
          <h2>Everything local discovery needs.</h2>
        </div>
        <div className="about-feature-grid">
          {features.map((feature) => (
            <article className="about-feature-card" key={feature.title}>
              <span className="about-feature-icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-mission">
        <div>
          <p className="about-section-label">OUR MISSION</p>
          <h2>Making local discovery easier.</h2>
        </div>
        <p>
          Yard Sailor connects neighbors, makes yard sales easier to find,
          and helps useful items stay in circulation instead of being
          discarded. Local discovery should feel simple, welcoming, and worth
          exploring.
        </p>
      </section>

      <section className="about-section about-how-it-works">
        <div className="about-section-heading">
          <p className="about-section-label">HOW IT WORKS</p>
          <h2>Three simple ways to set sail.</h2>
        </div>
        <div className="about-steps">
          {steps.map(([number, title, text]) => (
            <article className="about-step" key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-highlights" aria-label="Yard Sailor values">
        <div><strong>LOCAL</strong><span>Built around nearby discovery</span></div>
        <div><strong>SIMPLE</strong><span>Post and browse with fewer steps</span></div>
        <div><strong>COMMUNITY</strong><span>Connect buyers and sellers nearby</span></div>
      </section>

      <section className="about-cta">
        <div>
          <p className="about-section-label">COME ABOARD</p>
          <h2>Ready to start sailing?</h2>
          <p>Discover what is waiting around the corner.</p>
        </div>
        <div className="about-actions">
          <Link className="about-primary-button" to="/find-yard-sale">
            Find a Yard Sale
          </Link>
          <Link className="about-light-button" to="/post-sale">
            Post a Sale
          </Link>
        </div>
      </section>
    </main>
  );
}

export default About;
