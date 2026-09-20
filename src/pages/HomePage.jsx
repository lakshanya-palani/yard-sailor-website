
import Products from "../components/Products";
import SaleMap from "../components/SaleMap";
import NearbyYardSales from "../components/NearbyYardSales";
import ScrollScene from "../components/ScrollScene";
import SailingHero from "../components/SailingHero";
import "./HomePage.css";

function HomePage() {
  return (
    <main className="home-page">
      <SailingHero />

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

      <ScrollScene>
        <div className="home-map-heading scene-reveal">
          <p>MAKE A LOCAL DETOUR</p>
          <h2>Your neighborhood. A new discovery.</h2>
        </div>
        <div className="scene-reveal">
          <SaleMap className="homepage-sale-map" />
        </div>
      </ScrollScene>
    </main>
  );
}

export default HomePage;