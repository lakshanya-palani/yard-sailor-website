import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import SailEntryScene from "./SailEntryScene";
import "./Hero.css";

export default function Hero({ products = [] }) {
  const entryRef = useRef(null);
  useEffect(() => {
    const entry = entryRef.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cleanup = () => {};
    const setup = () => {
      cleanup();
      entry.style.removeProperty("--sail-progress");
      entry.style.removeProperty("--sail-load");
      entry.removeAttribute("data-sailing");
      if (preference.matches) return;

      let frame = 0;
      let visible = false;
      let start = 0;
      let distance = 1;
      const update = () => {
        frame = 0;
        const progress = Math.min(1, Math.max(0, (window.scrollY - start) / distance));
        entry.style.setProperty("--sail-progress", progress.toFixed(4));
        entry.style.setProperty("--sail-load", Math.min(1, Math.max(0, (progress - .6) / .35)).toFixed(4));
        if (entry.hasAttribute("data-sailing") !== (progress < .95)) {
          entry.toggleAttribute("data-sailing", progress < .95);
        }
      };
      const request = () => {
        if (visible && !frame) frame = requestAnimationFrame(update);
      };
      // Cache geometry on resize; no layout reads or React renders on scroll.
      const measure = () => {
        const rect = entry.getBoundingClientRect();
        start = rect.top + window.scrollY;
        distance = Math.max(1, rect.height - window.innerHeight * .65);
        request();
      };
      const observer = new IntersectionObserver(([item]) => {
        visible = item.isIntersecting;
        if (visible) request();
        else update(); // Settle arrival even when a fast scroll skips the intro.
      });
      const resize = new ResizeObserver(measure);
      observer.observe(entry);
      resize.observe(entry);
      measure();
      window.addEventListener("scroll", request, { passive: true });
      window.addEventListener("resize", measure);
      cleanup = () => {
        observer.disconnect();
        resize.disconnect();
        cancelAnimationFrame(frame);
        window.removeEventListener("scroll", request);
        window.removeEventListener("resize", measure);
      };
    };
    setup();
    preference.addEventListener("change", setup);
    return () => { cleanup(); preference.removeEventListener("change", setup); };
  }, []);

  return (
    <section className="hero-opening" ref={entryRef} aria-labelledby="entry-title">
      <div className="hero-entry">
        <div className="hero-copy">
          <div className="entry-heading">
            <p className="hero-eyebrow">YARD SAILOR</p>
            <h1 id="entry-title">Find what’s<br /><span>around the corner.</span></h1>
            <p className="hero-description">Discover local yard sales and secondhand finds nearby.</p>
          </div>
          <div className="hero-buttons">
            <Link to="/find-yard-sale" className="hero-button map-button">Find a Yard Sale</Link>
            <Link to="/shop" className="hero-button post-button">Shop</Link>
          </div>
          <p className="hero-post">Have something to pass on? <Link to="/post-sale">Post a Sale ↗</Link></p>
        </div>
        <SailEntryScene products={products} />
        <div className="sail-loading" aria-hidden="true">
          <span>Entering Yard Sailor…</span>
          <div className="sail-progress-track"><span /></div>
        </div>
        <a href="#home-products" className="hero-scroll">Sail toward your next find <span aria-hidden="true">↓</span></a>
      </div>
    </section>
  );
}
