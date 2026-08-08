import "./Products.css";

const products = [
  { id: 1, name: "Product 1", image: "/images/product-1.jpg" },
  { id: 2, name: "Product 2", image: "/images/product-2.jpg" },
  { id: 3, name: "Product 3", image: "/images/product-3.jpg" },
  { id: 4, name: "Product 4", image: "/images/product-4.jpg" },
  { id: 5, name: "Product 5", image: "/images/product-5.jpg" },
  { id: 6, name: "Product 6", image: "/images/product-6.jpg" },
  { id: 7, name: "Product 7", image: "/images/product-7.jpg" },
  { id: 8, name: "Product 8", image: "/images/product-8.jpg" },
  { id: 9, name: "Product 9", image: "/images/product-9.jpg" },
  { id: 10, name: "Product 10", image: "/images/product-10.jpg" },
];

function Products() {
  return (
    <section className="products-section">
      <h2 className="products-title">
        // NEWEST SAILOR PRODUCTS!
      </h2>

      <div className="products-grid">
        {products.map((product) => (
          <a
            href={`/shop/${product.id}`}
            className="product-card"
            key={product.id}
          >
            <img src={product.image} alt={product.name} />
          </a>
        ))}
      </div>

      <a href="/shop" className="view-all-button">
        VIEW ALL
      </a>
    </section>
  );
}

export default Products;