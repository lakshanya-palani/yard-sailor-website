import "./Hero.css";

function Hero() {
  return (
    <section className="hero">
      <h1>
        Where neighborhood treasure gets
        <br />
        discovered
      </h1>

      <div className="hero-buttons">
        <a href="/post-sale" className="hero-button post-button">
          Post a Sale
        </a>

        <a href="/map" className="hero-button map-button">
          Browse the Map
        </a>
      </div>
    </section>
  );
}

export default Hero;