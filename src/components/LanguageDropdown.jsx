import { useState } from "react";
import "./LanguageDropdown.css";

function LanguageDropdown() {
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState("English");

  const languages = [
    "English",
    "Spanish",
    "French",
    "German",
    "Portuguese",
    "Chinese",
    "Japanese",
    "Korean",
  ];

  return (
    <div className="language-menu">
      <button
        className="language-selector"
        type="button"
        aria-haspopup="menu"
        aria-expanded={languageOpen}
        onClick={() => setLanguageOpen((isOpen) => !isOpen)}
      >
        <span>{language}</span>

        <span
          className={`language-arrow ${
            languageOpen ? "arrow-up" : ""
          }`}
        />
      </button>

      {languageOpen && (
        <div className="language-dropdown" role="menu">
          {languages.map((item) => (
            <button
              key={item}
              type="button"
              role="menuitem"
              onClick={() => {
                setLanguage(item);
                setLanguageOpen(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageDropdown;
