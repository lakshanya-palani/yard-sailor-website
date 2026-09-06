import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./products.css";

function Products({ onProductsLoaded }) {
  const [sales, setSales] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    onProductsLoaded?.(sales);
  }, [sales, onProductsLoaded]);

  const loadSales = useCallback(async () => {
    const [{ data, error }, { data: authData }] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.auth.getSession(),
    ]);

    if (error) {
      console.error("Unable to load sales:", error);
      setSales([]);
    } else {
      setSales(data || []);
    }

    setCurrentUserId(authData?.session?.user?.id || null);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadSales, 0);

    window.addEventListener(
      "yardSailorProductsUpdated",
      loadSales
    );

    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(
        "yardSailorProductsUpdated",
        loadSales
      );
    };
  }, [loadSales]);

  const cancelSale = async (sale) => {
    if (!currentUserId || sale.user_id !== currentUserId) {
      alert("Only the seller can cancel this sale.");
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", sale.id)
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Unable to cancel sale:", error);
      alert(error.message);
      return;
    }

    setSales((currentSales) =>
      currentSales.filter((currentSale) => currentSale.id !== sale.id)
    );
  };

  const placeholdersNeeded = Math.max(
    0,
    10 - sales.slice(0, 10).length
  );

  const placeholders = Array.from(
    { length: placeholdersNeeded },
    (_, index) => index
  );

  return (
    <section className="products-section">
      <div className="products-heading">
        <h2>Newest Sailor Products</h2>
      </div>

      <div className="products-grid">
        {sales.slice(0, 10).map((sale) => (
          <article
            className="product-card real-product-card"
            key={sale.id}
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/products/${sale.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/products/${sale.id}`);
              }
            }}
          >
            <div className="product-image-container">
              <img
                src={sale.image_urls?.[0]}
                alt={sale.title}
                className="product-image"
              />
            </div>

            <div className="product-information">
              <h3>{sale.title}</h3>

              <p className="product-price">
                ${Number(sale.price).toFixed(2)}
              </p>

              {(sale.brand || sale.condition) && (
                <p className="product-meta">
                  {[sale.brand, sale.condition].filter(Boolean).join(" · ")}
                </p>
              )}

              <p className="product-description">
                {sale.description}
              </p>

              <div className="delivery-tags">
                {sale.pickup && (
                  <span>Pickup</span>
                )}

                {sale.shipping && (
                  <span>Shipping</span>
                )}
              </div>

              {sale.user_id === currentUserId && (
                <button
                  type="button"
                  className="cancel-sale-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    cancelSale(sale);
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  Cancel Sale
                </button>
              )}
            </div>
          </article>
        ))}

        {placeholders.map((placeholder) => (
          <article
            className="product-card placeholder-card"
            key={`placeholder-${placeholder}`}
          >
            <div className="product-image-container placeholder-image">
              <span>Coming Soon</span>
            </div>

            <div className="product-information">
              <div className="placeholder-line placeholder-title"></div>

              <div className="placeholder-line"></div>

              <div className="placeholder-line short"></div>

              <div className="placeholder-tags">
                <span></span>
                <span></span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="view-all-container">
        <button
          type="button"
          className="view-all-button"
          onClick={() => navigate("/shop")}
        >
          View All
        </button>
      </div>
    </section>
  );
}

export default Products;
