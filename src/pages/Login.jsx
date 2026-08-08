import { useState } from "react";
import Navbar from "../components/Navbar";
import "./Login.css";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <>
      <Navbar />

      <main className="login-page">
        <div className="login-brand">
          Yard Sailor
        </div>

        <section className="login-card">
          <h1>Welcome</h1>

          <form className="login-form">
            <div className="login-input">
              <img src="/images/email.svg" alt="Email" className="email-icon"/>
        
              <input
                type="email"
                placeholder="Email"
                required
              />
            </div>

            <div className="login-input">
              <img
                src="/images/lock.svg"
                alt="Lock"
                className="input-icon"/>

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
              />

            <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
            >
              Log in
            </button>
          </form>

          <div className="login-divider">
            <span></span>
            <p>Or</p>
            <span></span>
          </div>

          <div className="social-login">
            <button type="button" className="social-button">
              <img
                src="/images/Google.svg"
                alt="Google"
                className="google-icon"
              />
              Google
            </button>

            <button type="button" className="social-button">
              <img
                src="/images/fbicon.png"
                alt="Google"
                className="facebook-icon"
              />
              Facebook
            </button>
          </div>

          <p className="no-account">
            Have no account yet?
          </p>

          <a
            href="/register"
            className="registration-button"
          >
            Sign Up
          </a>

          <a
            href="/privacy"
            className="privacy-button"
          >
            Privacy Policy
          </a>
        </section>
      </main>
    </>
  );
}

export default Login;