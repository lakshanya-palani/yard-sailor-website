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
        <a href="/post-sale" className="hero-button map-button">
          Post a Sale
        </a>

        <a href="/map" className="hero-button post-button">
          Find a Sale
        </a>
      </div>
    </section>
  );
}

export default Hero;