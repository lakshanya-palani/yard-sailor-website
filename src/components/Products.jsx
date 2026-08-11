import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Products.css";

function Products() {
  const [sales, setSales] = useState([]);
  const navigate = useNavigate();

  const loadSales = () => {
    const storedSales =
      JSON.parse(localStorage.getItem("yardSailorSales")) || [];

    setSales(storedSales);
  };

  useEffect(() => {
    loadSales();

    window.addEventListener(
      "yardSailorSalesUpdated",
      loadSales
    );

    window.addEventListener("storage", loadSales);

    return () => {
      window.removeEventListener(
        "yardSailorSalesUpdated",
        loadSales
      );

      window.removeEventListener("storage", loadSales);
    };
  }, []);

  const cancelSale = (id) => {
    const updatedSales = sales.filter(
      (sale) => sale.id !== id
    );

    localStorage.setItem(
      "yardSailorSales",
      JSON.stringify(updatedSales)
    );

    setSales(updatedSales);
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
            className="product-card"
            key={sale.id}
          >
            <div className="product-image-container">
              <img
                src={sale.images[0]}
                alt={sale.title}
                className="product-image"
              />
            </div>

            <div className="product-information">
              <h3>{sale.title}</h3>

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

              <button
                type="button"
                className="cancel-sale-button"
                onClick={() => cancelSale(sale.id)}
              >
                Cancel Sale
              </button>
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