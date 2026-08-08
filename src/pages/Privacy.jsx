import Navbar from "../components/Navbar";
import "./Privacy.css";

function Privacy() {
  return (
    <>
      <Navbar />

      <main className="privacy-page">
        <section className="privacy-container">
          <h1>Privacy Policy</h1>

          <p className="privacy-updated">
            Last updated: August 8, 2026
          </p>

          <section>
            <h2>1. Information We Collect</h2>
            <p>
              Yard Sailor may collect information that you provide directly,
              such as your name, email address, account information, yard sale
              listings, and other information you choose to submit.
            </p>
          </section>

          <section>
            <h2>2. How We Use Your Information</h2>
            <p>
              We may use your information to provide and improve Yard Sailor,
              manage user accounts, display yard sale listings, respond to
              support requests, and maintain the security of the platform.
            </p>
          </section>

          <section>
            <h2>3. Location Information</h2>
            <p>
              Yard Sailor may use location information to display nearby yard
              sales and map results. Location information may come from
              addresses submitted with listings or, when permitted, from your
              device.
            </p>
          </section>

          <section>
            <h2>4. Third-Party Services</h2>
            <p>
              Yard Sailor may use third-party services for features such as
              authentication, maps, databases, analytics, or other website
              functionality. These providers may process information according
              to their own privacy policies.
            </p>
          </section>

          <section>
            <h2>5. Cookies and Similar Technologies</h2>
            <p>
              We may use cookies or similar technologies to maintain sessions,
              remember preferences, improve functionality, and understand how
              users interact with the website.
            </p>
          </section>

          <section>
            <h2>6. Data Security</h2>
            <p>
              We take reasonable measures to protect information from
              unauthorized access, misuse, loss, or disclosure. However, no
              online service can guarantee complete security.
            </p>
          </section>

          <section>
            <h2>7. Your Choices</h2>
            <p>
              You may update certain account information and preferences through
              your account. You may also contact Yard Sailor regarding questions
              or requests involving your personal information.
            </p>
          </section>

          <section>
            <h2>8. Changes to This Policy</h2>
            <p>
              This Privacy Policy may be updated as Yard Sailor changes. Any
              updated version will be posted on this page with a revised date.
            </p>
          </section>

          <section>
            <h2>9. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact
              Yard Sailor through the website's Contact page.
            </p>
          </section>
        </section>
      </main>
    </>
  );
}

export default Privacy;