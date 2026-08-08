import { useState } from "react";
import "./SignupPopup.css";

function SignupPopup() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="signup-wrapper">
      <div className="signup-triangle">
        <span>Sign Up</span>
      </div>

      <button
        className="signup-close"
        onClick={() => setIsVisible(false)}
        aria-label="Close sign up"
      >
        ×
      </button>
    </div>
  );
}

export default SignupPopup;