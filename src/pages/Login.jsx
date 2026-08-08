import Navbar from "../components/Navbar";
import "./Login.css";

function Login() {
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
              <span className="input-icon">✉</span>

              <input
                type="email"
                placeholder="Email"
                required
              />
            </div>

            <div className="login-input">
              <span className="input-icon">⌑</span>

              <input
                type="password"
                placeholder="Password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                aria-label="Show password"
              >
                ◉
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
                className="social-icon"
              />
              Google
            </button>

            <button type="button" className="social-button">
              <span className="apple-icon">●</span>
              Apple
            </button>
          </div>

          <p className="no-account">
            Have no account yet?
          </p>

          <a
            href="/register"
            className="registration-button"
          >
            Registration
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