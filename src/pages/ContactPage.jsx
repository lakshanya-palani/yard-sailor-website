import { useState, useEffect, useRef } from "react";

// ---- CONFIG ----
const YOUR_EMAIL_HERE = "app.yardsailor@gmail.com"; // <-- replace with your real email
const BASE_W = 1440;
const BASE_H = 875;

export default function ContactPage() {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // null | "sending" | "success" | "failure"

  // ---- Load fonts ----
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;500;700&family=Lexend+Deca:wght@300;500;600&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  // ---- Responsive scaling: keeps the 1440x875 canvas pixel-perfect at any viewport width ----
  useEffect(() => {
    function scaleCanvas() {
      if (!canvasRef.current || !wrapperRef.current) return;
      const scale = wrapperRef.current.offsetWidth / BASE_W;
      canvasRef.current.style.transform = `scale(${scale})`;
      wrapperRef.current.style.height = `${BASE_H * scale}px`;
    }
    scaleCanvas();
    window.addEventListener("resize", scaleCanvas);
    return () => window.removeEventListener("resize", scaleCanvas);
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate() {
    const newErrors = {
      name: form.name.trim().length === 0,
      email: !isValidEmail(form.email.trim()),
      subject: form.subject.trim().length === 0,
      message: form.message.trim().length === 0,
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    if (!validate()) return;

    setStatus("sending");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
      _subject: `New Yard Sailor contact form message: ${form.subject.trim()}`,
      _captcha: "false",
    };

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${YOUR_EMAIL_HERE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Request failed");
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("failure");
    }
  }

  return (
    <div ref={wrapperRef} style={styles.wrapper}>
      <div ref={canvasRef} style={styles.canvas}>
        {/* Top promo bar */}
        <div style={styles.topHeader}>
          <div style={styles.promoText}>NEW DROP NOW LIVE</div>
          <div style={styles.topIcons}>
            <InstagramIcon />
            <FacebookIcon />
            <DiscordIcon />
          </div>
          <div style={styles.langSelect}>
            English
            <ChevronDownIcon />
          </div>
        </div>

        {/* Navbar */}
        <div style={styles.navbar}>
          <div style={styles.navSearch}>
            <SearchIcon />
          </div>

          <a href="#" style={{ ...styles.navItem, left: 460, top: 41, width: 140 }}>
            Home
          </a>
          <a href="#" style={{ ...styles.navItem, left: 545, top: 41, width: 140 }}>
            Shop
          </a>

          <div style={styles.navLogo}>
            <LogoIcon />
          </div>

          <a href="#" style={{ ...styles.navItem, left: 786, top: 43, width: 160 }}>
            Post Yard Sale
          </a>
          <a href="/contact" style={{ ...styles.navItem, left: 923, top: 43, width: 160 }}>
            Contact
          </a>
          <a
            href="#"
            style={{
              ...styles.navItem,
              left: 1203,
              top: 43,
              width: 160,
              fontWeight: 400,
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <LockIcon />
            Login/Sign Up
          </a>

          <div style={styles.navCart}>
            <CartIcon />
          </div>
        </div>

        {/* Content */}
        <div style={styles.frameContent}>
          <div style={styles.brand}>Yard Sailor</div>
          <div style={styles.contactHeading}>CONTACT US</div>

          <div style={styles.contactCard}>
            <div style={styles.formSide}>
              <div style={styles.formHeading}>Get in touch with us</div>

              <form onSubmit={handleSubmit} noValidate>
                <div style={{ ...styles.fieldLabel, top: 80.47 }}>Name</div>
                <input
                  style={{
                    ...styles.fieldInput,
                    top: 93.6,
                    borderColor: errors.name ? "#FF5F5F" : "#8D8D8D",
                  }}
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full name"
                />
                {errors.name && (
                  <div style={{ ...styles.errorMsg, top: 118 }}>Please enter your name.</div>
                )}

                <div style={{ ...styles.fieldLabel, top: 126.64 }}>Email</div>
                <input
                  style={{
                    ...styles.fieldInput,
                    top: 139.76,
                    borderColor: errors.email ? "#FF5F5F" : "#8D8D8D",
                  }}
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@domain.com"
                />
                {errors.email && (
                  <div style={{ ...styles.errorMsg, top: 164.2 }}>Please enter a valid email.</div>
                )}

                <div style={{ ...styles.fieldLabel, top: 173 }}>Subject</div>
                <input
                  style={{
                    ...styles.fieldInput,
                    top: 186.13,
                    borderColor: errors.subject ? "#FF5F5F" : "#8D8D8D",
                  }}
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="Tell your subject here..."
                />
                {errors.subject && (
                  <div style={{ ...styles.errorMsg, top: 210.5 }}>Please enter a subject.</div>
                )}

                <div style={{ ...styles.fieldLabel, top: 219 }}>Message</div>
                <textarea
                  style={{
                    ...styles.fieldTextarea,
                    borderColor: errors.message ? "#FF5F5F" : "#8D8D8D",
                  }}
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Type your query here..."
                />
                {errors.message && (
                  <div style={{ ...styles.errorMsg, top: 271.5 }}>Please enter a message.</div>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  style={{
                    ...styles.sendBtn,
                    opacity: status === "sending" ? 0.6 : 1,
                    cursor: status === "sending" ? "not-allowed" : "pointer",
                  }}
                >
                  {status === "sending" ? "Sending..." : "Send"}
                </button>

                {status === "success" && (
                  <div style={{ ...styles.statusMsg, color: "#7fd99a" }}>Message sent!</div>
                )}
                {status === "failure" && (
                  <div style={{ ...styles.statusMsg, color: "#FF5F5F" }}>Something went wrong.</div>
                )}
              </form>
            </div>

            <div style={styles.mapArea}>
              <iframe
                style={styles.mapIframe}
                src="https://maps.google.com/maps?q=Santa%20Cruz%2C%20CA&t=&z=13&ie=UTF8&iwloc=&output=embed"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Location map"
              />
              <div style={styles.mapPin}>
                <PinIcon />
              </div>
              <div style={styles.mapAddressBox}>
                <div style={styles.mapAddressText}>Yard Sailor Address</div>
              </div>
              <div style={styles.mapExpandBtn}>
                <ExpandIcon />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= Icons =================

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="#fff">
      <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 2 .3 2.4.5.6.2 1 .6 1.5 1 .4.5.8.9 1 1.5.2.4.4 1.2.5 2.4.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 2-.5 2.4-.2.6-.6 1-1 1.5-.5.4-.9.8-1.5 1-.4.2-1.2.4-2.4.5-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-2-.3-2.4-.5-.6-.2-1-.6-1.5-1-.4-.5-.8-.9-1-1.5-.2-.4-.4-1.2-.5-2.4C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-2 .5-2.4.2-.6.6-1 1-1.5.5-.4.9-.8 1.5-1 .4-.2 1.2-.4 2.4-.5C9 2.2 9.4 2.2 12.6 2.2M12 0C8.7 0 8.3 0 7 .1c-1.3.1-2.2.3-3 .6-.8.3-1.5.7-2.2 1.4C1.1 2.8.7 3.5.4 4.3c-.3.8-.5 1.7-.6 3C-.1 8.6 0 9 0 12.3s0 3.7.1 5c.1 1.3.3 2.2.6 3 .3.8.7 1.5 1.4 2.2.7.7 1.4 1.1 2.2 1.4.8.3 1.7.5 3 .6 1.3.1 1.7.1 5 .1s3.7 0 5-.1c1.3-.1 2.2-.3 3-.6.8-.3 1.5-.7 2.2-1.4.7-.7 1.1-1.4 1.4-2.2.3-.8.5-1.7.6-3 .1-1.3.1-1.7.1-5s0-3.7-.1-5c-.1-1.3-.3-2.2-.6-3-.3-.8-.7-1.5-1.4-2.2C21.2 1.1 20.5.7 19.7.4c-.8-.3-1.7-.5-3-.6C15.4 0 15 0 12 0z" />
      <path d="M12 5.8a6.2 6.2 0 100 12.4 6.2 6.2 0 000-12.4zm0 10.2a4 4 0 110-8 4 4 0 010 8z" />
      <circle cx="18.4" cy="5.6" r="1.4" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="#fff">
      <path d="M13.5 22v-9h3l.5-3.5h-3.5V7.4c0-1 .3-1.7 1.7-1.7h1.9V2.5C16.8 2.4 15.7 2.3 14.4 2.3c-2.9 0-4.9 1.8-4.9 5v2.7H6.5V13H9.5v9h4z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="#fff">
      <path d="M19.5 4.9c-1.4-.6-2.9-1.1-4.4-1.3-.2.3-.4.8-.6 1.1-1.6-.2-3.3-.2-4.9 0-.2-.4-.4-.8-.6-1.1-1.5.3-3 .7-4.4 1.3C2 9.2 1.3 13.4 1.7 17.6c1.8 1.3 3.6 2.1 5.3 2.7.4-.6.8-1.2 1.1-1.9-.6-.2-1.2-.5-1.7-.9.1-.1.3-.2.4-.3 3.3 1.5 6.9 1.5 10.2 0 .1.1.3.2.4.3-.5.4-1.1.7-1.7.9.3.7.7 1.3 1.1 1.9 1.7-.5 3.5-1.4 5.3-2.7.5-4.9-.8-9-3-12.7zM8.7 14.9c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="#fff">
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="35" height="35" fill="#fff">
      <path d="M7 4h-2l-1 2v2h2l3.6 7.6-1.4 2.4c-.3.6.1 1.4.8 1.4h10v-2h-9.4l.9-1.6h6.9c.4 0 .8-.2.9-.6l3-6.4H7.4L6.5 6H21V4H7z" />
      <circle cx="9" cy="21" r="1.4" />
      <circle cx="17" cy="21" r="1.4" />
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg width="24" height="28" viewBox="0 0 20 24">
      <line x1="4" y1="2" x2="4" y2="23" stroke="#e5e5e5" strokeWidth="1.5" />
      <path d="M4 3 L18 9 L4 14 Z" fill="#c0392b" />
      <text x="6" y="10" fontFamily="Lexend Deca, sans-serif" fontSize="6" fontWeight="700" fill="#fff">
        YS
      </text>
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="#FF5F5F">
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 6.7 11.2 7 11.4.3.3.7.3 1 0C12.3 21.2 19 15.4 19 10c0-4.4-3.6-8-7.7-8zM12 13a3 3 0 110-6 3 3 0 010 6z" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="10.35" height="10.35" fill="#BEBDBD">
      <path d="M15 3h6v6h-2V6.4l-5 5-1.4-1.4 5-5H15V3zM3 15h2v2.6l5-5 1.4 1.4-5 5H9v2H3v-6z" />
    </svg>
  );
}

// ================= Styles =================

const styles = {
  wrapper: {
    width: "100%",
    position: "relative",
  },
  canvas: {
    position: "relative",
    width: BASE_W,
    height: BASE_H,
    background: "#FBF0DD",
    transformOrigin: "top left",
    fontFamily: "'League Spartan', sans-serif",
  },
  topHeader: {
    position: "absolute",
    width: 1440,
    height: 65,
    left: 0,
    top: 0,
    background: "#000000",
  },
  promoText: {
    position: "absolute",
    width: 260,
    left: 590,
    top: 23,
    fontFamily: "'League Spartan', sans-serif",
    fontWeight: 700,
    fontSize: 20,
    lineHeight: "18px",
    textAlign: "center",
    color: "#FFFFFF",
    whiteSpace: "nowrap",
  },
  topIcons: {
    position: "absolute",
    top: 22,
    left: 1170,
    display: "flex",
    alignItems: "center",
    gap: 18,
  },
  langSelect: {
    position: "absolute",
    left: 1299,
    top: 16,
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'League Spartan', sans-serif",
    fontWeight: 400,
    fontSize: 20,
    color: "#FFFFFF",
  },
  navbar: {
    position: "absolute",
    width: 1440,
    height: 120,
    left: 0,
    top: 63,
    background: "#1E2A38",
    filter: "drop-shadow(0px 0px 5px rgba(200, 224, 212, 0.25))",
  },
  navItem: {
    position: "absolute",
    fontFamily: "'League Spartan', sans-serif",
    fontWeight: 500,
    fontSize: 24,
    lineHeight: "22px",
    textAlign: "center",
    color: "#FFFFFF",
    whiteSpace: "nowrap",
  },
  navLogo: {
    position: "absolute",
    width: 64,
    height: 64,
    left: 688,
    top: 25,
    background: "#6FA97A",
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  navSearch: {
    position: "absolute",
    left: 32,
    top: 41,
    width: 22,
    height: 22,
  },
  navCart: {
    position: "absolute",
    left: 1374,
    top: 33,
    width: 35,
    height: 35,
  },
  frameContent: {
    position: "absolute",
    width: 1440,
    height: 692,
    left: 0,
    top: 183,
    background: "#FBF0DD",
  },
  brand: {
    position: "absolute",
    left: 18,
    top: 27,
    width: 320,
    fontFamily: "'League Spartan', sans-serif",
    fontWeight: 700,
    fontSize: 52,
    lineHeight: "48px",
    color: "#E8453C",
  },
  contactHeading: {
    position: "absolute",
    width: 500,
    left: "50%",
    transform: "translateX(-50%)",
    top: 86,
    fontFamily: "'League Spartan', sans-serif",
    fontWeight: 400,
    fontSize: 64,
    lineHeight: "59px",
    textAlign: "center",
    color: "#000000",
  },
  contactCard: {
    position: "absolute",
    width: 551.92,
    height: 358.75,
    left: 444,
    top: 188,
    background: "#201F1F",
    borderRadius: 8,
    overflow: "hidden",
  },
  formSide: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 276,
    height: "100%",
  },
  formHeading: {
    position: "absolute",
    left: 27.46,
    top: 48,
    width: 196,
    fontFamily: "'League Spartan', sans-serif",
    fontWeight: 700,
    fontSize: 17.25,
    lineHeight: "16px",
    letterSpacing: "0.03em",
    color: "#FFFFFF",
  },
  fieldLabel: {
    position: "absolute",
    left: 27.46,
    fontFamily: "'Lexend Deca', sans-serif",
    fontWeight: 300,
    fontSize: 6.04,
    lineHeight: "150%",
    letterSpacing: "0.03em",
    color: "#CCC6C6",
  },
  fieldInput: {
    position: "absolute",
    left: 27.46,
    width: 217.96,
    height: 23.83,
    background: "#343333",
    border: "0.37px solid #8D8D8D",
    borderRadius: 2.2,
    padding: "0 11.76px",
    fontFamily: "'Lexend Deca', sans-serif",
    fontWeight: 500,
    fontSize: 5.15,
    color: "#FFFFFF",
    outline: "none",
  },
  fieldTextarea: {
    position: "absolute",
    left: 27.46,
    top: 232.13,
    width: 217.96,
    height: 38.92,
    background: "#343333",
    border: "0.37px solid #8D8D8D",
    borderRadius: 2.2,
    padding: "7.35px 11.76px",
    fontFamily: "'Lexend Deca', sans-serif",
    fontWeight: 300,
    fontSize: 5.15,
    color: "#FFFFFF",
    outline: "none",
    resize: "none",
  },
  errorMsg: {
    position: "absolute",
    left: 27.46,
    fontFamily: "'Lexend Deca', sans-serif",
    fontWeight: 300,
    fontSize: 5,
    color: "#FF5F5F",
  },
  sendBtn: {
    position: "absolute",
    left: 27.46,
    top: 284.01,
    width: 106.12,
    height: 20.37,
    background: "#6088EE",
    border: "none",
    borderRadius: 1.72,
    fontFamily: "'Lexend Deca', sans-serif",
    fontWeight: 300,
    fontSize: 6.04,
    letterSpacing: "0.03em",
    color: "#FFFEFE",
  },
  statusMsg: {
    position: "absolute",
    left: 27.46,
    top: 312,
    width: 217.96,
    fontFamily: "'Lexend Deca', sans-serif",
    fontSize: 6,
  },
  mapArea: {
    position: "absolute",
    width: 276,
    height: 359,
    left: 276,
    top: 0,
    background: "#313231",
  },
  mapIframe: {
    width: "100%",
    height: "100%",
    border: 0,
    filter: "grayscale(0.55) invert(0.9) contrast(0.85) brightness(0.9) hue-rotate(180deg)",
    display: "block",
  },
  mapPin: {
    position: "absolute",
    left: 137.94,
    top: 143.82,
    width: 20.7,
    height: 20.7,
    zIndex: 2,
    pointerEvents: "none",
  },
  mapAddressBox: {
    position: "absolute",
    width: 98.31,
    height: 29.75,
    left: 148.29,
    top: 164.52,
    background: "rgba(255, 255, 255, 0.78)",
    borderRadius: 1.72,
    zIndex: 2,
    pointerEvents: "none",
  },
  mapAddressText: {
    position: "absolute",
    left: 5.18,
    top: 5.18,
    width: 88,
    fontFamily: "'Lexend Deca', sans-serif",
    fontWeight: 300,
    fontSize: 5.17,
    lineHeight: "6px",
    letterSpacing: "0.03em",
    color: "#353535",
  },
  mapExpandBtn: {
    position: "absolute",
    left: 246.7,
    top: 14.7,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "rgba(237, 234, 231, 0.31)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    pointerEvents: "none",
  },
};
