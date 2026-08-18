import Hero from "../components/Hero";
import Products from "../components/Products";
import SignupPopup from "../components/SignupPopup";
import SaleMap from "../components/SaleMap";
import NearbyYardSales from "../components/NearbyYardSales";

function HomePage() {
  return (
    <>
      <main>
        <Hero />

        <Products />

        <NearbyYardSales />

        <SaleMap className="homepage-sale-map" />
      </main>

      <SignupPopup />
    </>
  );
}

export default HomePage;
