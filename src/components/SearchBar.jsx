import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SearchBar.css";

function SearchBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();

    if (!searchTerm.trim()) {
      return;
    }

    navigate(`/shop?search=${encodeURIComponent(searchTerm.trim())}`);

    setSearchOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="search-container" ref={searchRef}>
      <button
        className="search-button"
        type="button"
        aria-label="Search"
        onClick={() => setSearchOpen(!searchOpen)}
      >
        <img src="/images/search.svg" alt="" />
      </button>

      {searchOpen && (
        <form className="search-box" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            autoFocus
          />

          <button type="submit" className="search-submit">
            Search
          </button>
        </form>
      )}
    </div>
  );
}

export default SearchBar;