import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./AccountPages.css";

function MyYardSales() {
  const [sales, setSales] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSales() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        console.error("Unable to load yard sale host:", authError);
        setLoading(false);
        return;
      }
      setUser(authData.user);

      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("host_id", authData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Unable to load yard sales:", error);
        alert(error.message);
      } else {
        setSales(data || []);
      }
      setLoading(false);
    }
    loadSales();
  }, []);

  async function cancelYardSale(sale) {
    if (!user || !window.confirm("Are you sure you want to cancel this yard sale?")) return;

    const { error } = await supabase
      .from("sales")
      .update({ status: "cancelled" })
      .eq("id", sale.id)
      .eq("host_id", user.id);

    if (error) {
      console.error("Unable to cancel yard sale:", error);
      alert(error.message);
      return;
    }
    setSales((items) => items.map((item) => item.id === sale.id ? { ...item, status: "cancelled" } : item));
  }

  return (
    <main className="account-page">
      <div className="account-container">
        <div className="account-heading"><h1>My Yard Sale Listings</h1><p>Manage the yard sale events you host.</p><Link className="account-button" to="/post-yard-sale">Post a Yard Sale</Link></div>
        {loading ? <p className="account-status">Loading your yard sales...</p> : sales.length === 0 ? (
          <div className="account-placeholder-card"><h2>No yard sales yet</h2><p className="account-empty">Your hosted yard sale events will appear here.</p></div>
        ) : (
          <div className="account-grid">
            {sales.map((sale) => (
              <article className="account-card" key={sale.id}>
                <div className="account-card-body">
                  <h2>{sale.title}</h2>
                  <p><strong>{sale.address}</strong></p>
                  <p className="account-card-meta">{sale.start_time ? new Date(sale.start_time).toLocaleString() : "Date not set"}</p>
                  <p className="account-card-meta">Status: {sale.status || "upcoming"}</p>
                  <p>{sale.description}</p>
                  <div className="account-actions">
                    <Link className="account-button-secondary" to={`/yard-sales/${sale.id}/edit`}>Edit</Link>
                    {sale.status !== "cancelled" && <button className="account-button-danger" type="button" onClick={() => cancelYardSale(sale)}>Cancel Yard Sale</button>}
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

export default MyYardSales;
