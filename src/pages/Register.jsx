import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      alert("Please enter your full name.");
      return;
    }

    if (!trimmedEmail) {
      alert("Please enter your email.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
        },
      },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (data.session) {
      navigate("/profile/setup", { replace: true });
    } else {
      alert(
        "Account created! Check your email to confirm your account, then log in."
      );

      navigate("/login");
    }
  }

  return (
    <main className="register-page">
      <div className="register-brand">
        Yard Sailor
      </div>

      <section className="register-card">
        <h1>Create Account</h1>

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
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="register-input">
            <input
              type="email"
              name="email"
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
              name="password"
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
              name="confirmPassword"
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
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="already-account">
          Already have an account?
        </p>

        <Link
          to="/login"
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
