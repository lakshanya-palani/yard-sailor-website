import { useState } from "react";
import { Globe2 } from "lucide-react";
import SelectField from "./SelectField";
import "./LanguageDropdown.css";

export default function LanguageDropdown() {
  const [language, setLanguage] = useState("English");
  return <div className="language-wrap"><div className="language-control">
    <Globe2 size={22} strokeWidth={2} aria-hidden="true" />
    <span className="sr-only">Language preference (site translation is not yet available)</span>
    <SelectField className="language-select" menuVariant="language" aria-label="Language preference (site translation is not yet available)" value={language} onChange={event => setLanguage(event.target.value)} title="Language preference only; translations are not yet available">
      {["English", "Spanish", "French", "German", "Portuguese", "Chinese", "Japanese", "Korean"].map(item => <option key={item}>{item}</option>)}
    </SelectField>
  </div>{language !== "English" && <span className="language-note" role="status">Translation is not available yet.</span>}</div>;
}
