import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./AccountPages.css";

function MyPostings() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPostings() {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        console.error("Unable to load posting owner:", authError);
        setLoading(false);
        return;
      }

      setUser(authData.user);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Unable to load postings:", error);
        alert(error.message);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    }

    loadPostings();
  }, []);

  async function cancelPosting(product) {
    if (!user || !window.confirm("Are you sure you want to cancel this posting?")) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Unable to cancel posting:", error);
      alert(error.message);
      return;
    }

    setProducts((items) => items.filter((item) => item.id !== product.id));
    window.dispatchEvent(new Event("yardSailorProductsUpdated"));
  }

  return (
    <main className="account-page">
      <div className="account-container">
        <div className="account-heading">
          <h1>My Postings</h1>
          <p>Manage the individual marketplace items you have posted.</p>
        </div>

        {loading ? (
          <p className="account-status">Loading your postings...</p>
        ) : products.length === 0 ? (
          <div className="account-placeholder-card">
            <h2>No postings yet</h2>
            <p className="account-empty">Your marketplace products will appear here.</p>
            <Link className="account-button" to="/post-sale">Post a Sale</Link>
          </div>
        ) : (
          <div className="account-grid">
            {products.map((product) => (
              <article className="account-card" key={product.id}>
                <img
                  className="account-card-image"
                  src={product.image_urls?.[0]}
                  alt={product.title}
                />
                <div className="account-card-body">
                  <h2>{product.title}</h2>
                  <p className="account-price">${Number(product.price).toFixed(2)}</p>
                  <p className="account-card-meta">
                    {[product.brand, product.condition].filter(Boolean).join(" · ")}
                  </p>
                  <div className="account-tags">
                    {product.pickup && <span>Pickup</span>}
                    {product.shipping && <span>Shipping</span>}
                  </div>
                  <div className="account-actions">
                    <Link className="account-button-secondary" to={`/products/${product.id}/edit`}>
                      Edit
                    </Link>
                    <button className="account-button-danger" type="button" onClick={() => cancelPosting(product)}>
                      Cancel Posting
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default MyPostings;
