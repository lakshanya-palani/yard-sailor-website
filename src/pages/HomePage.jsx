import Hero from "../components/Hero";
import Products from "../components/Products";
import SignupPopup from "../components/SignupPopup";
import SaleMap from "../components/SaleMap";

function HomePage() {
  return (
    <>
      <main>
        <Hero />

        <Products />

        <h2
          style={{
            textAlign: "center",
            fontFamily: "league-spartan",
            marginTop: "2rem",
            marginBottom: "1rem",
          }}
        >
          Nearby Yard Sales!
        </h2>

        <SaleMap />
      </main>

      <SignupPopup />
    </>
  );
}

export default HomePage;