import Hero from "../components/Hero";
import Products from "../components/Products";
// import SignupPopup from "../components/SignupPopup";
import SaleMap from "../components/SaleMap";
import NearbyYardSales from "../components/NearbyYardSales";
import { useState } from "react";
import ScrollScene from "../components/ScrollScene";
import "./HomePage.css";

function HomePage() {
  const [products, setProducts] = useState([]);
  return (
    <>
      <main className="home-page">
        <Hero products={products} />

        <ScrollScene id="home-products" className="home-products"><div className="scene-reveal"><Products onProductsLoaded={setProducts} /></div></ScrollScene>

        <ScrollScene><div className="scene-reveal"><NearbyYardSales /></div></ScrollScene>

        <ScrollScene><div className="home-map-heading scene-reveal"><p>MAKE A LOCAL DETOUR</p><h2>Your neighborhood. A new discovery.</h2></div><div className="scene-reveal"><SaleMap className="homepage-sale-map" /></div></ScrollScene>
      </main>

      {/* <SignupPopup /> */} {/* Remove sign pop up for now */}
    </>
  );
}

export default HomePage;
