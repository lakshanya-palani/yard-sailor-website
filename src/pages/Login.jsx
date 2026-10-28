import { Mail, LockKeyhole, Eye, EyeOff } from "lucide-react";
import SocialLogin from "../components/SocialLogin";
import { safeRedirect } from "../lib/redirect";
import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Login.css";

function Login({ requestedPath }) {
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const location = useLocation();
  const [feedback, setFeedback] = useState(location.state?.notice || "");
  const [socialBusy, setSocialBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const destination = safeRedirect(requestedPath || searchParams.get("redirect"));
  const path = destination.split(/[?#]/)[0];
  const heading = path === "/post-sale" ? "Sign in to post an item" : path === "/post-yard-sale" ? "Sign in to post a yard sale" : path === "/cart" || path === "/checkout" ? "Sign in to view your cart" : path === "/messages" ? "Sign in to view messages" : path === "/saved" || destination.includes("save=1") ? "Sign in to save items" : path === "/orders" ? "Sign in to view your orders" : path === "/profile" || path === "/profile/setup" ? "Sign in to view your profile" : path === "/my-postings" ? "Sign in to manage your items" : path === "/my-yard-sales" ? "Sign in to manage your yard sales" : path === "/settings" ? "Sign in to view your settings" : "Welcome";


  async function handleLogin(event) {
    event.preventDefault();

    if (loading || socialBusy) return;

    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") || "").trim();
    const submittedPassword = String(formData.get("password") || "");

    if (!submittedEmail || !submittedPassword) {
      setFeedback("Please enter your email and password.");
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: submittedEmail,
        password: submittedPassword,
      });

      if (error) {
        console.error("Login response error:", error);
        console.error("Login error:", error);
        setFeedback("Unable to log in. Check your email and password and try again.");
        return;
      }

      const requestedRedirect = searchParams.get("redirect");
      const redirect = safeRedirect(requestedRedirect);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile lookup error:", profileError);
        navigate(
          `/profile/setup?redirect=${encodeURIComponent(redirect)}`,
          { replace: true }
        );
        return;
      }

      if (!profile?.username?.trim()) {
        navigate(
          `/profile/setup?redirect=${encodeURIComponent(redirect)}`,
          { replace: true }
        );
        return;
      }

      navigate(redirect, { replace: true });
    } catch (unexpectedError) {
      console.error("Unexpected login error:", unexpectedError);
      setFeedback("Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-brand">
        Yard Sailor
      </div>

      <section className="login-card">
        <h1>{heading}</h1><p role="alert">{feedback}</p>

        <form
          className="login-form"
          onSubmit={handleLogin}
        >
          <div className="login-input">
            <Mail className="email-icon" size={20} aria-hidden="true" />

            <input
              type="email"
              name="email" aria-label="Email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>

          <div className="login-input">
            <LockKeyhole className="input-icon" size={20} aria-hidden="true" />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              name="password" aria-label="Password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? <EyeOff className="view-password-icon" size={20} aria-hidden="true" /> : <Eye className="view-password-icon" size={20} aria-hidden="true" />}
            </button>
          </div>

          <a
            href="/contact"
            className="forgot-password"
          >
            Need help signing in?
          </a>

          <button
            type="submit"
            className="login-submit"
            disabled={loading || socialBusy}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="login-divider">
          <span></span>
          <p>Or</p>
          <span></span>
        </div>

        <SocialLogin redirect={safeRedirect(searchParams.get('redirect'))} disabled={loading} onBusy={setSocialBusy} />

        <p className="no-account">
          Have no account yet?
        </p>

        <Link
          to={`/register?redirect=${encodeURIComponent(safeRedirect(searchParams.get("redirect")))}`}
          className="registration-button"
        >
          Sign Up
        </Link>

        <a
          href="/privacy"
          className="privacy-button"
        >
          Privacy Policy
        </a>
      </section>
    </main>
  );
}

export default Login;
