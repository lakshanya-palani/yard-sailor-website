import { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./SearchBar.css";

export default function SearchBar({ onFocus }) {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  function handleSearch(event) {
    event.preventDefault();
    const query = searchTerm.trim();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
    setSearchTerm("");
  }

  return <form className="header-search" role="search" onSubmit={handleSearch}>
    <input type="search" aria-label="Search products" placeholder="Search secondhand finds..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} onFocus={onFocus} />
    <button type="submit" aria-label="Search products"><Search size={20} strokeWidth={2} aria-hidden="true" /></button>
  </form>;
}
