import { Mail } from "lucide-react";
import SocialLogin from "../components/SocialLogin";
import { PasswordInput } from "../components/PasswordInput";
import { AuthCard } from "../components/layout/AuthCard";
import { Field } from "../components/ui/Field";
import { TextInput } from "../components/ui/TextInput";
import { Button } from "../components/ui/Button";
import { FormAlert } from "../components/ui/FormAlert";
import { safeRedirect } from "../lib/redirect";
import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Login.css";

function Login({ requestedPath }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const location = useLocation();
  // Notice handed over from Register; any error message below replaces it.
  const notice = location.state?.notice || "";
  const [feedback, setFeedback] = useState("");
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
    <AuthCard
      title={heading}
      footer={(
        <div className="auth-footer">
          <p>
            Don&apos;t have an account?{" "}
            <Link to={`/register?redirect=${encodeURIComponent(safeRedirect(searchParams.get("redirect")))}`}>
              Sign up
            </Link>
          </p>
          <a href="/privacy" className="auth-footer__legal">Privacy Policy</a>
        </div>
      )}
    >
      {feedback ? (
        <FormAlert>{feedback}</FormAlert>
      ) : notice ? (
        <FormAlert tone="success">{notice}</FormAlert>
      ) : null}

      <form className="auth-form" onSubmit={handleLogin}>
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

        <Field label="Password">
          <PasswordInput
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <a href="/contact" className="auth-help-link">
          Need help signing in?
        </a>

        <Button
          type="submit"
          block
          loading={loading}
          disabled={socialBusy}
        >
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>

      <div className="auth-divider"><span>Or</span></div>

      <SocialLogin redirect={safeRedirect(searchParams.get('redirect'))} disabled={loading} onBusy={setSocialBusy} />
    </AuthCard>
  );
}

export default Login;
