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
        onClick={() => setLanguageOpen(!languageOpen)}
      >
        <span>{language}</span>

        <span
          className={`language-arrow ${
            languageOpen ? "arrow-up" : ""
          }`}
        />
      </button>

      {languageOpen && (
        <div className="language-dropdown">
          {languages.map((item) => (
            <button
              key={item}
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