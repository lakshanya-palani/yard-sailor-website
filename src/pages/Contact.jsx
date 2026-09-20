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

    if (status === "sending") return;
    if (!validate()) {
      requestAnimationFrame(() => document.querySelector(".contact-form [aria-invalid=true]")?.focus());
      return;
    }

    setStatus("sending");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
      _subject: `New Yard Sailor contact message: ${form.subject.trim()}`,
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
              id="contact-name" maxLength={100} aria-invalid={!!errors.name} aria-describedby={errors.name ? "contact-name-error" : undefined}
              className={errors.name ? "input-error" : ""}
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
            />

            {errors.name && (
              <p id="contact-name-error" className="contact-error">
                Please enter your name.
              </p>
            )}

            <label htmlFor="contact-email">
              Email
            </label>

            <input
              id="contact-email" maxLength={254} aria-invalid={!!errors.email} aria-describedby={errors.email ? "contact-email-error" : undefined}
              className={errors.email ? "input-error" : ""}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@domain.com"
            />

            {errors.email && (
              <p id="contact-email-error" className="contact-error">
                Please enter a valid email.
              </p>
            )}

            <label htmlFor="contact-subject">
              Subject
            </label>

            <input
              id="contact-subject" maxLength={200} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "contact-subject-error" : undefined}
              className={errors.subject ? "input-error" : ""}
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Tell your subject here..."
            />

            {errors.subject && (
              <p id="contact-subject-error" className="contact-error">
                Please enter a subject.
              </p>
            )}

            <label htmlFor="contact-message">
              Message
            </label>

            <textarea
              id="contact-message" maxLength={4000} aria-invalid={!!errors.message} aria-describedby={errors.message ? "contact-message-error" : undefined}
              className={errors.message ? "input-error" : ""}
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Type your query here..."
            />

            {errors.message && (
              <p id="contact-message-error" className="contact-error">
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
              <p role="status" className="contact-status success">
                Message sent!
              </p>
            )}

            {status === "failure" && (
              <p role="alert" className="contact-status failure">
                Something went wrong. Please try again.
              </p>
            )}
          </form>
        </div>

      </section>
    </main>
  );
}

export default Contact;
