import { useState } from "react";
import "./Contact.css";

const CONTACT_EMAIL = "app.yardsailor@gmail.com";

function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validate() {
    const newErrors = {
      name: !form.name.trim(),
      email: !isValidEmail(form.email.trim()),
      subject: !form.subject.trim(),
      message: !form.message.trim(),
    };

    setErrors(newErrors);

    return !Object.values(newErrors).some(Boolean);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setStatus("sending");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
      _subject: `New Yard Sailor contact message: ${form.subject.trim()}`,
      _captcha: "false",
    };

    try {
      const response = await fetch(
        `https://formsubmit.co/ajax/${CONTACT_EMAIL}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to send message");
      }

      setStatus("success");

      setForm({
        name: "",
        email: "",
        subject: "",
        message: "",
      });

      setErrors({});
    } catch (error) {
      console.error(error);
      setStatus("failure");
    }
  }

  return (
    <main className="contact-page">
      <div className="contact-brand">
        Yard Sailor
      </div>

      <h1 className="contact-title">
        CONTACT US
      </h1>

      <section className="contact-card">
        <div className="contact-form-section">
          <h2>Get in touch with us</h2>

          <form
            className="contact-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <label htmlFor="contact-name">
              Name
            </label>

            <input
              id="contact-name"
              className={errors.name ? "input-error" : ""}
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
            />

            {errors.name && (
              <p className="contact-error">
                Please enter your name.
              </p>
            )}

            <label htmlFor="contact-email">
              Email
            </label>

            <input
              id="contact-email"
              className={errors.email ? "input-error" : ""}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@domain.com"
            />

            {errors.email && (
              <p className="contact-error">
                Please enter a valid email.
              </p>
            )}

            <label htmlFor="contact-subject">
              Subject
            </label>

            <input
              id="contact-subject"
              className={errors.subject ? "input-error" : ""}
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Tell your subject here..."
            />

            {errors.subject && (
              <p className="contact-error">
                Please enter a subject.
              </p>
            )}

            <label htmlFor="contact-message">
              Message
            </label>

            <textarea
              id="contact-message"
              className={errors.message ? "input-error" : ""}
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Type your query here..."
            />

            {errors.message && (
              <p className="contact-error">
                Please enter a message.
              </p>
            )}

            <button
              className="contact-send"
              type="submit"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending..." : "Send"}
            </button>

            {status === "success" && (
              <p className="contact-status success">
                Message sent!
              </p>
            )}

            {status === "failure" && (
              <p className="contact-status failure">
                Something went wrong. Please try again.
              </p>
            )}
          </form>
        </div>

        <div className="contact-map">
          <iframe
            src="https://maps.google.com/maps?q=Santa%20Cruz%2C%20CA&t=&z=13&ie=UTF8&iwloc=&output=embed"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Yard Sailor location"
          />

          <div className="map-address">
            Yard Sailor
            <span>Santa Cruz, CA</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Contact;