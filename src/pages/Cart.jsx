import { startCheckout, checkoutDestination, PaymentError } from "../lib/payments";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { commerceError, money, rpc, startConversation } from '../lib/commerce';
import './Commerce.css';

export default function Cart({ checkout = false }) {
  const { remove, userId } = useCart();
  const [params] = useSearchParams();
  const productId = checkout ? params.get('product') : null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [selection, setSelection] = useState(null);
  const version = useRef(0);
  const navigate = useNavigate();
  const load = useCallback(async () => {
    const current = ++version.current;
    setLoading(true); setError('');
    try {
      const rows = await rpc('review_product_checkout', { p_product_id: productId || null });
      if (current === version.current) setItems(rows || []);
    } catch (e) { if (current === version.current) { setError(commerceError(e)); setItems([]); } }
    finally { if (current === version.current) setLoading(false); }
  }, [productId, userId]);
  useEffect(() => { load(); window.addEventListener('focus', load); return () => { version.current++; window.removeEventListener('focus', load); }; }, [load]);
  async function act(item, action) {
    if (busy) return;
    setBusy(item.product_id); setError('');
    try {
      if (action === 'remove') { await remove(item.product_id); setItems(current => current.filter(row => row.product_id !== item.product_id)); }
      else { const id = await startConversation(item.product_id); navigate(`/messages?conversation=${id}`); }
    } catch (e) { setError(commerceError(e)); }
    finally { setBusy(null); }
  }
  const selected = items.filter(item => item.available && (selection === null || selection.includes(item.product_id)));
  async function pay() {
    if (busy || !selected.length) return;
    setBusy('checkout'); setError('');
    try { checkoutDestination(await startCheckout(selected.map(item => item.product_id), productId ? 'buy_now' : 'cart'), navigate); }
    catch (e) { setError(e instanceof PaymentError ? e.message : commerceError(e)); }
    finally { setBusy(null); }
  }
  function toggle(id) { setSelection(current => { const ids = current ?? items.filter(item => item.available).map(item => item.product_id); return ids.includes(id) ? ids.filter(value => value !== id) : [...ids,id]; }); }
  const unavailable = selected.length === 0;
  const subtotal = selected.reduce((sum, item) => sum + Number(item.price), 0);
  return <main className="commerce-page"><div className="commerce-width">
    <Link to={checkout ? '/cart' : '/shop'}>{checkout ? '← Your cart' : '← Shop'}</Link>
    <h1>{checkout ? 'Review your items' : 'Your cart'}</h1><p><Link to="/orders">Your orders and pending checkouts →</Link></p>
    {error && <div className="commerce-error" role="alert">{error} <button onClick={load}>Try again</button></div>}
    {loading ? <p role="status">Loading your items…</p> : error && items.length === 0 ? null : items.length === 0 ? <div className="commerce-panel"><h2>{checkout ? 'No items to review' : 'Your cart is empty'}</h2><p>Find something worth bringing home.</p><Link to="/shop">Explore the shop ↗</Link></div> : <div className="cart-layout">
      <div className="cart-items">{items.map(item => <article className="cart-item commerce-panel" key={item.product_id}>
        {item.available ? <Link to={`/products/${item.product_id}`} className="cart-cover">{item.image_url ? <img src={item.image_url} alt={item.title} /> : <span>No image</span>}</Link> : <div className="cart-cover">Unavailable</div>}
        <div>{item.available && !productId && <label className="cart-select"><input type="checkbox" checked={selected.some(row => row.product_id === item.product_id)} onChange={() => toggle(item.product_id)} disabled={!!busy} /> Select {item.title}</label>}<h2>{item.available ? <Link to={`/products/${item.product_id}`}>{item.title}</Link> : 'Listing unavailable'}</h2>
          <p>{item.available ? money(item.price) : 'Remove this item before checkout.'}</p><p className="commerce-muted">{item.seller_name ? `Sold by ${item.seller_name}` : ''}</p>
          {checkout ? item.available && <button disabled={!!busy} onClick={() => act(item,'message')}>Message Seller</button> : <button disabled={!!busy} onClick={() => act(item,'remove')}>{busy === item.product_id ? 'Removing…' : 'Remove'}</button>}
        </div>
      </article>)}</div>
      <aside className="commerce-panel cart-summary"><h2>{checkout ? 'Order review' : 'Summary'}</h2><p className="cart-subtotal"><span>Subtotal</span><strong>{money(subtotal)}</strong></p><p className="commerce-muted">Shipping and any applicable taxes are not included.</p>
        <p role="status"><strong>Stripe test mode only.</strong> Use a Stripe test card. No real purchase, delivery, or seller payout. Taxes and shipping are not charged in this test flow.</p>
        <button className="commerce-primary" disabled={!!busy || unavailable} onClick={pay}>{busy === 'checkout' ? 'Opening Stripe…' : 'Continue to test checkout'}</button>

      </aside>
    </div>}
  </div></main>;
}
