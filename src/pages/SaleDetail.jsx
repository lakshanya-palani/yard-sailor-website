import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { calculateDistanceMiles, requestUserLocation } from "../utils/location";
import "./SaleDetail.css";

function SaleDetail() {
  const { id } = useParams();
  const [sale, setSale] = useState(null);
  const [seller, setSeller] = useState(null);
  const [distance, setDistance] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSale() {
      const { data, error } = await supabase.from("sales").select("*").eq("id", id).maybeSingle();
      if (error) console.error("Unable to load yard sale:", error);
      if (!data || error) {
        setLoading(false);
        return;
      }
      setSale(data);

      const [{ data: sellerData, error: sellerError }, location] = await Promise.all([
        supabase.from("profiles").select("username, avatar_url").eq("id", data.host_id).maybeSingle(),
        requestUserLocation(),
      ]);
      if (sellerError) console.error("Unable to load yard sale host:", sellerError);
      setSeller(sellerData || null);
      if (location) setDistance(calculateDistanceMiles(location.latitude, location.longitude, data.lat, data.lng));
      setLoading(false);
    }
    loadSale();
  }, [id]);

  if (loading) return <main className="yard-sale-detail-page"><p className="yard-sale-detail-status">Loading yard sale...</p></main>;
  if (!sale) return <main className="yard-sale-detail-page"><div className="yard-sale-detail-card"><h1>Yard sale not found</h1><Link to="/">Return home</Link></div></main>;

  const images = sale.images || [];
  const sellerName = seller?.username?.trim() || "Yard Sailor host";
  const initial = seller?.username?.trim()?.charAt(0).toUpperCase() || "Y";

  return (
    <main className="yard-sale-detail-page">
      <div className="yard-sale-detail-layout">
        <section className="yard-sale-gallery">
          <div className="yard-sale-main-image">{images[imageIndex] ? <img src={images[imageIndex]} alt={`${sale.title} image ${imageIndex + 1}`} /> : <span>No image available</span>}</div>
          {images.length > 1 && <div className="yard-sale-thumbnails">{images.map((image, index) => <button type="button" className={index === imageIndex ? "selected" : ""} key={image} onClick={() => setImageIndex(index)} aria-label={`Show yard sale image ${index + 1}`}><img src={image} alt={`${sale.title} thumbnail ${index + 1}`} /></button>)}</div>}
        </section>
        <section className="yard-sale-detail-card">
          <p className="yard-sale-detail-eyebrow">YARD SALE</p>
          <h1>{sale.title}</h1>
          {distance != null && <p className="yard-sale-distance">{distance.toFixed(1)} miles away</p>}
          <div className="yard-sale-detail-meta"><div><strong>Address</strong><span>{sale.address}</span></div><div><strong>Starts</strong><span>{sale.start_time ? new Date(sale.start_time).toLocaleString() : "Not specified"}</span></div><div><strong>Ends</strong><span>{sale.end_time ? new Date(sale.end_time).toLocaleString() : "Not specified"}</span></div></div>
          <div className="yard-sale-description"><h2>About this yard sale</h2><p>{sale.description}</p></div>
          <div className="yard-sale-host"><span>{seller?.avatar_url ? <img src={seller.avatar_url} alt="" /> : initial}</span><div><small>Hosted by</small><strong>{sellerName}</strong></div></div>
        </section>
      </div>
    </main>
  );
}

export default SaleDetail;
