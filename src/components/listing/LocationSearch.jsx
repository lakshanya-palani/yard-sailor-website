import { useId } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "../ui/Button";
import { FormAlert } from "../ui/FormAlert";
import { TextInput } from "../ui/TextInput";
import "./LocationSearch.css";

/**
 * City / ZIP / address search with a "Use my location" shortcut.
 * Presentation only: the page owns geocoding and geolocation.
 * `onChange` receives the input's new string value; `onSubmit` the form submit event
 * (the page calls preventDefault). `searching` / `locating` show busy buttons.
 */
export function LocationSearch({
  value,
  onChange,
  onSubmit,
  onUseLocation,
  searching = false,
  searchLabel = "Search",
  locating = false,
  error,
  placeholder = "Search city, ZIP code, or address",
  label = "Search yard sales by city, ZIP code, or address",
  className,
}) {
  const errorId = useId();
  return (
    <div className={["listing-location-search", className].filter(Boolean).join(" ")}>
      <form className="listing-location-search__form" onSubmit={onSubmit} role="search">
        <TextInput
          className="listing-location-search__input"
          leadingIcon={<MapPin size={18} />}
          value={value}
          onChange={event => onChange?.(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          aria-describedby={error ? errorId : undefined}
          enterKeyHint="search"
        />
        <div className="listing-location-search__buttons">
          <Button type="submit" variant="dark" loading={searching}>{searching ? "Searching…" : searchLabel}</Button>
          {onUseLocation && (
            <Button variant="secondary" icon={<LocateFixed size={18} />} loading={locating} onClick={onUseLocation}>
              {locating ? "Finding your location…" : "Use my location"}
            </Button>
          )}
        </div>
      </form>
      {error && <div id={errorId}><FormAlert className="listing-location-search__error">{error}</FormAlert></div>}
    </div>
  );
}
