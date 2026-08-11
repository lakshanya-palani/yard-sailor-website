import { useNavigate } from "react-router-dom";
import "./Hero.css";

function Hero() {
  const navigate = useNavigate();

  const handlePostSale = () => {
    navigate("/post-sale");
  };

  return (
    <section className="hero">
      <h1>
        Where neighborhood treasure gets
        <br />
        discovered
      </h1>

      <div className="hero-buttons">
        <button
          type="button"
          className="hero-button map-button"
          onClick={handlePostSale}
        >
          Post a Sale
        </button>

        <a href="/map" className="hero-button post-button">
          Find a Yard Sale
        </a>
      </div>
    </section>
  );
}

export default Hero;
