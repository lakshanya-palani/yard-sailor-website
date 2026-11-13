
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Products from "../components/Products";
import SaleMap from "../components/SaleMap";
import NearbyYardSales from "../components/NearbyYardSales";
import ScrollScene from "../components/ScrollScene";
import { LocationSearch } from "../components/listing/LocationSearch";
import { requestUserLocation } from "../utils/location";
import "./HomePage.css";

function HomePage() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  
  function handleSearch(event) {
    event.preventDefault();

    const query = location.trim();

    if (query) {
      navigate(`/find-yard-sale?q=${encodeURIComponent(query)}`);
    } else {
      navigate("/find-yard-sale");
    }
  }

  async function handleUseMyLocation() {
    if (locating) return;

    setLocating(true);
    setLocationError("");

    try {
      const userLocation = await requestUserLocation({ refresh: true });

      if (!userLocation) {
        setLocationError(
          "Unable to access your location. Try searching by city or ZIP code."
        );
        return;
      }

      navigate("/find-yard-sale", {
        state: { requestedLocation: userLocation },
      });
    } catch (error) {
      console.error("Location request failed:", error);
      setLocationError(
        "Unable to access your location. Try searching by city or ZIP code."
      );
    } finally {
      setLocating(false);
    }
  }

  return (
    <main className="home-page">
      <div className="home-page-layout">
        <div className="home-main-content">
      
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

            <LocationSearch
              value={location}
              onChange={setLocation}
              onSubmit={handleSearch}
              onUseLocation={handleUseMyLocation}
              locating={locating}
              error={locationError}
              placeholder="City, ZIP code, or address"
              label="Search yard sales by location"
              searchLabel="Find Yard Sales"
            />
            
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


        </div>

        {/* Advertisement sidebar */}
        <aside
          className="home-ad-sidebar"
          aria-label="Future advertisement spaces"
        >
          <div className="home-ad-slot">
            <span className="home-ad-label">ADVERTISEMENT</span>
            <div className="home-ad-placeholder">
              <span>Advertisement Space</span>
              <small>Local businesses and promotions</small>
            </div>
          </div>

          <div className="home-ad-slot">
            <span className="home-ad-label">ADVERTISEMENT</span>
            <div className="home-ad-placeholder">
              <span>Advertisement Space</span>
              <small>Sponsored listings and local deals</small>
            </div>
          </div>
        </aside>
      
      </div>
    </main>
  );
}

export default HomePage;
