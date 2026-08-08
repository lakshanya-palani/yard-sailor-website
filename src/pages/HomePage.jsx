import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Products from "../components/Products";
import SignupPopup from "../components/SignupPopup";
import SaleMap from "../components/SaleMap";

function HomePage() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <Products />
        <h2
          style={{
            textAlign: "center",
            fontFamily: "sans-serif",
            marginTop: "2rem",
            marginBottom: "1rem",
          }}
        >
          MAP!
        </h2>
        <SaleMap />
      </main>

      <SignupPopup />
    </>
  );
}

export default HomePage;