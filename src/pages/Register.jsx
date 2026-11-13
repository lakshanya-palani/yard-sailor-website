import { Mail, UserRound } from "lucide-react";
import SocialLogin from "../components/SocialLogin";
import { PasswordInput } from "../components/PasswordInput";
import { AuthCard } from "../components/layout/AuthCard";
import { Field } from "../components/ui/Field";
import { TextInput } from "../components/ui/TextInput";
import { Button } from "../components/ui/Button";
import { FormAlert } from "../components/ui/FormAlert";
import { returnPath, saveReturn } from "../lib/authFlow";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Login.css";

function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = returnPath(params.get("redirect"));
  const [socialBusy, setSocialBusy] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [feedback, setFeedback] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    if (loading || socialBusy) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setFeedback("Please enter your full name.");
      return;
    }

    if (!trimmedEmail) {
      setFeedback("Please enter your email.");
      return;
    }

    if (password !== confirmPassword) {
      setFeedback("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setFeedback("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try { saveReturn(window.sessionStorage, redirect); } catch { /* Email login still works without saved navigation. */ }
    try {

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          name: trimmedName,
        },
      },
    });

    setLoading(false);

    if (error) {
      setFeedback("Unable to create your account. Please check your details and try again.");
      return;
    }

    if (data.session) {
      navigate(`/profile/setup?redirect=${encodeURIComponent(redirect)}`, { replace: true });
    } else {
      setFeedback("");
      setSuccess(
        "Account created! Check your email to confirm your account, then log in."
      );

      navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { state: { notice: "Check your email to confirm your account, then log in." } });
    }
    } catch { setFeedback("Unable to create your account. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <AuthCard
      title="Create Account"
      subtitle="Join Yard Sailor and start discovering neighborhood treasures."
      footer={(
        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>Log in</Link>
          </p>
          <a href="/privacy" className="auth-footer__legal">Privacy Policy</a>
        </div>
      )}
    >
      {feedback ? (
        <FormAlert>{feedback}</FormAlert>
      ) : success ? (
        <FormAlert tone="success">{success}</FormAlert>
      ) : null}

      <form className="auth-form" onSubmit={handleRegister}>
        <Field label="Full name">
          <TextInput
            type="text"
            name="name"
            autoComplete="name"
            maxLength={100}
            leadingIcon={<UserRound size={20} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <Field label="Email">
          <TextInput
            type="email"
            name="email"
            autoComplete="email"
            leadingIcon={<Mail size={20} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field label="Password" hint="At least 6 characters.">
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Field label="Confirm password">
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Field>

        <Button
          type="submit"
          block
          loading={loading}
          disabled={socialBusy}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>

      <div className="auth-divider"><span>Or</span></div>

      <SocialLogin redirect={redirect} disabled={loading} onBusy={setSocialBusy} />
    </AuthCard>
  );
}

export default Register;
