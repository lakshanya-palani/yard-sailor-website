import { useState } from "react";
import { PageShell } from "../components/layout/PageShell";
import { PageHeader } from "../components/layout/PageHeader";
import { FormCard, FormSection, FormActions } from "../components/layout/FormLayout";
import { Field } from "../components/ui/Field";
import { TextInput } from "../components/ui/TextInput";
import { TextArea } from "../components/ui/TextArea";
import { Button } from "../components/ui/Button";
import { FormAlert } from "../components/ui/FormAlert";

const CONTACT_EMAIL = "app.yardsailor@gmail.com";
const MESSAGE_MAX = 4000;

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
      <PageShell width="narrow">
        <PageHeader
          title="Contact us"
          subtitle="Questions, feedback or a problem with a listing? Send us a message and we'll get back to you by email."
        />

        <FormCard title="Get in touch with us">
          <form
            className="contact-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <FormSection>
              <Field label="Name" error={errors.name ? "Please enter your name." : undefined}>
                <TextInput
                  id="contact-name"
                  maxLength={100}
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full name"
                />
              </Field>

              <Field label="Email" error={errors.email ? "Please enter a valid email." : undefined}>
                <TextInput
                  id="contact-email"
                  maxLength={254}
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@domain.com"
                />
              </Field>

              <Field label="Subject" error={errors.subject ? "Please enter a subject." : undefined}>
                <TextInput
                  id="contact-subject"
                  maxLength={200}
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="Tell your subject here..."
                />
              </Field>

              <Field
                label="Message"
                error={errors.message ? "Please enter a message." : undefined}
                count={form.message.length}
                max={MESSAGE_MAX}
              >
                <TextArea
                  id="contact-message"
                  maxLength={MESSAGE_MAX}
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Type your query here..."
                />
              </Field>

              {status === "success" && (
                <FormAlert tone="success">Message sent!</FormAlert>
              )}

              {status === "failure" && (
                <FormAlert tone="error">Something went wrong. Please try again.</FormAlert>
              )}
            </FormSection>

            <FormActions>
              <Button type="submit" loading={status === "sending"}>
                {status === "sending" ? "Sending..." : "Send"}
              </Button>
            </FormActions>
          </form>
        </FormCard>
      </PageShell>
  );
}

export default Contact;
