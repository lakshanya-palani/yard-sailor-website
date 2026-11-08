
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Products from "../components/Products";
import SaleMap from "../components/SaleMap";
import NearbyYardSales from "../components/NearbyYardSales";
import ScrollScene from "../components/ScrollScene";
import "./HomePage.css";

function HomePage() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");

  function handleSearch(event) {
    event.preventDefault();

    const query = location.trim();

    if (query) {
      navigate(`/find-yard-sale?q=${encodeURIComponent(query)}`);
    } else {
      navigate("/find-yard-sale");
    }
  }

  return (
    <main className="home-page">

      {/* Homepage yard sale finder */}
      <section className="home-yard-sale-finder">
        <div className="home-finder-content">
          <p className="home-finder-eyebrow">
            EXPLORE YOUR NEIGHBORHOOD
          </p>

          <h1>Find Your Next Yard Sale</h1>

          <p className="home-finder-description">
            Discover nearby yard sales, hidden treasures,
            and unique finds in your community.
          </p>

          <form
            className="home-finder-search"
            onSubmit={handleSearch}
          >
            <input
              type="text"
              value={location}
              onChange={(event) =>
                setLocation(event.target.value)
              }
              placeholder="City, ZIP code, or address"
              aria-label="Search yard sales by location"
            />

            <button type="submit">
              Find Yard Sales
            </button>
          </form>
        </div>

        <div className="home-finder-map">
          <SaleMap className="homepage-sale-map" />
        </div>
      </section>

      {/* Existing homepage content */}
      <ScrollScene id="home-products" className="home-products">
        <div className="scene-reveal">
          <Products previewLimit={5} />
        </div>
      </ScrollScene>

      <ScrollScene>
        <div className="scene-reveal">
          <NearbyYardSales />
        </div>
      </ScrollScene>

    </main>
  );
}

export default HomePage;
