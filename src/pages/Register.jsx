import SocialLogin from "../components/SocialLogin";
import { returnPath, saveReturn } from "../lib/authFlow";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Register.css";

function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = returnPath(params.get("redirect"));
  const [socialBusy, setSocialBusy] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState("");
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
      setFeedback(
        "Account created! Check your email to confirm your account, then log in."
      );

      navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { state: { notice: "Check your email to confirm your account, then log in." } });
    }
    } catch { setFeedback("Unable to create your account. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <main className="register-page">
      <div className="register-brand">
        Yard Sailor
      </div>

      <section className="register-card">
        <h1>Create Account</h1><p role="alert">{feedback}</p>

        <p className="register-subtitle">
          Join Yard Sailor and start discovering neighborhood treasures.
        </p>

        <form
          className="register-form"
          onSubmit={handleRegister}
        >
          <div className="register-input">
            <input
              type="text"
              placeholder="Full name" aria-label="Full name" autoComplete="name" maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="register-input">
            <input
              type="email"
              name="email" aria-label="Email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="register-input">
            <input
              type={showPassword ? "text" : "password"}
              name="password" aria-label="Password"
              autoComplete="new-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="register-input">
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword" aria-label="Confirm password"
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <label className="show-password">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
            />

            Show password
          </label>

          <button
            type="submit"
            className="register-submit"
            disabled={loading || socialBusy}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <SocialLogin redirect={redirect} disabled={loading} onBusy={setSocialBusy} />

        <p className="already-account">
          Already have an account?
        </p>

        <Link
          to={`/login?redirect=${encodeURIComponent(redirect)}`}
          className="login-link-button"
        >
          Log In
        </Link>

        <a
          href="/privacy"
          className="register-privacy-button"
        >
          Privacy Policy
        </a>
      </section>
    </main>
  );
}

export default Register;
