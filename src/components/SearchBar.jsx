import { useState } from "react";
import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "./SearchBar.css";

export default function SearchBar({ onFocus }) {
  const [draft, setDraft] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const key = `${location.pathname}${location.search}`;
  const params = new URLSearchParams(location.search);
  const searchTerm = draft?.key === key ? draft.value : location.pathname === "/shop" ? (params.get("q") ?? params.get("search") ?? "") : "";

  function handleSearch(event) {
    event.preventDefault();
    const query = searchTerm.trim();
    const params = location.pathname === "/shop" ? new URLSearchParams(location.search) : new URLSearchParams();
    params.delete("search");
    if (query) params.set("q", query); else params.delete("q");
    const suffix = params.toString();
    navigate(suffix ? `/shop?${suffix}` : "/shop");
    setDraft(null);
  }

  return <form className="header-search" role="search" onSubmit={handleSearch}>
    <input type="search" aria-label="Search products" placeholder="Search secondhand finds..." value={searchTerm} onChange={event => setDraft({ key, value: event.target.value })} onFocus={onFocus} />
    <button type="submit" aria-label="Search products"><Search size={20} strokeWidth={2} aria-hidden="true" /></button>
  </form>;
}
