import { PageShell } from "../components/layout/PageShell";
import { PageHeader } from "../components/layout/PageHeader";
import { CardGrid } from "../components/layout/CardGrid";
import { Button } from "../components/ui/Button";
import "./AccountPages.css";

// PageShell rather than AccountLayout: /help is public, so signed-out visitors
// shouldn't see the account tabs.
function HelpSupport() {
  return (
    <PageShell>
      <PageHeader title="Help & Support" subtitle="Find answers or get in touch with Yard Sailor." />
      <CardGrid columns={3}>
        <section className="account-card">
          <h2 className="account-card__title">Contact Yard Sailor</h2>
          <p className="account-card__text">Need personal help with your account or posting?</p>
          <Button to="/contact" className="account-card__action">Contact Us</Button>
        </section>
        <section className="account-card">
          <h2 className="account-card__title">Frequently Asked Questions</h2>
          <p className="account-card__text account-card__text--muted">Answers to common buying, selling, and yard-sale questions are coming soon.</p>
        </section>
        <section className="account-card">
          <h2 className="account-card__title">Report a Problem</h2>
          <p className="account-card__text">Tell us when something is not working as expected.</p>
          <Button variant="secondary" to="/contact" className="account-card__action">Report a Problem</Button>
        </section>
      </CardGrid>
    </PageShell>
  );
}

export default HelpSupport;
