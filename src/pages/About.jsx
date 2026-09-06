import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ScrollScene from "../components/ScrollScene";
import MarketplaceVisual from "../components/MarketplaceVisual";
import "../components/Hero.css";
import "./About.css";

export default function About() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    let active = true;
    supabase.from("products").select("id, title, price, image_urls").order("created_at", { ascending: false }).limit(3)
      .then(({ data }) => { if (active) setProducts(data || []); });
    return () => { active = false; };
  }, []);
  return <main className="about-page">
    <ScrollScene><section className="about-hero about-width">
      <div className="scene-reveal"><p className="about-label">ABOUT YARD SAILOR</p>
        <h1>Yard sales,<br /><span>easier to discover.</span></h1>
        <p className="about-intro">Good things don’t always need to come from somewhere new. Sometimes they’re waiting a few streets over.</p>
      </div>
      <div className="about-opening-note scene-layer"><img src="/images/logo_bubble_green.png" alt="" /><p>We bring local yard sales and secondhand listings into one place, so you can spend less time looking for where to go and more time finding something worth bringing home.</p><a href="#about-discover">Take a look around ↓</a></div>
    </section></ScrollScene>

    <ScrollScene id="about-discover"><section className="about-story about-width">
      <div className="about-story-visual"><MarketplaceVisual products={products} /></div>
      <div className="about-story-copy scene-reveal"><p className="about-label">01 / DISCOVER</p><h2>Less driving around.<br />More finding your way.</h2><p>Find local yard sales before you head out. Explore the map, check the sale details, and choose your next stop.</p><Link className="about-text-link" to="/find-yard-sale">Find a Yard Sale ↗</Link></div>
    </section></ScrollScene>

    <ScrollScene><section className="about-story about-story-reverse about-width">
      <div className="about-story-copy scene-reveal"><p className="about-label">02 / SHOP SECONDHAND</p><h2>Someone’s letting go.<br />You’re just finding it.</h2><p>A chair for your reading corner. Something for a new hobby. Browse what local sellers have posted, see the details, and find an item that fits your life.</p><Link className="about-text-link" to="/shop">Shop the latest finds ↗</Link></div>
      <div className="about-featured scene-layer">
        {products[0] ? <Link to={`/products/${products[0].id}`}>{products[0].image_urls?.[0] && <img src={products[0].image_urls[0]} alt={products[0].title} loading="lazy" decoding="async" />}<div><span>FROM THE MARKETPLACE</span><strong>{products[0].title}</strong><span>${Number(products[0].price).toFixed(2)} · View item ↗</span></div></Link> : <div className="about-featured-fallback"><span>SECONDHAND. STILL FULL OF POSSIBILITY.</span><strong>The next chapter<br />could be yours.</strong><Link to="/shop">Explore the shop ↗</Link></div>}
      </div>
    </section></ScrollScene>

    <ScrollScene><section className="about-host about-width">
      <div className="about-host-sign scene-layer"><span>MAKE ROOM FOR</span><strong>what’s<br />next.</strong><span>PASS SOMETHING GOOD ON.</span></div>
      <div className="about-story-copy scene-reveal"><p className="about-label">03 / POST YOUR SALE</p><h2>Open your yard.<br />Invite the neighborhood.</h2><p>Clearing out the garage or making room at home? Add your sale’s photos, location, and time so people nearby can find you.</p><Link className="about-text-link" to="/post-yard-sale">Post a Yard Sale ↗</Link></div>
    </section></ScrollScene>

    <ScrollScene className="about-mission"><section className="about-width scene-reveal"><p className="about-label">WHY WE’RE HERE</p><h2>Keep useful things<br />in circulation.<br /><span>Keep discovery local.</span></h2><p>A good item deserves another chapter. Yard Sailor helps neighbors find what others are ready to pass on, making it easier to shop secondhand and keep useful things in use.</p></section></ScrollScene>
    <section className="about-cta about-width"><p className="about-label">COME ON OVER</p><h2>See what’s around<br />the corner.</h2><div className="hero-buttons"><Link className="hero-button map-button" to="/find-yard-sale">Find a Yard Sale</Link><Link className="hero-button post-button" to="/shop">Shop</Link></div></section>
  </main>;
}
