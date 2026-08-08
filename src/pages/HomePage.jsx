import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Products from "../components/Products";
import SignupPopup from "../components/SignupPopup";

function HomePage() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <Products />
      </main>

      <SignupPopup />
    </>
  );
}

export default HomePage;
