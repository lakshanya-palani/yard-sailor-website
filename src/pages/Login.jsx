import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Login.css";

function Login() {
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log("Login page mounted");
  }, []);

  async function handleLogin(event) {
    event.preventDefault();

    if (loading) return;

    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") || "").trim();
    const submittedPassword = String(formData.get("password") || "");

    if (!submittedEmail || !submittedPassword) {
      alert("Please enter your email and password.");
      return;
    }

    console.log("Submitted email:", submittedEmail);
    console.log("Password length:", submittedPassword.length);
    console.log("Submitting login");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: submittedEmail,
        password: submittedPassword,
      });

      console.log("Login response user:", data?.user);

      if (error) {
        console.error("Login response error:", error);
        console.error("Login error:", error);
        alert(error.message);
        return;
      }

      console.log("Login successful:", data.user);

      const requestedRedirect = searchParams.get("redirect");
      const redirect = requestedRedirect?.startsWith("/")
        ? requestedRedirect
        : "/";
      console.log("Redirect target:", redirect);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();

      console.log("Logged-in profile:", profile);

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
      alert("Unable to log in. Please try again.");
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
        <h1>Welcome</h1>

        <form
          className="login-form"
          onSubmit={handleLogin}
        >
          <div className="login-input">
            <img
              src="/images/email.svg"
              alt="Email"
              className="email-icon"
            />

            <input
              type="email"
              name="email"
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
            <img
              src="/images/lock.svg"
              alt="Lock"
              className="input-icon"
            />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              name="password"
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
              <img
                src="/images/view.svg"
                alt=""
                className="view-password-icon"
              />
            </button>
          </div>

          <a
            href="/forgot-password"
            className="forgot-password"
          >
            Forgot password?
          </a>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="login-divider">
          <span></span>
          <p>Or</p>
          <span></span>
        </div>

        <div className="social-login">
          <button
            type="button"
            className="social-button"
          >
            <img
              src="/images/Google.svg"
              alt="Google"
              className="google-icon"
            />
            Google
          </button>

          <button
            type="button"
            className="social-button"
          >
            <img
              src="/images/fbicon.png"
              alt="Facebook"
              className="facebook-icon"
            />
            Facebook
          </button>
        </div>

        <p className="no-account">
          Have no account yet?
        </p>

        <Link
          to="/register"
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
